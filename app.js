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
// INICIALIZAÇÃO
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    const authSection = document.getElementById('authSection');
    const verificationSection = document.getElementById('verificationSection');
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

    const verifyCodeBtn = document.getElementById('verifyCodeBtn');
    const cancelVerifyBtn = document.getElementById('cancelVerifyBtn');

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
    let generatedCode = null;
    let pendingUserCredential = null;
    let unsubscribeInventory = null;

    // Validar botão entrar/cadastrar
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

    // OTP Inputs
    const otpInputs = [
        document.getElementById('otp1'),
        document.getElementById('otp2'),
        document.getElementById('otp3'),
        document.getElementById('otp4'),
        document.getElementById('otp5'),
        document.getElementById('otp6')
    ];

    otpInputs.forEach((input, index) => {
        if (!input) return;
        input.addEventListener('input', () => {
            if (input.value && index < 5) otpInputs[index + 1].focus();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && index > 0) otpInputs[index - 1].focus();
        });
    });

    if (authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = authEmail.value.trim();
            const password = authPassword.value;

            authSubmitBtn.disabled = true;

            if (isLoginMode) {
                auth.signInWithEmailAndPassword(email, password)
                    .catch((err) => {
                        alert("❌ E-mail ou senha incorretos.");
                        validarForm();
                    });
            } else {
                generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
                
                auth.createUserWithEmailAndPassword(email, password)
                    .then((userCred) => {
                        pendingUserCredential = userCred;
                        authSection.classList.add('hidden');
                        verificationSection.classList.remove('hidden');
                        
                        alert(`📧 CÓDIGO DE VERIFICAÇÃO GERADO PARA: ${email}\n\nSeu código é: ${generatedCode}`);
                        otpInputs[0].focus();
                    })
                    .catch((err) => {
                        alert("❌ Erro ao cadastrar: " + err.message);
                        validarForm();
                    });
            }
        });
    }

    if (verifyCodeBtn) {
        verifyCodeBtn.addEventListener('click', () => {
            const enteredCode = otpInputs.map(i => i.value).join('');
            if (enteredCode === generatedCode) {
                alert("✅ Código verificado com sucesso!");
                pendingUserCredential = null;
                verificationSection.classList.add('hidden');
                appSection.classList.remove('hidden');
                if (userHeader) userHeader.classList.remove('hidden');
                if (userEmail && auth.currentUser) userEmail.innerText = auth.currentUser.email;
                if (auth.currentUser) carregarEstoque(auth.currentUser.uid);
            } else {
                alert("❌ Código incorreto. Tente novamente.");
            }
        });
    }

    if (cancelVerifyBtn) {
        cancelVerifyBtn.addEventListener('click', () => {
            pendingUserCredential = null;
            auth.signOut();
            verificationSection.classList.add('hidden');
            authSection.classList.remove('hidden');
        });
    }

    auth.onAuthStateChanged((user) => {
        if (user && !pendingUserCredential) {
            authSection.classList.add('hidden');
            verificationSection.classList.add('hidden');
            appSection.classList.remove('hidden');
            if (userHeader) userHeader.classList.remove('hidden');
            if (userEmail) userEmail.innerText = user.email;
            carregarEstoque(user.uid);
        } else if (!user) {
            authSection.classList.remove('hidden');
            appSection.classList.add('hidden');
            if (userHeader) userHeader.classList.add('hidden');
            if (unsubscribeInventory) unsubscribeInventory();
            stopCamera();
        }
    });

    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        pendingUserCredential = null;
        auth.signOut();
    });

    function carregarEstoque(userId) {
        if (!inventoryList) return;

        unsubscribeInventory = db.collection('produtos')
            .where('userId', '==', userId)
            .onSnapshot((snapshot) => {
                inventoryList.innerHTML = '';
                if (snapshot.empty) {
                    inventoryList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Nenhum alimento no estoque.</p>';
                    return;
                }

                snapshot.forEach((doc) => {
                    const item = doc.data();
                    const card = document.createElement('div');
                    card.className = 'inventory-card';

                    const imgHTML = item.fotoBase64 
                        ? `<img src="${item.fotoBase64}" alt="${item.nome}">`
                        : `<div style="height:100px; background:#e2e8f0; border-radius:8px; display:flex; align-items:center; justify-content:center;">📦 Sem Foto</div>`;

                    card.innerHTML = `
                        ${imgHTML}
                        <h4>${item.nome}</h4>
                        <p>${item.descricao || 'Sem observações'}</p>
                        <span class="badge-date">📅 Validade: ${item.validade}</span>
                        <button type="button" class="btn-delete" onclick="deletarItem('${doc.id}')">Excluir</button>
                    `;
                    inventoryList.appendChild(card);
                });
            }, (err) => {
                console.error("Erro no estoque:", err);
            });
    }

    window.deletarItem = function(id) {
        if (confirm("Remover este item do estoque?")) {
            db.collection('produtos').doc(id).delete();
        }
    };

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

                const dateMatch = text.match(/\d{2}[\/\-]\d{2}[\/\-]\d{2,4}/);
                if (dateMatch) {
                    alert("⚡ Data identificada: " + dateMatch[0]);
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

    // SALVAR PRODUTO NO FIRESTORE
    if (productForm) {
        productForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const saveBtn = document.getElementById('saveProductBtn');
            saveBtn.innerText = "⏳ Salvando...";
            saveBtn.disabled = true;

            const user = auth.currentUser;
            const currentUserId = user ? user.uid : "anonimo";

            db.collection('produtos').add({
                nome: document.getElementById('productName').value,
                descricao: document.getElementById('productDescription').value,
                validade: document.getElementById('expiryDate').value,
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
