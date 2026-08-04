// Referências aos elementos da interface
const imageInput = document.getElementById('imageInput');
const loading = document.getElementById('loading');
const productForm = document.getElementById('productForm');
const productNameInput = document.getElementById('productName');
const expiryDateInput = document.getElementById('expiryDate');
const inventoryList = document.getElementById('inventoryList');

// Inicializa a lista de produtos (simulando um Banco de Dados Gratuito)
let database = JSON.parse(localStorage.getItem('desperdicioZeroDB')) || [];

// 1. Visão Computacional (OCR) - Quando o usuário tira a foto
imageInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Mostrar tela de carregamento
    loading.classList.remove('hidden');
    productForm.classList.add('hidden');

    // Usando Tesseract.js para ler o texto da imagem
    Tesseract.recognize(
        file,
        'por', // Idioma Português
        { logger: m => console.log(m) } // Log do progresso no console
    ).then(({ data: { text } }) => {
        loading.classList.add('hidden');
        productForm.classList.remove('hidden');
        
        // Tenta preencher automaticamente baseado no que o OCR leu
        // Na prática, o OCR lê todo o rótulo. Aqui colocamos o texto lido no input para o usuário revisar.
        alert("Texto identificado! Revise os dados antes de salvar.");
        productNameInput.value = text.substring(0, 30).replace(/\n/g, ' '); // Pega os primeiros caracteres como sugestão
        
    }).catch(err => {
        console.error(err);
        loading.classList.add('hidden');
        alert("Erro ao ler a imagem. Por favor, digite manualmente.");
        productForm.classList.remove('hidden');
    });
});

// 2. Salvar Produto no Banco de Dados
productForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const newProduct = {
        id: Date.now(),
        name: productNameInput.value,
        expiry: expiryDateInput.value
    };

    database.push(newProduct);
    
    // Salva no LocalStorage (Substitua isso pelo Firebase depois)
    localStorage.setItem('desperdicioZeroDB', JSON.stringify(database));

    // Limpa o formulário e atualiza a tela
    productForm.reset();
    productForm.classList.add('hidden');
    alert("Produto salvo com sucesso no Estoque!");
    renderInventory();
});

// 3. Mostrar o Estoque e Sugerir Vídeos de Receitas
function renderInventory() {
    inventoryList.innerHTML = '';

    if (database.length === 0) {
        inventoryList.innerHTML = '<p>Seu estoque está vazio. Cadastre um alimento!</p>';
        return;
    }

    // Ordenar pela data de validade mais próxima
    database.sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

    database.forEach(product => {
        const today = new Date();
        const expiryDate = new Date(product.expiry);
        const timeDiff = expiryDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

        let urgencyClass = daysLeft <= 3 ? 'urgency-high' : 'urgency-low';
        let statusText = daysLeft < 0 ? 'Vencido!' : `Vence em ${daysLeft} dia(s)`;

        // Gera um link de busca no YouTube para receitas com aquele ingrediente
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
            <button onclick="deleteProduct(${product.id})" class="btn" style="background:#ddd; margin-top:5px; color:#333;">🗑️ Consumi / Descartar</button>
        `;
        inventoryList.appendChild(itemDiv);
    });
}

// 4. Remover produto do estoque
function deleteProduct(id) {
    database = database.filter(product => product.id !== id);
    localStorage.setItem('desperdicioZeroDB', JSON.stringify(database));
    renderInventory();
}

// Inicializa a tela mostrando os produtos salvos
renderInventory();