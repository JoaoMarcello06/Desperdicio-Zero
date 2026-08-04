// -------------------------------------------------------------
// CONFIGURAÇÃO DO FIREBASE
// Cole aqui o objeto firebaseConfig que apareceu na tela do Firebase:
// -------------------------------------------------------------
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

// Inicializar o Firebase e o Banco Firestore
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Referências aos elementos do HTML
const imageInput = document.getElementById('imageInput');
const loading = document.getElementById('loading');
const productForm = document.getElementById('productForm');
const productNameInput = document.getElementById('productName');
const expiryDateInput = document.getElementById('expiryDate');
const inventoryList = document.getElementById('inventoryList');

// 1. Visão Computacional (OCR)
imageInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    loading.classList.remove('hidden');
    productForm.classList.add('hidden');

    Tesseract.recognize(file, 'por', { logger: m => console.log(m) })
    .then(({ data: { text } }) => {
        loading.classList.add('hidden');
        productForm.classList.remove('hidden');
        alert("Texto identificado! Revise os dados antes de salvar.");
        productNameInput.value = text.substring(0, 30).replace(/\n/g, ' ');
    }).catch(err => {
        loading.classList.add('hidden');
        alert("Erro ao ler a imagem. Por favor, digite manualmente.");
        productForm.classList.remove('hidden');
    });
});

// 2. SALVAR no Banco de Dados (Firebase Firestore)
productForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const newProduct = {
        name: productNameInput.value,
        expiry: expiryDateInput.value,
        createdAt: new Date().toISOString()
    };

    // Salva na coleção "produtos" do Firebase
    db.collection("produtos").add(newProduct)
    .then(() => {
        productForm.reset();
        productForm.classList.add('hidden');
        alert("Produto salvo no banco de dados com sucesso!");
    })
    .catch((error) => {
        console.error("Erro ao salvar no Firebase: ", error);
    });
});

// 3. MOSTRAR ESTOQUE (Atualização em Tempo Real)
// Essa função ouve qualquer alteração no banco de dados automaticamente!
function listenToInventory() {
    db.collection("produtos").onSnapshot((snapshot) => {
        inventoryList.innerHTML = '';

        if (snapshot.empty) {
            inventoryList.innerHTML = '<p>Seu estoque está vazio. Cadastre um alimento!</p>';
            return;
        }

        let products = [];
        snapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });

        // Ordenar pela data de validade mais próxima
        products.sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

        products.forEach(product => {
            const today = new Date();
            const expiryDate = new Date(product.expiry);
            const timeDiff = expiryDate.getTime() - today.getTime();
            const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

            let urgencyClass = daysLeft <= 3 ? 'urgency-high' : 'urgency-low';
            let statusText = daysLeft < 0 ? 'Vencido!' : `Vence em ${daysLeft} dia(s)`;

            const youtubeQuery = encodeURIComponent(`receita fácil com ${product.name}`);
            const youtubeLink = `https://www.youtube.com/results?search_query=${youtubeQuery}`;

            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item';
            itemDiv.innerHTML = `
                <h3>${product.name}</h3>
                <p class="${urgencyClass}">📅 ${statusText} (${product.expiry.split('-').reverse().join('/')})</p>
                <a href="${youtubeLink}" target="_blank" class="btn btn-youtube">
                    ▶️ Ver Receitas no YouTube
                </a>
                <button onclick="deleteProduct('${product.id}')" class="btn" style="background:#ddd; margin-top:5px; color:#333;">🗑️ Consumi / Descartar</button>
            `;
            inventoryList.appendChild(itemDiv);
        });
    });
}

// 4. DELETAR do Banco de Dados
function deleteProduct(id) {
    db.collection("produtos").doc(id).delete()
    .then(() => {
        console.log("Produto removido do banco.");
    })
    .catch((error) => {
        console.error("Erro ao remover: ", error);
    });
}

// Inicia a escuta em tempo real do banco de dados ao carregar a página
listenToInventory();
