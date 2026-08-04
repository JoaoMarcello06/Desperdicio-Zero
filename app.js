// -------------------------------------------------------------
// CONFIGURAÇÃO DO FIREBASE (Coloque suas chaves aqui)
// -------------------------------------------------------------
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto-id",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:000000000000"
};

// Inicializar Firebase, Firestore e Storage
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

// Referências
const imageInput = document.getElementById('imageInput');
const loading = document.getElementById('loading');
const productForm = document.getElementById('productForm');
const productNameInput = document.getElementById('productName');
const expiryDateInput = document.getElementById('expiryDate');
const inventoryList = document.getElementById('inventoryList');

let selectedFile = null; // Guarda o arquivo da foto selecionada

// 1. Visão Computacional (OCR) ao escolher/tirar foto
imageInput.addEventListener('change', function(event) {
    selectedFile = event.target.files[0];
    if (!selectedFile) return;

    loading.classList.remove('hidden');
    productForm.classList.add('hidden');

    Tesseract.recognize(selectedFile, 'por', { logger: m => console.log(m) })
    .then(({ data: { text } }) => {
        loading.classList.add('hidden');
        productForm.classList.remove('hidden');
        alert("Texto identificado! Revise os dados antes de salvar.");
        productNameInput.value = text.substring(0, 30).replace(/\n/g, ' ');
    }).catch(err => {
        loading.classList.add('hidden');
        alert("Erro ao ler a imagem. Digite manualmente.");
        productForm.classList.remove('hidden');
    });
});

// 2. Salvar Produto + Enviar Foto para o Firebase Storage
productForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    let imageUrl = '';

    // Se houver uma foto tirada, faz o upload para o Firebase Storage
    if (selectedFile) {
        try {
            loading.classList.remove('hidden');
            loading.querySelector('p').innerText = "⏳ Salvando foto no banco de dados...";

            const fileRef = storage.ref(`produtos/${Date.now()}_${selectedFile.name}`);
            await fileRef.put(selectedFile);
            imageUrl = await fileRef.getDownloadURL(); // Pega o link público da imagem
        } catch (error) {
            console.error("Erro ao enviar imagem: ", error);
        }
    }

    const newProduct = {
        name: productNameInput.value,
        expiry: expiryDateInput.value,
        imageUrl: imageUrl, // Salva o link da foto no produto
        createdAt: new Date().toISOString()
    };

    // Salva os dados no Firestore
    db.collection("produtos").add(newProduct)
    .then(() => {
        productForm.reset();
        selectedFile = null;
        loading.classList.add('hidden');
        productForm.classList.add('hidden');
        alert("Produto e foto salvos com sucesso!");
    })
    .catch((error) => {
        loading.classList.add('hidden');
        console.error("Erro ao salvar dados: ", error);
    });
});

// 3. Mostrar Estoque com Foto do Alimento
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

            // Exibe a imagem se ela existir
            const imageHtml = product.imageUrl 
                ? `<img src="${product.imageUrl}" alt="${product.name}" style="width:100%; max-height:180px; object-fit:cover; border-radius:8px; margin-bottom:10px;">` 
                : '';

            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item';
            itemDiv.innerHTML = `
                ${imageHtml}
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

// 4. Deletar do Banco
function deleteProduct(id) {
    db.collection("produtos").doc(id).delete();
}

listenToInventory();
