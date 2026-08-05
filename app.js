// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC8B3XunC9USG4zUK6R30jaCZbaB4VPrDI",
  authDomain: "desperdiciozero-9da8e.firebaseapp.com",
  projectId: "desperdiciozero-9da8e",
  storageBucket: "desperdiciozero-9da8e.firebasestorage.app",
  messagingSenderId: "671256144069",
  appId: "1:671256144069:web:8546141f903dfaee5968ac",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Elementos da Interface
const authSection = document.getElementById('authSection');
const appSection = document.getElementById('appSection');
const userHeader = document.getElementById('userHeader');
const userEmailSpan = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');

const authForm = document.getElementById('authForm');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authTitle = document.getElementById('authTitle');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const toggleAuthMode = document.getElementById('toggleAuthMode');
const toggleText = document.getElementById('toggleText');

const imageInput = document.getElementById('imageInput');
const loading = document.getElementById('loading');
const productForm = document.getElementById('productForm');
const productNameInput = document.getElementById('productName');
const productDescInput = document.getElementById('productDescription');
const expiryDateInput = document.getElementById('expiryDate');
const inventoryList = document.getElementById('inventoryList');

const detailModal = document.getElementById('detailModal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.getElementById('closeModal');

let currentUser = null;
let isSignUp = false;
let selectedFile = null;
let currentProducts = [];

// -------------------------------------------------------------
// 1. AUTENTICAÇÃO E CONTA DE USUÁRIO
// -------------------------------------------------------------

// Alternar entre modo Login e modo Cadastro
toggleAuthMode.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUp = !isSignUp;
    authTitle.innerText = isSignUp ? "Criar Nova Conta" : "Entrar na sua Conta";
    authSubmitBtn.innerText = isSignUp ? "Cadastrar" : "Entrar";
    toggleText.innerText = isSignUp ? "Já tem uma conta?" : "Não tem uma conta?";
    toggleAuthMode.innerText = isSignUp ? "Faça login aqui" : "Cadastre-se aqui";
});
// Login ou Registro com alertas detalhados de erro
authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = authEmail.value;
    const password = authPassword.value;

    if (isSignUp) {
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                alert("🎉 Conta criada com sucesso!");
            })
            .catch(err => {
                console.error("Erro no cadastro:", err);
                alert("❌ Erro ao cadastrar:\nCódigo: " + err.code + "\nMensagem: " + err.message);
            });
    } else {
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                alert("🎉 Login efetuado com sucesso!");
            })
            .catch(err => {
                console.error("Erro no login:", err);
                alert("❌ Erro ao entrar:\nCódigo: " + err.code + "\nMensagem: " + err.message);
            });
    }
});

// Logout
logoutBtn.addEventListener('click', () => auth.signOut());

// Ocultar/Exibir telas dependendo do login
auth.onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
        userEmailSpan.innerText = user.email;
        userHeader.classList.remove('hidden');
        authSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        listenToUserInventory(user.uid);
    } else {
        userHeader.classList.add('hidden');
        authSection.classList.remove('hidden');
        appSection.classList.add('hidden');
        inventoryList.innerHTML = '';
    }
});

// -------------------------------------------------------------
// 2. CADASTRO DE PRODUTOS E OCR
// -------------------------------------------------------------

imageInput.addEventListener('change', function(event) {
    selectedFile = event.target.files[0];
    if (!selectedFile) return;

    loading.classList.remove('hidden');
    productForm.classList.add('hidden');

    Tesseract.recognize(selectedFile, 'por', { logger: m => console.log(m) })
    .then(({ data: { text } }) => {
        loading.classList.add('hidden');
        productForm.classList.remove('hidden');
        alert("Texto lido! Revise os campos antes de salvar.");
        productNameInput.value = text.substring(0, 30).replace(/\n/g, ' ');
    }).catch(err => {
        loading.classList.add('hidden');
        productForm.classList.remove('hidden');
    });
});

productForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!currentUser) return;

    let imageUrl = '';

    if (selectedFile) {
        try {
            loading.classList.remove('hidden');
            const fileRef = storage.ref(`users/${currentUser.uid}/${Date.now()}_${selectedFile.name}`);
            await fileRef.put(selectedFile);
            imageUrl = await fileRef.getDownloadURL();
        } catch (error) {
            console.error("Erro ao enviar imagem:", error);
        }
    }

    const newProduct = {
        userId: currentUser.uid,
        name: productNameInput.value,
        description: productDescInput.value || '',
        expiry: expiryDateInput.value,
        imageUrl: imageUrl,
        createdAt: new Date().toISOString()
    };

    db.collection("produtos").add(newProduct)
    .then(() => {
        productForm.reset();
        selectedFile = null;
        loading.classList.add('hidden');
        productForm.classList.add('hidden');
        alert("Produto salvo na sua conta com sucesso!");
    })
    .catch((error) => {
        loading.classList.add('hidden');
        console.error("Erro ao salvar:", error);
    });
});

// -------------------------------------------------------------
// 3. ESTOQUE PRIVADO DO USUÁRIO & MODAL DE DETALHES
// -------------------------------------------------------------

function listenToUserInventory(userId) {
    // Busca APENAS os produtos do usuário logado (where userId == userId)
    db.collection("produtos")
    .where("userId", "==", userId)
    .onSnapshot((snapshot) => {
        inventoryList.innerHTML = '';
        currentProducts = [];

        if (snapshot.empty) {
            inventoryList.innerHTML = '<p>Você não possui alimentos salvos. Cadastre um!</p>';
            return;
        }

        snapshot.forEach((doc) => {
            currentProducts.push({ id: doc.id, ...doc.data() });
        });

        currentProducts.sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

        currentProducts.forEach(product => {
            const today = new Date();
            const expiryDate = new Date(product.expiry);
            const timeDiff = expiryDate.getTime() - today.getTime();
            const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

            let urgencyClass = daysLeft <= 3 ? 'urgency-high' : 'urgency-low';
            let statusText = daysLeft < 0 ? 'Vencido!' : `Vence em ${daysLeft} dia(s)`;

            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item';
            
            // Clique no card abre os detalhes do item
            itemDiv.onclick = () => openProductDetail(product.id);

            const imageThumb = product.imageUrl 
                ? `<img src="${product.imageUrl}" class="inventory-thumb" alt="${product.name}">` 
                : '';

            itemDiv.innerHTML = `
                ${imageThumb}
                <h3>${product.name}</h3>
                <p class="${urgencyClass}">📅 ${statusText} (${product.expiry.split('-').reverse().join('/')})</p>
                <small style="color:#777;">🔍 Clique para ver detalhes</small>
            `;
            inventoryList.appendChild(itemDiv);
        });
    });
}

// Abrir Modal de Detalhes
function openProductDetail(productId) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;

    const today = new Date();
    const expiryDate = new Date(product.expiry);
    const timeDiff = expiryDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

    const youtubeQuery = encodeURIComponent(`receita fácil com ${product.name}`);
    const youtubeLink = `https://www.youtube.com/results?search_query=${youtubeQuery}`;

    const modalImgHtml = product.imageUrl 
        ? `<img src="${product.imageUrl}" class="modal-img" alt="${product.name}">` 
        : '<p><em>Este item não tem foto.</em></p>';

    modalBody.innerHTML = `
        <h2>${product.name}</h2>
        ${modalImgHtml}
        <p><strong>Status:</strong> ${daysLeft < 0 ? '❌ Vencido' : `✅ Vence em ${daysLeft} dia(s)`}</p>
        <p><strong>Data de Validade:</strong> ${product.expiry.split('-').reverse().join('/')}</p>
        <p><strong>Observações:</strong> ${product.description || 'Nenhuma observação registrada.'}</p>
        
        <a href="${youtubeLink}" target="_blank" class="btn btn-youtube">
            ▶️ Ver Receitas no YouTube
        </a>

        <button onclick="deleteProduct('${product.id}')" class="btn" style="background:#d32f2f; color:white; margin-top:15px;">
            🗑️ Excluir / Consumir Produto
        </button>
    `;

    detailModal.classList.remove('hidden');
}

// Fechar Modal
closeModal.onclick = () => detailModal.classList.add('hidden');
window.onclick = (e) => {
    if (e.target === detailModal) detailModal.classList.add('hidden');
};

// Deletar Produto
function deleteProduct(id) {
    if (confirm("Deseja realmente remover este alimento do seu estoque?")) {
        db.collection("produtos").doc(id).delete()
        .then(() => {
            detailModal.classList.add('hidden');
        });
    }
}
