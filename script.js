/* =============================================================
   GESTÃO DE ESTADO E INICIALIZAÇÃO
   ============================================================= */
let estoque = JSON.parse(localStorage.getItem('desperdicioZero_estoque')) || [];
let fotoCapturadaBase64 = null;
let streamCamera = null;

document.addEventListener('DOMContentLoaded', () => {
    initNavegacaoAbas();
    initCamara();
    initFormulario();
    initModuloDoacao();
    renderEstoque();
    registerServiceWorker();
});

/* =============================================================
   1. NAVEGAÇÃO ENTRE ABAS
   ============================================================= */
function initNavegacaoAbas() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabTarget = btn.getAttribute('data-tab');

            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.add('hidden'));

            btn.classList.add('active');
            document.getElementById(`aba-${tabTarget}`).classList.remove('hidden');
        });
    });
}

/* =============================================================
   2. CÂMARA EM ALTA RESOLUÇÃO
   ============================================================= */
function initCamara() {
    const btnAbrir = document.getElementById('btnAbrirCamera');
    const btnCapturar = document.getElementById('btnCapturarFoto');
    const btnFechar = document.getElementById('btnFecharCamera');
    const btnNova = document.getElementById('btnNovaFoto');
    
    const cameraBox = document.getElementById('cameraActiveBox');
    const video = document.getElementById('videoFeed');
    const canvas = document.getElementById('canvasHidden');
    const previewBox = document.getElementById('imagePreviewContainer');
    const previewImg = document.getElementById('imagePreview');

    btnAbrir.addEventListener('click', async () => {
        try {
            streamCamera = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            video.srcObject = streamCamera;
            btnAbrir.classList.add('hidden');
            cameraBox.classList.remove('hidden');
        } catch (err) {
            alert('Não foi possível aceder à câmara: ' + err.message);
        }
    });

    btnCapturar.addEventListener('click', () => {
        // Resolução HD no canvas para manter excelente qualidade de imagem
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        fotoCapturadaBase64 = canvas.toDataURL('image/jpeg', 0.85);
        previewImg.src = fotoCapturadaBase64;

        pararCamera();
        cameraBox.classList.add('hidden');
        previewBox.classList.remove('hidden');
    });

    btnFechar.addEventListener('click', () => {
        pararCamera();
        cameraBox.classList.add('hidden');
        btnAbrir.classList.remove('hidden');
    });

    btnNova.addEventListener('click', () => {
        fotoCapturadaBase64 = null;
        previewBox.classList.add('hidden');
        btnAbrir.click();
    });

    function pararCamera() {
        if (streamCamera) {
            streamCamera.getTracks().forEach(track => track.stop());
            streamCamera = null;
        }
    }
}

/* =============================================================
   3. ADICIONAR ITEM AO ESTOQUE
   ============================================================= */
function initFormulario() {
    const form = document.getElementById('formAlimento');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const nome = document.getElementById('nomeAlimento').value.trim();
        const obs = document.getElementById('obsAlimento').value.trim();
        const validade = document.getElementById('validadeAlimento').value;

        if (!nome || !validade) return;

        const novoItem = {
            id: Date.now(),
            nome: nome,
            observacao: obs,
            validade: validade,
            imagem: fotoCapturadaBase64
        };

        estoque.push(novoItem);
        salvarEAtualizar();

        // Reset do Formulário
        form.reset();
        fotoCapturadaBase64 = null;
        document.getElementById('imagePreviewContainer').classList.add('hidden');
        document.getElementById('btnAbrirCamera').classList.remove('hidden');

        // Alterna automaticamente para a aba "Seu Estoque"
        document.querySelector('[data-tab="estoque"]').click();
    });
}

/* =============================================================
   4. RENDERIZAÇÃO DOS CARTÕES DO ESTOQUE
   ============================================================= */
function renderEstoque() {
    const grid = document.getElementById('inventoryGrid');
    grid.innerHTML = '';

    if (estoque.length === 0) {
        grid.innerHTML = `<p class="subtitle" style="grid-column: 1/-1; text-align: center; padding: 20px;">Seu estoque está vazio.</p>`;
        return;
    }

    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    estoque.forEach(item => {
        const dataValidade = new Date(item.validade + 'T00:00:00');
        const diffDias = Math.ceil((dataValidade - hoje) / (1000 * 60 * 60 * 24));

        let statusClass = 'status-verde';
        if (diffDias < 0) {
            statusClass = 'status-vermelho';
        } else if (diffDias <= 3) {
            statusClass = 'status-vermelho';
        } else if (diffDias <= 7) {
            statusClass = 'status-amarelo';
        }

        const dataFormatada = dataValidade.toLocaleDateString('pt-BR');

        const card = document.createElement('div');
        card.className = `inventory-card ${statusClass}`;
        card.innerHTML = `
            <div class="inventory-card-header">
                <input type="checkbox" class="item-checkbox" value="${item.nome}">
                <button class="btn-delete" onclick="excluirItem(${item.id})">Excluir</button>
            </div>
            ${item.imagem 
                ? `<img src="${item.imagem}" alt="${item.nome}">` 
                : `<div class="no-image-placeholder">Sem Imagem</div>`
            }
            <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 4px;">${escapeHtml(item.nome)}</h4>
            <p style="font-size: 0.85rem; opacity: 0.9;">${item.observacao ? escapeHtml(item.observacao) : 'Sem observações'}</p>
            <span class="badge-validade">Validade: ${dataFormatada}</span>
        `;

        grid.appendChild(card);
    });
}

function excluirItem(id) {
    estoque = estoque.filter(item => item.id !== id);
    salvarEAtualizar();
}

function salvarEAtualizar() {
    localStorage.setItem('desperdicioZero_estoque', JSON.stringify(estoque));
    renderEstoque();
}

/* =============================================================
   5. MÓDULO DE DOAÇÕES (MAPAS E LINKS EXTERNOS)
   ============================================================= */
function initModuloDoacao() {
    document.getElementById('btnMapaGeral').addEventListener('click', () => {
        window.open('https://www.google.com/maps/search/banco+de+alimentos+proximo', '_blank');
    });

    document.querySelectorAll('.btn-doar-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const url = e.target.getAttribute('data-url');
            if (url) window.open(url, '_blank');
        });
    });

    document.querySelectorAll('.btn-doar-busca').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const query = e.target.getAttribute('data-query');
            if (query) {
                window.open(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, '_blank');
            }
        });
    });

    document.getElementById('btnBuscarReceitas').addEventListener('click', () => {
        const selecionados = Array.from(document.querySelectorAll('.item-checkbox:checked'))
            .map(cb => cb.value);

        if (selecionados.length === 0) {
            alert('Selecione pelo menos um alimento da lista para buscar receitas.');
            return;
        }

        const termoBusca = encodeURIComponent('receita com ' + selecionados.join(' '));
        window.open(`https://www.google.com/search?q=${termoBusca}`, '_blank');
    });
}

/* Helper para segurança */
function escapeHtml(text) {
    return text.replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}

/* =============================================================
   6. REGISTAR SERVICE WORKER DO PWA
   ============================================================= */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker ativo:', reg.scope))
            .catch(err => console.error('Erro no SW:', err));
    }
}
