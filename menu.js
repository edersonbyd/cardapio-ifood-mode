/* =========================================================
 * Cardápio Digital — script principal
 * Configure abaixo a URL da API e o número do WhatsApp.
 * ========================================================= */
const CONFIG = {
  // ID da planilha do Google Sheets (precisa estar "Qualquer pessoa com o link: Leitor").
  SHEET_ID: "1yELWMHl4AMWPbiLrJqIQ9C08zCOdruUQysWl4gu5cjQ",
  SHEET_NAME: "Cardapio",
  // Endpoint interno (usado quando rodando no Lovable com server functions).
  // Em produção estática (Vercel/GitHub Pages) cai no fetch direto do CSV público.
  API_URL: "/api/menu",
  // Número do WhatsApp com DDI (somente dígitos). Ex: 5511999999999
  WHATSAPP: "5598984940944",
  STORAGE_KEY: "cardapio_cart_v1",
};

// Dados de exemplo (usados quando API_URL está vazia ou falha)
const MOCK_PRODUCTS = [
  
{ id: 1, nome: "Bolo Vulcão", preco: 28.9, descricao: "Ninho", imagem: "/public/imagem/logo-amanda.jpeg", categoria: "Bolos e Tortas" },
{ id: 2, nome: "Bolo Vulcão", preco: 34.5, descricao: "Chocolate", imagem: "/public/imagem/bolo-vulcao.jpeg", categoria: "Bolos e Tortas" },
{ id: 3, nome: "Bolo Vulcão", preco: 26.0, descricao: "Chocolate e Ninho", imagem: "/public/imagem/bolo-vulcao.jpeg", categoria: "Bolos e Tortas" },
{ id: 4, nome: "Mini Vulcão", preco: 28.9, descricao: "Ninho", imagem: "/public/imagem/mini-vulcao.jpeg", categoria: "Bolos e Tortas" },
{ id: 5, nome: "Mini Vulcão", preco: 34.5, descricao: "Chocolate", imagem: "/public/imagem/mini-vulcao.jpeg", categoria: "Bolos e Tortas" },
{ id: 6, nome: "Mini Vulcão", preco: 26.0, descricao: "Chocolate e Ninho", imagem: "/public/imagem/mini-vulcao.jpeg", categoria: "Bolos e Tortas" },
{ id: 7, nome: "Caseirinho", preco: 49.9, descricao: "Chocolate", imagem: "/public/imagem/caseirinho.jpeg", categoria: "Doces Finos" },
{ id: 8, nome: "Caseirinho", preco: 49.9, descricao: "Dois Amores", imagem: "/public/imagem/caseirinho.jpeg", categoria: "Doces Finos" },
{ id: 9, nome: "Caseirinho", preco: 49.9, descricao: "Maracujá", imagem: "/public/imagem/caseirinho.jpeg", categoria: "Doces Finos" },
{ id: 10, nome: "Caseirinho", preco: 49.9, descricao: "Trigo", imagem: "/public/imagem/caseirinho.jpeg", categoria: "Doces Finos" },
{ id: 11, nome: "Caseirinho", preco: 49.9, descricao: "Formigueiro", imagem: "/public/imagem/caseirinho.jpeg", categoria: "Doces Finos" },
{ id: 12, nome: "Fatia de Torta", preco: 52.0, descricao: "Chocolate", imagem: "/public/imagem/fatia-torta.jpeg", categoria: "Doces Finos" },
{ id: 13, nome: "Fatia de Torta", preco: 52.0, descricao: "Chocolate e Ninho", imagem: "/public/imagem/fatia-torta.jpeg", categoria: "Doces Finos" },
{ id: 14, nome: "Fatia de Torta", preco: 52.0, descricao: "Frutas vermelhas", imagem: "/public/imagem/fatia-torta.jpeg", categoria: "Doces Finos" },
{ id: 15, nome: "Fatia de Torta", preco: 52.0, descricao: "Maracujá", imagem: "/public/imagem/fatia-torta.jpeg", categoria: "Doces Finos" },
{ id: 16, nome: "Fatia de Torta", preco: 52.0, descricao: "Abacaxi", imagem: "/public/imagem/fatia-torta.jpeg", categoria: "Doces Finos" },
{ id: 17, nome: "Fatia de Torta", preco: 52.0, descricao: "Olho de Sogra", imagem: "/public/imagem/fatia-torta.jpeg", categoria: "Doces Finos" },
{ id: 18, nome: "Fatia de Torta", preco: 52.0, descricao: "Surpresa de uva", imagem: "/public/imagem/fatia-torta.jpeg", categoria: "Doces Finos" },
{ id: 19, nome: "Fatia de Torta", preco: 52.0, descricao: "Surpresa de morango", imagem: "/public/imagem/fatia-torta.jpeg", categoria: "Doces Finos" },
{ id: 20, nome: "Trufas", preco: 4.0, descricao: "Chocolate com recheio de Ninho", imagem: "/public/imagem/trunfas.jpeg", categoria: "Tradicionais e Gourmet" },
{ id: 21, nome: "Docinhos", preco: 7.0, descricao: "Beijinho", imagem: "/public/imagem/docinhos.jpeg", categoria: "Tradicionais e Gourmet" },
{ id: 22, nome: "Docinhos", preco: 7.0, descricao: "Ninho", imagem: "/public/imagem/docinhos.jpeg", categoria: "Tradicionais e Gourmet" },
{ id: 23, nome: "Docinhos", preco: 7.0, descricao: "Brigadeiro", imagem: "/public/imagem/docinhos.jpeg", categoria: "Tradicionais e Gourmet" },
{ id: 24, nome: "Docinhos", preco: 7.0, descricao: "Romeu e Julieta", imagem: "/public/imagem/docinhos.jpeg", categoria: "Tradicionais e Gourmet" },
{ id: 25, nome: "Docinhos", preco: 7.0, descricao: "Churros", imagem: "/public/imagem/docinhos.jpeg", categoria: "Tradicionais e Gourmet" },
{ id: 26, nome: "Docinhos", preco: 7.0, descricao: "Surpre de Uva ", imagem: "/public/imagem/docinhos.jpeg", categoria: "Tradicionais e Gourmet" },
{ id: 27, nome: "Docinhos", preco: 7.0, descricao: "Casadinho", imagem: "/public/imagem/docinhos.jpeg", categoria: "Tradicionais e Gourmet" },
{ id: 28, nome: "Coca-Cola 350ml", preco: 7.0, descricao: "Lata 350ml.", imagem: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600", categoria: "Bebidas" },
{ id: 29, nome: "Jesus 350ml", preco: 9.5, descricao: "Lata 350ml", imagem: "/public/imagem/jesus-350ml.webp", categoria: "Bebidas" },
{ id: 30, nome: "Fanta 350ml", preco: 9.5, descricao: "Lata 350ml", imagem: "/public/imagem/fanta-350ml.webp", categoria: "Bebidas" },

];

// Estado
let products = [];
let cart = loadCart();
let activeCategory = "Todos";

// DOM refs
const $ = (sel) => document.querySelector(sel);
const productsEl = $("#products");
const statusEl = $("#status");
const categoriesEl = $("#categories");
const cartCount = $("#cart-count");
const cartItemsEl = $("#cart-items");
const cartTotalEl = $("#cart-total");
const drawer = $("#cart-drawer");
const overlay = $("#overlay");
const toastEl = $("#toast");

// ====== Inicialização ======
init();

async function init() {
  bindEvents();
  updateCartUI();
  await loadProducts();
}

function bindEvents() {
  $("#cart-btn").addEventListener("click", openCart);
  $("#close-cart").addEventListener("click", closeCart);
  overlay.addEventListener("click", closeCart);
  $("#checkout-btn").addEventListener("click", checkout);
}

// ====== Carregamento de produtos ======
async function loadProducts() {
  showStatus(`<div class="spinner"></div><p style="margin-top:10px">Carregando cardápio...</p>`);
  try {
    if (CONFIG.API_URL) {
      const res = await fetch(CONFIG.API_URL);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      products = normalize(data);
    } else {
      // sem API configurada → usa mock
      await new Promise((r) => setTimeout(r, 300));
      products = normalize(MOCK_PRODUCTS);
    }
    statusEl.innerHTML = "";
    renderCategories();
    renderProducts();
  } catch (err) {
    console.error(err);
    showStatus(`<p style="color:var(--primary)">⚠️ Não foi possível carregar o cardápio.</p>
      <p style="font-size:13px;margin-top:6px">Exibindo itens de demonstração.</p>`);
    products = normalize(MOCK_PRODUCTS);
    renderCategories();
    renderProducts();
  }
}

// Converte links do Google Drive em URLs diretas (funcionam em <img>)
function resolveImageUrl(url) {
  if (!url) return "";
  const s = String(url).trim();
  // /file/d/ID/view  ou  /file/d/ID
  let m = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w800`;
  // open?id=ID  ou  uc?id=ID
  m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w800`;
  return s;
}

// Normaliza dados (aceita campos com/sem acento)
function normalize(arr) {
  return arr.map((p) => ({
    id: String(p.id ?? p.ID ?? Math.random()),
    nome: p.nome ?? p.Nome ?? "Sem nome",
    preco: Number(p.preco ?? p["preço"] ?? p.Preco ?? p.Preço ?? 0),
    descricao: p.descricao ?? p["descrição"] ?? p.Descricao ?? "",
    imagem: resolveImageUrl(p.imagem ?? p.Imagem ?? ""),
    categoria: p.categoria ?? p.Categoria ?? "Outros",
  }));
}

function showStatus(html) {
  statusEl.innerHTML = html;
}

// ====== Renderização ======
function renderCategories() {
  const cats = ["Todos", ...new Set(products.map((p) => p.categoria))];
  categoriesEl.innerHTML = cats
    .map(
      (c) =>
        `<button class="chip ${c === activeCategory ? "active" : ""}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`
    )
    .join("");
  categoriesEl.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      renderCategories();
      renderProducts();
    });
  });
}

function renderProducts() {
  const list = activeCategory === "Todos"
    ? products
    : products.filter((p) => p.categoria === activeCategory);

  if (!list.length) {
    productsEl.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px">Nenhum produto encontrado.</p>`;
    return;
  }

  productsEl.innerHTML = list
    .map(
      (p) => `
    <article class="card">
      <img class="card-img" src="${escapeHtml(p.imagem)}" alt="${escapeHtml(p.nome)}" loading="lazy"
        onerror="this.src='https://via.placeholder.com/400x300?text=Sem+imagem'"/>
      <div class="card-body">
        <h3 class="card-title">${escapeHtml(p.nome)}</h3>
        <p class="card-desc">${escapeHtml(p.descricao)}</p>
        <div class="card-footer">
          <span class="price">${formatBRL(p.preco)}</span>
          <button class="btn btn-add" data-id="${escapeHtml(p.id)}">Adicionar</button>
        </div>
      </div>
    </article>`
    )
    .join("");

  productsEl.querySelectorAll(".btn-add").forEach((b) => {
    b.addEventListener("click", () => addToCart(b.dataset.id));
  });
}

// ====== Carrinho ======
function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}
function saveCart() {
  localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(cart));
}

function addToCart(id) {
  const product = products.find((p) => String(p.id) === String(id));
  if (!product) return;
  const existing = cart.find((i) => String(i.id) === String(id));
  if (existing) existing.qty += 1;
  else cart.push({ id: product.id, nome: product.nome, preco: product.preco, imagem: product.imagem, qty: 1 });
  saveCart();
  updateCartUI();
  toast(`${product.nome} adicionado!`);
}

function changeQty(id, delta) {
  const item = cart.find((i) => String(i.id) === String(id));
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter((i) => i.id !== item.id);
  saveCart();
  updateCartUI();
}

function removeItem(id) {
  cart = cart.filter((i) => String(i.id) !== String(id));
  saveCart();
  updateCartUI();
}

function updateCartUI() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  cartCount.textContent = count;
  const total = cart.reduce((s, i) => s + i.qty * i.preco, 0);
  cartTotalEl.textContent = formatBRL(total);

  if (!cart.length) {
    cartItemsEl.innerHTML = `<p class="cart-empty">Seu carrinho está vazio 🛒</p>`;
    $("#checkout-btn").disabled = true;
    return;
  }
  $("#checkout-btn").disabled = false;

  cartItemsEl.innerHTML = cart
    .map(
      (i) => `
    <div class="cart-item">
      <img src="${escapeHtml(i.imagem)}" alt="${escapeHtml(i.nome)}"
        onerror="this.src='https://via.placeholder.com/60'"/>
      <div class="cart-item-info">
        <h4>${escapeHtml(i.nome)}</h4>
        <div class="ci-price">${formatBRL(i.preco * i.qty)}</div>
        <div class="qty">
          <button data-act="dec" data-id="${escapeHtml(i.id)}">−</button>
          <span>${i.qty}</span>
          <button data-act="inc" data-id="${escapeHtml(i.id)}">+</button>
          <button class="remove" data-act="rm" data-id="${escapeHtml(i.id)}">remover</button>
        </div>
      </div>
    </div>`
    )
    .join("");

  cartItemsEl.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (btn.dataset.act === "inc") changeQty(id, 1);
      if (btn.dataset.act === "dec") changeQty(id, -1);
      if (btn.dataset.act === "rm") removeItem(id);
    });
  });
}

function openCart() { drawer.classList.add("open"); overlay.classList.add("show"); }
function closeCart() { drawer.classList.remove("open"); overlay.classList.remove("show"); }

// ====== Checkout WhatsApp ======
function checkout() {
  if (!cart.length) return;
  const lines = cart.map((i) => `• ${i.nome} x${i.qty} = ${formatBRL(i.preco * i.qty)}`);
  const total = cart.reduce((s, i) => s + i.qty * i.preco, 0);
  const msg = `*Novo Pedido* 🍔\n\n${lines.join("\n")}\n\n*Total: ${formatBRL(total)}*`;
  const url = `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

// ====== Helpers ======
function formatBRL(v) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
}
