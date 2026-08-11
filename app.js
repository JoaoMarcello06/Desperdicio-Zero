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
const storage = firebase.storage();

// =============================================================
// INICIALIZAÇÃO E ELEMENTOS
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
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
    let currentImageBlob = null;
    let unsubscribeInventory = null;

    // -------------------------------------------------------------
    // VALIDAÇÃO DO BOTÃO DE CADASTRO/LOGIN (VERDE x CINZA)
    // -------------------------------------------------------------
    function validarFormularioAuth() {
        const email = authEmail.value.trim();
        const senha = authPassword.value;
        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const senhaValida = senha.length >= 6;

        if (emailValido && senhaValida) {
            authSubmitBtn.disabled = false; // Fica verde
        } else {
            authSubmitBtn.disabled = true;  // Fica cinza
        }
    }

    if (authEmail && authPassword) {
        authEmail.addEventListener('input', validarFormularioAuth);
        authPassword.addEventListener('input', validarFormularioAuth);
    }

    // Alternar entre Login e Cadastro
    if (toggleAuthMode) {
        toggleAuthMode.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            authTitle.innerText = isLoginMode ? "Acesse sua Conta" : "Criar Nova Conta";
            authSubmitBtn.innerText = isLoginMode ? "Entrar" : "Cadastrar";
            toggleText.innerText = isLoginMode ? "Não tem uma conta?" : "Já tem uma conta?";
            toggleAuthMode.innerText = isLoginMode ? "Cadastre-se aqui" : "Entre aqui";
            validarFormularioAuth();
        });
    }

    // Processar Login / Cadastro
    if (authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = authEmail.value.trim();
            const password = authPassword.value;

            authSubmitBtn.disabled = true;
            authSubmitBtn.innerText = "Aguarde...";

            if (isLoginMode) {
                auth.signInWithEmailAndPassword(email, password)
                    .catch((error) => {
                        alert("❌ Falha no acesso: E-mail ou senha incorretos.");
                        validarFormularioAuth();
                    });
            } else {
                auth.createUserWithEmailAndPassword(email, password)
                    .then(() => alert("🎉 Conta criada com sucesso!"))
                    .catch((error) => {
                        alert("❌ Erro ao cadastrar: " + error.message);
                        validarFormularioAuth();
                    });
            }
        });
    }

    // Monitor do Usuário + Carregamento do Estoque
    auth.onAuthStateChanged((user) => {
        if (user) {
            authSection.classList.add('hidden');
            appSection.classList.remove('hidden');
            if (userHeader) userHeader.classList.remove('hidden');
            if (userEmail) userEmail.innerText = user.email;

            // Carrega os produtos em tempo real do banco
            carregarEstoque(user.uid);
        } else {
            authSection.classList.remove('hidden');
            appSection.classList.add('hidden');
            if (userHeader) userHeader.classList.add('hidden');
            if (unsubscribeInventory) unsubscribeInventory();
            stopCamera();
        }
    });

    if (logoutBtn) logoutBtn.addEventListener('click', () => auth.signOut());

    // -------------------------------------------------------------
    // CARREGAR E EXIBIR ESTOQUE
    // -------------------------------------------------------------
    function carregarEstoque(userId) {
        if (!inventoryList) return;

        unsubscribeInventory = db.collection('produtos')
            .where('userId', '==', userId)
            .onSnapshot((snapshot) => {
                inventoryList.innerHTML = '';

                if (snapshot.empty) {
                    inventoryList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Nenhum produto cadastrado ainda.</p>';
                    return;
                }

                snapshot.forEach((doc) => {
                    const item = doc.data();
                    const card = document.createElement('div');
                    card.className = 'inventory-card';

                    const imgTag = item.fotoUrl 
                        ? `<img src="${item.fotoUrl}" alt="${item.nome}">`
                        : `<div style="height:100px; background:#e2e8f0; border-radius:8px; display:flex; align-items:center; justify-content:center;">📦</div>`;

                    card.innerHTML = `
                        ${imgTag}
                        <h4>${item.nome}</h4>
                        <p>${item.descricao || 'Sem observações'}</p>
                        <span class="badge-date">📅 Validade: ${item.validade}</span>
                        <button class="btn-delete" onclick="deletarProduto('${doc.id}')">Excluir</button>
                    `;
                    inventoryList.appendChild(card);
                });
            }, (error) => {
                console.error("Erro ao carregar estoque:", error);
            });
    }

    window.deletarProduto = function(id) {
        if (confirm("Deseja remover este item do estoque?")) {
            db.collection('produtos').doc(id).delete();
        }
    };

    // -------------------------------------------------------------
    // NAVEGAÇÃO ENTRE ABAS
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // CÂMERA E SALVAMENTO DE PRODUTO
    // -------------------------------------------------------------
    if (startCameraBtn) {
        startCameraBtn.addEventListener('click', async (e) => {
            e.preventDefault();
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
                alert("Permissão de câmera negada ou dispositivo sem suporte.");
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

    if (stopCameraBtn) {
        stopCameraBtn.addEventListener('click', (e) => {
            e.preventDefault();
            stopCamera();
        });
    }

    if (captureBtn) {
        captureBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const ctx = cameraCanvas.getContext('2d');
            cameraCanvas.width = cameraVideo.videoWidth || 640;
            cameraCanvas.height = cameraVideo.videoHeight || 480;

            ctx.filter = 'grayscale(100%) contrast(150%)';
            ctx.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);

            const imageDataUrl = cameraCanvas.toDataURL('image/jpeg', 0.8);
            imagePreview.src = imageDataUrl;

            cameraCanvas.toBlob((blob) => { currentImageBlob = blob; }, 'image/jpeg', 0.8);

            stopCamera();
            cameraStartBox.classList.add('hidden');
            imagePreviewContainer.classList.remove('hidden');
            document.getElementById('loading').classList.remove('hidden');

            Tesseract.recognize(imageDataUrl, 'por')
                .then(({ data: { text } }) => {
                    document.getElementById('loading').classList.add('hidden');
                    productForm.classList.remove('hidden');

                    const dateMatch = text.match(/\d{2}[\/\-]\d{2}[\/\-]\d{2,4}/);
                    if (dateMatch) {
                        const dateFormatted = dateMatch[0].replace(/\-/g, '/');
                        alert("✅ Data identificada: " + dateFormatted);
                    }
                })
                .catch(() => {
                    document.getElementById('loading').classList.add('hidden');
                    productForm.classList.remove('hidden');
                });
        });
    }

    if (retakeBtn) {
        retakeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            imagePreviewContainer.classList.add('hidden');
            productForm.classList.add('hidden');
            startCameraBtn.click();
        });
    }

    // Salvar Alimento no Firestore
    if (productForm) {
        productForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const saveBtn = document.getElementById('saveProductBtn');
            saveBtn.innerText = "⏳ Salvando...";
            saveBtn.disabled = true;

            const user = auth.currentUser;
            if (!user) return;

            const salvarNoFirestore = (imageUrl = '') => {
                db.collection('produtos').add({
                    nome: document.getElementById('productName').value,
                    descricao: document.getElementById('productDescription').value,
                    validade: document.getElementById('expiryDate').value,
                    fotoUrl: imageUrl,
                    userId: user.uid,
                    dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    alert("🎉 Alimento adicionado ao estoque!");
                    productForm.reset();
                    saveBtn.innerText = "Salvar no Estoque";
                    saveBtn.disabled = false;
                    tabInventory.click(); // Redireciona para o estoque
                }).catch((err) => {
                    alert("Erro ao salvar: " + err.message);
                    saveBtn.innerText = "Salvar no Estoque";
                    saveBtn.disabled = false;
                });
            };

            if (currentImageBlob) {
                const imageName = `produtos/${user.uid}_${Date.now()}.jpg`;
                const storageRef = storage.ref(imageName);
                storageRef.put(currentImageBlob)
                    .then(snapshot => snapshot.ref.getDownloadURL())
                    .then(url => salvarNoFirestore(url))
                    .catch(() => salvarNoFirestore(''));
            } else {
                salvarNoFirestore('');
            }
        });
    }
});
