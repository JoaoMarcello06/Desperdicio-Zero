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

function formatarDataBR(dataString) {
    if (!dataString) return 'Data não informada';
    if (dataString.includes('-')) {
        const partes = dataString.split('-');
        if (partes.length === 3) {
            return `${partes[2].padStart(2, '0')}/${partes[1].padStart(2, '0')}/${partes[0]}`;
        }
    }
    return dataString;
}

function solicitarPermissaoNotificacao() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
}

function checarVencimentos(produtos) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    produtos.forEach(item => {
        if (!item.validade) return;
        let dataValidade = null;

        if (item.validade.includes('/')) {
            const [dia, mes, ano] = item.validade.split('/');
            dataValidade = new Date(ano, mes - 1, dia);
        } else if (item.validade.includes('-')) {
            const [ano, mes, dia] = item.validade.split('-');
            dataValidade = new Date(ano, mes - 1, dia);
        }

        if (dataValidade) {
            dataValidade.setHours(0, 0, 0, 0);
            const diferencaTempo = dataValidade.getTime() - hoje.getTime();
            const diasRestantes = Math.ceil(diferencaTempo / (1000 * 3600 * 24));

            if (diasRestantes === 5 || diasRestantes === 3 || diasRestantes === 1) {
                new Notification("Alerta de Vencimento", {
                    body: `O alimento "${item.nome}" vence em ${diasRestantes} dia(s) (${formatarDataBR(item.validade)})`,
                    icon: item.fotoBase64 || ""
                });
            }
        }
    });
}

window.buscarDoacaoMapa = function(termo = "banco de alimentos doacao") {
    const query = encodeURIComponent(termo);
    window.open(`https://www.google.com/maps/search/${query}`, '_blank');
};

document.addEventListener('DOMContentLoaded', () => {
    solicitarPermissaoNotificacao();

    const authSection = document.getElementById('authSection');
    const appSection = document.getElementById('appSection');
    const authForm = document.getElementById('authForm');
    const authName = document.getElementById('authName');
    const nameFieldGroup = document.getElementById('nameFieldGroup');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');
    const authTitle = document.getElementById('authTitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const toggleAuthMode = document.getElementById('toggleAuthMode');
    const toggleText = document.getElementById('toggleText');
    const userHeader = document.getElementById('userHeader');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userEmail = document.getElementById('userEmail');
    const userAvatar = document.getElementById('userAvatar');
    const logoutBtn = document.getElementById('logoutBtn');

    const tabScanner = document.getElementById('tabScanner');
    const tabInventory = document.getElementById('tabInventory');
    const tabDonation = document.getElementById('tabDonation');
    const viewScanner = document.getElementById('viewScanner');
    const viewInventory = document.getElementById('viewInventory');
    const viewDonation = document.getElementById('viewDonation');
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
    const loadingMessage = document.getElementById('loading');

    let isLoginMode = true;
    let videoStream = null;
    let capturedBase64Image = ""; 
    let unsubscribeInventory = null;

    function validarForm() {
        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authEmail.value.trim());
        const senhaValida = authPassword.value.length >= 6;
        const nomeValido = isLoginMode || authName.value.trim().length > 0;
        authSubmitBtn.disabled = !(emailValido && senhaValida && nomeValido);
    }

    if (authEmail && authPassword && authName) {
        authEmail.addEventListener('input', validarForm);
        authPassword.addEventListener('input', validarForm);
        authName.addEventListener('input', validarForm);
    }

    if (toggleAuthMode) {
        toggleAuthMode.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            authTitle.innerText = isLoginMode ? "Acesse sua Conta" : "Criar Nova Conta";
            authSubmitBtn.innerText = isLoginMode ? "Entrar" : "Cadastrar";
            toggleText.innerText = isLoginMode ? "Não tem uma conta?" : "Já tem uma conta?";
            toggleAuthMode.innerText = isLoginMode ? "Cadastre-se aqui" : "Entre aqui";
            
            if (isLoginMode) {
                nameFieldGroup.classList.add('hidden');
            } else {
                nameFieldGroup.classList.remove('hidden');
            }
            validarForm();
        });
    }

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
                        alert("Erro de autenticação: " + err.message);
                        authSubmitBtn.innerText = "Entrar";
                        validarForm();
                    });
            } else {
                const nomeDigitado = authName.value.trim();
                auth.createUserWithEmailAndPassword(email, password)
                    .then((userCredential) => {
                        return userCredential.user.updateProfile({
                            displayName: nomeDigitado
                        });
                    })
                    .then(() => {
                        authSubmitBtn.innerText = "Cadastrar";
                    })
                    .catch((err) => {
                        alert("Erro ao cadastrar: " + err.message);
                        authSubmitBtn.innerText = "Cadastrar";
                        validarForm();
                    });
            }
        });
    }

    auth.onAuthStateChanged((user) => {
        if (user) {
            authSection.classList.add('hidden');
            appSection.classList.remove('hidden');
            if (userHeader) userHeader.classList.remove('hidden');
            
            const nomeExibicao = user.displayName || user.email.split('@')[0];
            const inicial = nomeExibicao.charAt(0).toUpperCase();

            if (userNameDisplay) userNameDisplay.innerText = nomeExibicao;
            if (userEmail) userEmail.innerText = user.email;
            if (userAvatar) userAvatar.innerText = inicial;

            if (productForm) productForm.classList.remove('hidden'); 
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

    function esconderTodasAbas() {
        if (viewScanner) viewScanner.classList.add('hidden');
        if (viewInventory) viewInventory.classList.add('hidden');
        if (viewDonation) viewDonation.classList.add('hidden');

        if (tabScanner) tabScanner.classList.remove('active');
        if (tabInventory) tabInventory.classList.remove('active');
        if (tabDonation) tabDonation.classList.remove('active');
    }

    if (tabScanner) {
        tabScanner.addEventListener('click', () => {
            esconderTodasAbas();
            tabScanner.classList.add('active');
            viewScanner.classList.remove('hidden');
        });
    }

    if (tabInventory) {
        tabInventory.addEventListener('click', () => {
            esconderTodasAbas();
            tabInventory.classList.add('active');
            viewInventory.classList.remove('hidden');
            stopCamera();
        });
    }

    if (tabDonation) {
        tabDonation.addEventListener('click', () => {
            esconderTodasAbas();
            tabDonation.classList.add('active');
            viewDonation.classList.remove('hidden');
            stopCamera();
        });
    }

    window.buscarReceitaCombinada = function() {
        const selecionados = document.querySelectorAll('.item-checkbox:checked');
        if (selecionados.length === 0) {
            alert("Selecione pelo menos um alimento da lista para buscar receitas.");
            return;
        }

        const ingredientes = Array.from(selecionados).map(cb => cb.dataset.nome);
        const termoBusca = encodeURIComponent(`receita com ${ingredientes.join(' e ')}`);
        window.open(`https://www.tudogostoso.com.br/busca?q=${termoBusca}`, '_blank');
    };

    window.deletarItem = function(id) {
        if (confirm("Deseja realmente remover este item do seu estoque?")) {
            db.collection('produtos').doc(id).delete();
        }
    };

    function carregarEstoque(userId) {
        if (!inventoryList) return;

        unsubscribeInventory = db.collection('produtos')
            .where('userId', '==', userId)
            .orderBy('dataCriacao', 'desc')
            .onSnapshot((snapshot) => {
                inventoryList.innerHTML = '';
                const listaProdutos = [];

                if (snapshot.empty) {
                    inventoryList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #6b7280; padding: 20px;">Nenhum alimento cadastrado no momento.</p>';
                    return;
                }

                const barHTML = `
                    <div class="multi-select-bar">
                        <span style="font-size: 0.875rem; color: #374151;">Selecione os alimentos para buscar combinações:</span>
                        <button class="btn-recipe" onclick="buscarReceitaCombinada()">Buscar Receitas</button>
                    </div>
                `;
                inventoryList.insertAdjacentHTML('beforeend', barHTML);

                snapshot.forEach((doc) => {
                    const item = doc.data();
                    listaProdutos.push(item);

                    const dataFormatada = formatarDataBR(item.validade);
                    const card = document.createElement('div');
                    card.className = 'inventory-card';

                    const imgHTML = item.fotoBase64 
                        ? `<img src="${item.fotoBase64}" alt="${item.nome}">`
                        : `<div style="height:140px; background:#f3f4f6; border-radius:6px; margin-bottom:12px; display:flex; align-items:center; justify-content:center; color:#9ca3af; font-size:0.875rem;">Sem Imagem</div>`;

                    card.innerHTML = `
                        <div class="inventory-card-header">
                            <input type="checkbox" class="item-checkbox" data-nome="${item.nome}" title="Selecionar item">
                            <button type="button" class="btn-delete" onclick="deletarItem('${doc.id}')">Excluir</button>
                        </div>
                        ${imgHTML}
                        <h4 style="margin: 4px 0; color: #111827; font-size:1rem;">${item.nome}</h4>
                        <p style="font-size:0.85rem; color:#6b7280; margin-bottom:12px; flex-grow: 1;">${item.descricao || 'Sem observações'}</p>
                        <span class="badge-date">Validade: ${dataFormatada}</span>
                    `;
                    inventoryList.appendChild(card);
                });

                checarVencimentos(listaProdutos);

            }, (err) => {
                console.error("Erro ao carregar estoque:", err);
            });
    }

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
                if (productForm) productForm.classList.add('hidden');
            } catch (err) {
                alert("Acesso à câmera não permitido ou indisponível.");
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

            ctx.filter = 'none';
            ctx.drawImage(cameraVideo, 0, 0, 450, 320);

            capturedBase64Image = cameraCanvas.toDataURL('image/jpeg', 0.85);
            imagePreview.src = capturedBase64Image;

            stopCamera();
            cameraStartBox.classList.add('hidden');
            imagePreviewContainer.classList.remove('hidden');
            if (loadingMessage) loadingMessage.classList.remove('hidden');

            Tesseract.recognize(capturedBase64Image, 'por', {
                tessedit_char_whitelist: '0123456789/-.'
            }).then(({ data: { text } }) => {
                if (loadingMessage) loadingMessage.classList.add('hidden');
                if (productForm) productForm.classList.remove('hidden');

                const dateMatch = text.match(/\d{2}[\/\-]\d{2}[\/\-]\d{2,4}/);
                if (dateMatch) {
                    const expiryInput = document.getElementById('expiryDate');
                    const partes = dateMatch[0].replace(/-/g, '/').split('/');
                    
                    if (partes.length === 3) {
                        let ano = partes[2];
                        if (ano.length === 2) ano = "20" + ano;
                        expiryInput.value = `${ano}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
                    }
                }
            }).catch(() => {
                if (loadingMessage) loadingMessage.classList.add('hidden');
                if (productForm) productForm.classList.remove('hidden');
            });
        });
    }

    if (retakeBtn) {
        retakeBtn.addEventListener('click', () => {
            imagePreviewContainer.classList.add('hidden');
            if (productForm) productForm.classList.add('hidden');
            capturedBase64Image = "";
            startCameraBtn.click();
        });
    }

    if (productForm) {
        productForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const saveBtn = document.getElementById('saveProductBtn');
            saveBtn.innerText = "Salvando...";
            saveBtn.disabled = true;

            const user = auth.currentUser;
            const currentUserId = user ? user.uid : "anonimo";
            const rawValidade = document.getElementById('expiryDate').value;

            db.collection('produtos').add({
                nome: document.getElementById('productName').value,
                descricao: document.getElementById('productDescription').value,
                validade: formatarDataBR(rawValidade),
                fotoBase64: capturedBase64Image,
                userId: currentUserId,
                dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                productForm.reset();
                capturedBase64Image = "";
                
                if (imagePreviewContainer) imagePreviewContainer.classList.add('hidden');
                if (cameraStartBox) cameraStartBox.classList.remove('hidden');
                
                saveBtn.innerText = "Salvar no Estoque";
                saveBtn.disabled = false;
                
                if (tabInventory) tabInventory.click();
            }).catch((err) => {
                alert("Erro ao salvar alimento: " + err.message);
                saveBtn.innerText = "Salvar no Estoque";
                saveBtn.disabled = false;
            });
        });
    }
});
