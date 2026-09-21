// =============================================================
// CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE (PROTEGIDO CONTRA ERROS)
// =============================================================
if (typeof firebaseConfig === 'undefined') {
    var firebaseConfig = {
        apiKey: "AIzaSyC8B3XunC9USG4zUK6R30jaCZbaB4VPrDI",
        authDomain: "desperdiciozero-9da8e.firebaseapp.com",
        projectId: "desperdiciozero-9da8e",
        storageBucket: "desperdiciozero-9da8e.firebasestorage.app",
        messagingSenderId: "671256144069",
        appId: "1:671256144069:web:8546141f903dfaee5968ac",
        measurementId: "G-4G5V639EEQ"
    };
}

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

/* =============================================================
   1. REGISTO DO SERVICE WORKER COM AUTO-UPDATE (PWA)
   ============================================================= */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log('Service Worker registado com sucesso:', reg.scope);

                // Deteta se existe uma nova versão disponível
                reg.onupdatefound = () => {
                    const installingWorker = reg.installing;
                    if (installingWorker) {
                        installingWorker.onstatechange = () => {
                            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('Nova versão encontrada! A recarregar...');
                                window.location.reload();
                            }
                        };
                    }
                };
            })
            .catch(err => console.error('Falha ao registar o Service Worker:', err));
    });

    // Recarrega a página assim que o novo Service Worker assumir o controlo
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });
}
/* =============================================================
   2. FUNÇÕES AUXILIARES DE DATAS E STATUS
   ============================================================= */

// Formata a data ISO (AAAA-MM-DD) para o formato brasileiro/português (DD/MM/AAAA)
function formatarDataBR(dataIso) {
    if (!dataIso) return '';
    const partes = dataIso.split('-');
    if (partes.length !== 3) return dataIso;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// Calcula quantos dias faltam para a data de validade vencer
function calcularDiasRestantes(dataValidadeIso) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const partes = dataValidadeIso.split('-');
    const dataValidade = new Date(partes[0], partes[1] - 1, partes[2]);
    dataValidade.setHours(0, 0, 0, 0);

    const diferencaMs = dataValidade.getTime() - hoje.getTime();
    return Math.ceil(diferencaMs / (1000 * 60 * 60 * 24));
}

// Retorna a classe CSS e o texto explicativo conforme os dias restantes
function obterStatusValidade(dias) {
    if (dias < 0) {
        return { classe: 'status-vermelho', texto: `Vencido há ${Math.abs(dias)} dia(s)` };
    } else if (dias <= 3) {
        return { classe: 'status-vermelho', texto: `Vence em ${dias} dia(s) (Crítico)` };
    } else if (dias <= 7) {
        return { classe: 'status-amarelo', texto: `Vence em ${dias} dia(s) (Atenção)` };
    } else {
        return { classe: 'status-verde', texto: `Vence em ${dias} dia(s) (Ok)` };
    }
}

// Ordena o stock para que os alimentos mais próximos do vencimento fiquem no topo
function ordenarEstoquePorValidade(lista) {
    return lista.sort((a, b) => {
        const dataA = new Date(a.validade);
        const dataB = new Date(b.validade);
        return dataA - dataB;
    });
}

/* =============================================================
   3. ESTADO GLOBAL DA APLICAÇÃO
   ============================================================= */
let estoque = JSON.parse(localStorage.getItem('desperdicioZero_estoque')) || [];
let usuarioLogado = JSON.parse(localStorage.getItem('desperdicioZero_usuario')) || null;
let fotoCapturadaBase64 = null;
let streamCamera = null;

/* =============================================================
   4. INICIALIZAÇÃO E MAPEAMENTO DOS ELEMENTOS DO DOM
   ============================================================= */
document.addEventListener('DOMContentLoaded', () => {

    // Ecrãs Principais
    const screenAuth = document.getElementById('screen-auth');
    const screenApp = document.getElementById('screen-app');

    // Elementos de Autenticação / Perfil
    const userProfileBox = document.getElementById('userProfileBox');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const btnLogout = document.getElementById('btnLogout');
    const formAuth = document.getElementById('formAuth');
    const authEmail = document.getElementById('authEmail');
    const authSenha = document.getElementById('authSenha');
    const btnLoginSubmit = document.getElementById('btnLoginSubmit');
    const btnRegisterSubmit = document.getElementById('btnRegisterSubmit');

    // Navegação por Abas
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Módulo da Câmara e Formulário de Cadastro
    const btnAbrirCamera = document.getElementById('btnAbrirCamera');
    const btnCapturarFoto = document.getElementById('btnCapturarFoto');
    const btnFecharCamera = document.getElementById('btnFecharCamera');
    const btnNovaFoto = document.getElementById('btnNovaFoto');
    const cameraActiveBox = document.getElementById('cameraActiveBox');
    const videoFeed = document.getElementById('videoFeed');
    const canvasHidden = document.getElementById('canvasHidden');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const formAlimento = document.getElementById('formAlimento');
    const nomeAlimento = document.getElementById('nomeAlimento');
    const obsAlimento = document.getElementById('obsAlimento');
    const validadeAlimento = document.getElementById('validadeAlimento');

    // Módulo de Stock e Receitas
    const inventoryGrid = document.getElementById('inventoryGrid');
    const btnBuscarReceitas = document.getElementById('btnBuscarReceitas');

    // Módulo de Doação
    const btnMapaGeral = document.getElementById('btnMapaGeral');
    const btnsDoarLink = document.querySelectorAll('.btn-doar-link');
    const btnsDoarBusca = document.querySelectorAll('.btn-doar-busca');

    /* =============================================================
       5. LÓGICA DE AUTENTICAÇÃO (LOGIN / REGISTO / LOGOUT)
       ============================================================= */
    function verificarSessao() {
        if (usuarioLogado) {
            if (screenAuth) screenAuth.classList.add('hidden');
            if (screenApp) screenApp.classList.remove('hidden');
            if (userProfileBox) userProfileBox.classList.remove('hidden');

            if (userName) userName.textContent = usuarioLogado.nome || 'Utilizador';
            if (userEmail) userEmail.textContent = usuarioLogado.email || '';
            if (userAvatar) userAvatar.textContent = (usuarioLogado.nome || 'U').charAt(0).toUpperCase();
        } else {
            if (screenAuth) screenAuth.classList.remove('hidden');
            if (screenApp) screenApp.classList.add('hidden');
            if (userProfileBox) userProfileBox.classList.add('hidden');
        }
    }

    if (formAuth) {
        formAuth.addEventListener('submit', (e) => {
            e.preventDefault();
            fazerLogin();
        });
    }

    if (btnRegisterSubmit) {
        btnRegisterSubmit.addEventListener('click', () => {
            fazerLogin();
        });
    }

    function fazerLogin() {
        const emailVal = authEmail ? authEmail.value.trim() : '';
        if (!emailVal) return;

        const nomeExtraido = emailVal.split('@')[0];
        usuarioLogado = {
            nome: nomeExtraido.charAt(0).toUpperCase() + nomeExtraido.slice(1),
            email: emailVal
        };

        localStorage.setItem('desperdicioZero_usuario', JSON.stringify(usuarioLogado));
        verificarSessao();
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            usuarioLogado = null;
            localStorage.removeItem('desperdicioZero_usuario');
            verificarSessao();
        });
    }

    /* =============================================================
       6. NAVEGAÇÃO ENTRE ABAS
       ============================================================= */
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.add('hidden'));

            btn.classList.add('active');
            const activeSection = document.getElementById(`aba-${targetTab}`);
            if (activeSection) activeSection.classList.remove('hidden');
        });
    });

    /* =============================================================
       7. CONTROLO DA CÂMARA EM ALTA RESOLUÇÃO
       ============================================================= */
    if (btnAbrirCamera) {
        btnAbrirCamera.addEventListener('click', async () => {
            try {
                streamCamera = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
                });
                videoFeed.srcObject = streamCamera;
                btnAbrirCamera.classList.add('hidden');
                cameraActiveBox.classList.remove('hidden');
            } catch (err) {
                alert('Não foi possível abrir a câmara: ' + err.message);
            }
        });
    }

    if (btnCapturarFoto) {
        btnCapturarFoto.addEventListener('click', () => {
            canvasHidden.width = 1280;
            canvasHidden.height = 720;
            const ctx = canvasHidden.getContext('2d');
            ctx.drawImage(videoFeed, 0, 0, canvasHidden.width, canvasHidden.height);

            fotoCapturadaBase64 = canvasHidden.toDataURL('image/jpeg', 0.85);
            imagePreview.src = fotoCapturadaBase64;

            encerrarCamera();
            cameraActiveBox.classList.add('hidden');
            imagePreviewContainer.classList.remove('hidden');
        });
    }

    if (btnFecharCamera) {
        btnFecharCamera.addEventListener('click', () => {
            encerrarCamera();
            cameraActiveBox.classList.add('hidden');
            btnAbrirCamera.classList.remove('hidden');
        });
    }

    if (btnNovaFoto) {
        btnNovaFoto.addEventListener('click', () => {
            fotoCapturadaBase64 = null;
            imagePreviewContainer.classList.add('hidden');
            if (btnAbrirCamera) btnAbrirCamera.click();
        });
    }

    function encerrarCamera() {
        if (streamCamera) {
            streamCamera.getTracks().forEach(track => track.stop());
            streamCamera = null;
        }
    }

    /* =============================================================
       8. ADICIONAR E RENDERIZAR ESTOQUE
       ============================================================= */
    if (formAlimento) {
        formAlimento.addEventListener('submit', (e) => {
            e.preventDefault();

            const nome = nomeAlimento.value.trim();
            const obs = obsAlimento.value.trim();
            const validade = validadeAlimento.value;

            if (!nome || !validade) return;

            const novoItem = {
                id: Date.now(),
                nome: nome,
                observacao: obs,
                validade: validade,
                imagem: fotoCapturadaBase64
            };

            estoque.push(novoItem);
            salvarERenderizar();

            formAlimento.reset();
            fotoCapturadaBase64 = null;
            if (imagePreviewContainer) imagePreviewContainer.classList.add('hidden');
            if (btnAbrirCamera) btnAbrirCamera.classList.remove('hidden');

            const tabEstoque = document.querySelector('[data-tab="estoque"]');
            if (tabEstoque) tabEstoque.click();
        });
    }

    function renderizarEstoque() {
        if (!inventoryGrid) return;
        inventoryGrid.innerHTML = '';

        if (estoque.length === 0) {
            inventoryGrid.innerHTML = `<p class="subtitle" style="grid-column: 1/-1; text-align: center; padding: 20px;">O seu stock está vazio. Adicione alimentos na aba "Escanear Alimento".</p>`;
            return;
        }

        // Ordena para exibir produtos perto de vencer primeiro
        const estoqueOrdenado = ordenarEstoquePorValidade([...estoque]);

        estoqueOrdenado.forEach(item => {
            const dias = calcularDiasRestantes(item.validade);
            const statusInfo = obterStatusValidade(dias);
            const dataFormatada = formatarDataBR(item.validade);

            const card = document.createElement('div');
            card.className = `inventory-card ${statusInfo.classe}`;
            card.innerHTML = `
                <div class="inventory-card-header">
                    <input type="checkbox" class="item-checkbox" value="${escapeHtml(item.nome)}">
                    <button type="button" class="btn-delete" data-id="${item.id}">Excluir</button>
                </div>
                ${item.imagem 
                    ? `<img src="${item.imagem}" alt="${escapeHtml(item.nome)}">` 
                    : `<div class="no-image-placeholder">Sem Imagem</div>`
                }
                <h4 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 4px;">${escapeHtml(item.nome)}</h4>
                <p style="font-size: 0.85rem; opacity: 0.9;">${item.observacao ? escapeHtml(item.observacao) : 'Sem observações'}</p>
                <span class="badge-validade">${statusInfo.texto} (${dataFormatada})</span>
            `;

            // Botão de exclusão
            const btnExcluir = card.querySelector('.btn-delete');
            btnExcluir.addEventListener('click', () => {
                excluirItem(item.id);
            });

            inventoryGrid.appendChild(card);
        });
    }

    window.excluirItem = function(id) {
        estoque = estoque.filter(item => item.id !== id);
        salvarERenderizar();
    };

    function salvarERenderizar() {
        localStorage.setItem('desperdicioZero_estoque', JSON.stringify(estoque));
        renderizarEstoque();
    }

    /* =============================================================
       9. RECEITAS E DOAÇÕES
       ============================================================= */
    if (btnBuscarReceitas) {
        btnBuscarReceitas.addEventListener('click', () => {
            const selecionados = Array.from(document.querySelectorAll('.item-checkbox:checked'))
                .map(cb => cb.value);

            if (selecionados.length === 0) {
                alert('Selecione pelo menos um alimento da lista para pesquisar receitas.');
                return;
            }

            const termo = encodeURIComponent('receitas com ' + selecionados.join(' '));
            window.open(`https://www.google.com/search?q=${termo}`, '_blank');
        });
    }

    if (btnMapaGeral) {
        btnMapaGeral.addEventListener('click', () => {
            window.open('https://www.google.com/maps/search/banco+de+alimentos+proximo', '_blank');
        });
    }

    btnsDoarLink.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const url = e.target.getAttribute('data-url');
            if (url) window.open(url, '_blank');
        });
    });

    btnsDoarBusca.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const query = e.target.getAttribute('data-query');
            if (query) {
                window.open(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, '_blank');
            }
        });
    });

    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    }

    // Inicializa a sessão e carrega a lista ao abrir a app
    verificarSessao();
    renderizarEstoque();
});
