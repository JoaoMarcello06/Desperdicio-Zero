// =============================================================
// 1. CONFIGURAÇÃO DO FIREBASE (MANTENHA SUAS CHAVES AQUI)
// =============================================================
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

// Inicializa o Firebase se ainda não foi inicializado
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// =============================================================
// 2. ELEMENTOS DA TELA
// =============================================================
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

// =============================================================
// SISTEMA DE AUTENTICAÇÃO CORRIGIDO (LOGIN E CADASTRO)
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');
    const authTitle = document.getElementById('authTitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const toggleAuthMode = document.getElementById('toggleAuthMode');
    const toggleText = document.getElementById('toggleText');

    let isLoginMode = true;

    // Alternar entre Entrar e Cadastrar
    if (toggleAuthMode) {
        toggleAuthMode.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;

            if (isLoginMode) {
                authTitle.innerText = "Acesse sua Conta";
                authSubmitBtn.innerText = "Entrar";
                toggleText.innerText = "Não tem uma conta?";
                toggleAuthMode.innerText = "Cadastre-se aqui";
            } else {
                authTitle.innerText = "Criar Nova Conta";
                authSubmitBtn.innerText = "Cadastrar";
                toggleText.innerText = "Já tem uma conta?";
                toggleAuthMode.innerText = "Entre aqui";
            }
        });
    }

    // Submissão do Formulário
    if (authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = authEmail.value.trim();
            const password = authPassword.value;

            if (password.length < 6) {
                alert("❌ A senha deve ter no mínimo 6 caracteres.");
                return;
            }

            authSubmitBtn.disabled = true;
            authSubmitBtn.innerText = "Aguarde...";

            if (isLoginMode) {
                // MODO LOGIN
                auth.signInWithEmailAndPassword(email, password)
                    .then(() => {
                        authForm.reset();
                    })
                    .catch((error) => {
                        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                            alert("❌ E-mail ou senha incorretos.");
                        } else {
                            alert("❌ Erro ao entrar: " + error.message);
                        }
                    })
                    .finally(() => {
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.innerText = "Entrar";
                    });
            } else {
                // MODO CADASTRO
                auth.createUserWithEmailAndPassword(email, password)
                    .then((userCredential) => {
                        alert("🎉 Conta criada com sucesso!");
                        // Tenta enviar e-mail de confirmação em segundo plano sem bloquear o acesso
                        userCredential.user.sendEmailVerification().catch(() => {});
                        authForm.reset();
                    })
                    .catch((error) => {
                        if (error.code === 'auth/email-already-in-use') {
                            alert("❌ Este e-mail já está cadastrado.");
                        } else if (error.code === 'auth/invalid-email') {
                            alert("❌ Formato de e-mail inválido.");
                        } else {
                            alert("❌ Erro ao cadastrar: " + error.message);
                        }
                    })
                    .finally(() => {
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.innerText = "Cadastrar";
                    });
            }
        });
    }
});

// Monitor de Estado de Login
auth.onAuthStateChanged((user) => {
    if (user) {
        authSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        if (userHeader) userHeader.classList.remove('hidden');
        if (userEmail) userEmail.innerText = user.email;
    } else {
        authSection.classList.remove('hidden');
        appSection.classList.add('hidden');
        if (userHeader) userHeader.classList.add('hidden');
        if (typeof stopCamera === 'function') stopCamera();
    }
});

// =============================================================
// 4. NAVEGAÇÃO POR ABAS
// =============================================================
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

// =============================================================
// 5. CÂMERA E LEITURA COM IA
// =============================================================
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
            alert("Não foi possível acessar a câmera. Certifique-se de permitir o acesso no seu navegador.");
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
                    alert("✅ Data identificada: " + dateMatch[0]);
                }
            })
            .catch(() => {
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
