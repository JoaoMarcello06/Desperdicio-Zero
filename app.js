// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC8B3XunC9USG4zUK6R30jaCZbaB4VPrDI",
  authDomain: "desperdiciozero-9da8e.firebaseapp.com",
  projectId: "desperdiciozero-9da8e",
  storageBucket: "desperdiciozero-9da8e.firebasestorage.app",
  messagingSenderId: "671256144069",
  appId: "1:671256144069:web:8546141f903dfaee5968ac",
  measurementId: "G-4G5V639EEQ"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// =============================================================
// FUNÇÕES UTILITÁRIAS (DATA, NOTIFICAÇÃO E RECEITAS)
// =============================================================

// Converter e formatar data para DD/MM/AAAA
function formatarDataBR(dataString) {
    if (!dataString) return 'Data não informada';
    
    // Se estiver no formato YYYY-MM-DD (Padrão de inputs date)
    if (dataString.includes('-')) {
        const partes = dataString.split('-');
        if (partes.length === 3) {
            return `${partes[2].padStart(2, '0')}/${partes[1].padStart(2, '0')}/${partes[0]}`;
        }
    }
    return dataString;
}

// Pedir permissão de notificações no navegador
function solicitarPermissaoNotificacao() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
}

// Verificar alimentos e enviar notificações de 5, 3 e 1 dia antes
function checarVencimentos(produtos) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    produtos.forEach(item => {
        if (!item.validade) return;

        let dataValidade = null;

        // Trata DD/MM/AAAA
        if (item.validade.includes('/')) {
            const [dia, mes, ano] = item.validade.split('/');
            dataValidade = new Date(ano, mes - 1, dia);
        } 
        // Trata YYYY-MM-DD
        else if (item.validade.includes('-')) {
            const [ano, mes, dia] = item.validade.split('-');
            dataValidade = new Date(ano, mes - 1, dia);
        }

        if (dataValidade) {
            dataValidade.setHours(0, 0, 0, 0);
            const diferencaTempo = dataValidade.getTime() - hoje.getTime();
            const diasRestantes = Math.ceil(diferencaTempo / (1000 * 3600 * 24));

            if (diasRestantes === 5 || diasRestantes === 3 || diasRestantes === 1) {
                new Notification("⚠️ Alerta de Vencimento!", {
                    body: `O alimento "${item.nome}" vence em ${diasRestantes} dia(s) (${formatarDataBR(item.validade)})!`,
                    icon: item.fotoBase64 || ""
                });
            }
        }
    });
}

// Abrir busca de receitas para o alimento
window.buscarReceitas = function(nomeAlimento) {
    const query = encodeURIComponent(`receitas com ${nomeAlimento}`);
    window.open(`https://www.tudogostoso.com.br/busca?q=${query}`, '_blank');
};

// =============================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    solicitarPermissaoNotificacao();

    const authSection = document.getElementById('authSection');
    const appSection = document.getElementById('appSection');
    const authForm = document.getElementById('authForm');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');
    const authTitle = document.getElementById('authTitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const toggleAuthMode = document.getElementById('toggleAuthMode');
    const toggleText = document.getElementById('toggleText');
    const userHeader = document.getElementById('userHeader');
    const userEmail = document.getElementById('userEmail');
    const logoutBtn = document.getElementById('logoutBtn');

    const tabScanner = document.getElementById('tabScanner');
    const tabInventory = document.getElementById('tabInventory');
    const viewScanner = document.getElementById('viewScanner');
    const viewInventory = document.getElementById('viewInventory');
    const inventoryList = document.getElementById('inventoryList');

    const startCameraBtn = document.getElementById('startCameraBtn');
    const stopCameraBtn = document.getElementById('stopCameraBtn');
    const cameraStartBox = document.getElementById('cameraStartBox');
    const cameraActiveBox = document.getElementById('cameraActiveBox');
    const cameraVideo = document.getElementById('cameraVideo');
    const cameraCanvas = document.getElementById('cameraCanvas');
    const captureBtn = document.getElementById('captureBtn');

    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const retakeBtn = document.getElementById('retakeBtn');
    const productForm = document.getElementById('productForm');

    let isLoginMode = true;
    let videoStream = null;
    let capturedBase64Image = ""; 
    let unsubscribeInventory = null;

    function validarForm() {
        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authEmail.value.trim());
        const senhaValida = authPassword.value.length >= 6;
        authSubmitBtn.disabled = !(emailValido && senhaValida);
    }

    if (authEmail && authPassword) {
        authEmail.addEventListener('input', validarForm);
        authPassword.addEventListener('input', validarForm);
    }

    if (toggleAuthMode) {
        toggleAuthMode.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            authTitle.innerText = isLoginMode ? "Acesse sua Conta" : "Criar Nova Conta";
            authSubmitBtn.innerText = isLoginMode ? "Entrar" : "Cadastrar";
            toggleText.innerText = isLoginMode ? "Não tem uma conta?" : "Já tem uma conta?";
            toggleAuthMode.innerText = isLoginMode ? "Cadastre-se aqui" : "Entre aqui";
            validarForm();
        });
    }

    // AUTENTICAÇÃO DIRETA (SEM CÓDIGO DE VERIFICAÇÃO)
    if (authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = authEmail.value.trim();
            const password = authPassword.value;

            authSubmitBtn.disabled = true;
            authSubmitBtn.innerText = "Aguarde...";

            if (isLoginMode) {
                auth.signInWithEmailAndPassword(email, password)
                    .catch((err) => {
                        alert("❌ E-mail ou senha incorretos.");
                        authSubmitBtn.innerText = "Entrar";
                        validarForm();
                    });
            } else {
                auth.createUserWithEmailAndPassword(email, password)
                    .then(() => {
                        alert("🎉 Conta criada com sucesso!");
                        authSubmitBtn.innerText = "Cadastrar";
                    })
                    .catch((err) => {
                        alert("❌ Erro ao cadastrar: " + err.message);
                        authSubmitBtn.innerText = "Cadastrar";
                        validarForm();
                    });
            }
        });
    }

    // MONITOR DE LOGIN DO USUÁRIO
    auth.onAuthStateChanged((user) => {
        if (user) {
            authSection.classList.add('hidden');
            appSection.classList.remove('hidden');
            if (userHeader) userHeader.classList.remove('hidden');
            if (userEmail) userEmail.innerText = user.email;
            carregarEstoque(user.uid);
        } else {
            authSection.classList.remove('hidden');
            appSection.classList.add('hidden');
            if (userHeader) userHeader.classList.add('hidden');
            if (unsubscribeInventory) unsubscribeInventory();
            stopCamera();
        }
    });

    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });

    // CARREGAR ESTOQUE DO FIRESTORE E VERIFICAR VENCIMENTOS
    function carregarEstoque(userId) {
        if (!inventoryList) return;

        unsubscribeInventory = db.collection('produtos')
            .where('userId', '==', userId)
            .onSnapshot((snapshot) => {
                inventoryList.innerHTML = '';
                const listaProdutos = [];

                if (snapshot.empty) {
                    inventoryList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Nenhum alimento no estoque.</p>';
                    return;
                }

                snapshot.forEach((doc) => {
                    const item = doc.data();
                    listaProdutos.push(item);

                    const dataFormatada = formatarDataBR(item.validade);
                    const card = document.createElement('div');
                    card.className = 'inventory-card';

                    const imgHTML = item.fotoBase64 
                        ? `<img src="${item.fotoBase64}" alt="${item.nome}">`
                        : `<div style="height:100px; background:#e2e8f0; border-radius:8px; display:flex; align-items:center; justify-content:center;">📦 Sem Foto</div>`;

                    card.innerHTML = `
                        ${imgHTML}
                        <h4>${item.nome}</h4>
                        <p>${item.descricao || 'Sem observações'}</p>
                        <span class="badge-date">📅 Validade: ${dataFormatada}</span>
                        <div style="display: flex; gap: 8px; margin-top: 10px;">
                            <button type="button" class="btn-recipe" style="background:#059669; color:#fff; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; flex:1;" onclick="buscarReceitas('${item.nome}')">💡 Receitas</button>
                            <button type="button" class="btn-delete" style="background:#dc2626; color:#fff; border:none; padding:6px 10px; border-radius:6px; cursor:pointer;" onclick="deletarItem('${doc.id}')">Excluir</button>
                        </div>
                    `;
                    inventoryList.appendChild(card);
                });

                // Executa verificação de alertas de 5, 3 e 1 dia
                checarVencimentos(listaProdutos);

            }, (err) => {
                console.error("Erro no estoque:", err);
            });
    }

    window.deletarItem = function(id) {
        if (confirm("Remover este item do estoque?")) {
            db.collection('produtos').doc(id).delete();
        }
    };

    // CONTROLE DA CÂMERA E OCR DE DATA (DD/MM/AAAA)
    if (startCameraBtn) {
        startCameraBtn.addEventListener('click', async () => {
            try {
                videoStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" }
                });
                cameraVideo.srcObject = videoStream;
                cameraStartBox.classList.add('hidden');
                cameraActiveBox.classList.remove('hidden');
                imagePreviewContainer.classList.add('hidden');
                productForm.classList.add('hidden');
            } catch (err) {
                alert("Não foi possível acessar a câmera.");
            }
        });
    }

    function stopCamera() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
        }
        if (cameraActiveBox) cameraActiveBox.classList.add('hidden');
        if (cameraStartBox) cameraStartBox.classList.remove('hidden');
    }

    if (stopCameraBtn) stopCameraBtn.addEventListener('click', stopCamera);

    if (captureBtn) {
        captureBtn.addEventListener('click', () => {
            const ctx = cameraCanvas.getContext('2d');
            
            cameraCanvas.width = 450;
            cameraCanvas.height = 320;

            ctx.filter = 'grayscale(100%) contrast(180%)';
            ctx.drawImage(cameraVideo, 0, 0, 450, 320);

            capturedBase64Image = cameraCanvas.toDataURL('image/jpeg', 0.5);
            imagePreview.src = capturedBase64Image;

            stopCamera();
            cameraStartBox.classList.add('hidden');
            imagePreviewContainer.classList.remove('hidden');
            document.getElementById('loading').classList.remove('hidden');

            Tesseract.recognize(capturedBase64Image, 'por', {
                tessedit_char_whitelist: '0123456789/-.'
            }).then(({ data: { text } }) => {
                document.getElementById('loading').classList.add('hidden');
                productForm.classList.remove('hidden');

                // Procura padrões de data DD/MM/AAAA ou DD/MM/YY
                const dateMatch = text.match(/\d{2}[\/\-]\d{2}[\/\-]\d{2,4}/);
                if (dateMatch) {
                    const expiryInput = document.getElementById('expiryDate');
                    const partes = dateMatch[0].replace(/-/g, '/').split('/');
                    
                    if (partes.length === 3) {
                        let ano = partes[2];
                        if (ano.length === 2) ano = "20" + ano;
                        
                        // Define o valor formatado
                        expiryInput.value = `${ano}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
                        alert(`⚡ Data identificada: ${partes[0]}/${partes[1]}/${ano}`);
                    }
                }
            }).catch(() => {
                document.getElementById('loading').classList.add('hidden');
                productForm.classList.remove('hidden');
            });
        });
    }

    if (retakeBtn) {
        retakeBtn.addEventListener('click', () => {
            imagePreviewContainer.classList.add('hidden');
            productForm.classList.add('hidden');
            startCameraBtn.click();
        });
    }

    // SALVAR ITEM NO FIRESTORE COM FORMATO DD/MM/AAAA
    if (productForm) {
        productForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const saveBtn = document.getElementById('saveProductBtn');
            saveBtn.innerText = "⏳ Salvando...";
            saveBtn.disabled = true;

            const user = auth.currentUser;
            const currentUserId = user ? user.uid : "anonimo";
            const rawValidade = document.getElementById('expiryDate').value;

            db.collection('produtos').add({
                nome: document.getElementById('productName').value,
                descricao: document.getElementById('productDescription').value,
                validade: formatarDataBR(rawValidade), // Salva no formato DD/MM/AAAA
                fotoBase64: capturedBase64Image,
                userId: currentUserId,
                dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                alert("🎉 Alimento salvo com sucesso no estoque!");
                productForm.reset();
                capturedBase64Image = "";
                saveBtn.innerText = "Salvar no Estoque";
                saveBtn.disabled = false;
                
                tabInventory.click();
            }).catch((err) => {
                alert("❌ Erro ao salvar: " + err.message);
                saveBtn.innerText = "Salvar no Estoque";
                saveBtn.disabled = false;
            });
        });
    }

    // ABAS DA INTERFACE
    if (tabScanner && tabInventory) {
        tabScanner.addEventListener('click', () => {
            tabScanner.classList.add('active');
            tabInventory.classList.remove('active');
            viewScanner.classList.add('active-tab');
            viewScanner.classList.remove('hidden');
            viewInventory.classList.remove('active-tab');
            viewInventory.classList.add('hidden');
        });

        tabInventory.addEventListener('click', () => {
            tabInventory.classList.add('active');
            tabScanner.classList.remove('active');
            viewInventory.classList.add('active-tab');
            viewInventory.classList.remove('hidden');
            viewScanner.classList.remove('active-tab');
            viewScanner.classList.add('hidden');
            stopCamera();
        });
    }
});
