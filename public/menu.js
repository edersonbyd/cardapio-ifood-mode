/* =========================================================
 * Cardápio Digital — script principal
 * Configure abaixo a URL da API e o número do WhatsApp.
 * ========================================================= */
const CONFIG = {
  // Substitua pela URL do seu Google Apps Script Web App.
  API_URL: "",
  // Número do WhatsApp com DDI (somente dígitos). Ex: 5511999999999
  WHATSAPP: "5511999999999",
  STORAGE_KEY: "cardapio_cart_v1",
};

// Dados de exemplo (usados quando API_URL está vazia ou falha)
const MOCK_PRODUCTS = [
  { id: 1, nome: "Hambúrguer Artesanal", preco: 28.9, descricao: "Pão brioche, blend 180g, queijo cheddar e bacon crocante.", imagem: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600", categoria: "Hambúrgueres" },
  { id: 2, nome: "X-Bacon Duplo", preco: 34.5, descricao: "Dois blends, queijo prato, bacon duplo e molho da casa.", imagem: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600", categoria: "Hambúrgueres" },
  { id: 3, nome: "Cheese Salad", preco: 26.0, descricao: "Blend 150g, alface americana, tomate e cheddar derretido.", imagem: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600", categoria: "Hambúrgueres" },
  { id: 4, nome: "Pizza Margherita", preco: 49.9, descricao: "Molho de tomate, muçarela de búfala e manjericão fresco.", imagem: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=600", categoria: "Pizzas" },
  { id: 5, nome: "Pizza Calabresa", preco: 52.0, descricao: "Calabresa fatiada, cebola roxa e azeitonas pretas.", imagem: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600", categoria: "Pizzas" },
  { id: 6, nome: "Batata Frita Grande", preco: 18.0, descricao: "Porção generosa, crocante por fora e macia por dentro.", imagem: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600", categoria: "Acompanhamentos" },
  { id: 7, nome: "Onion Rings", preco: 16.5, descricao: "Anéis de cebola empanados, servidos com molho especial.", imagem: "https://images.unsplash.com/photo-1639024471283-03518883512d?w=600", categoria: "Acompanhamentos" },
  { id: 8, nome: "Coca-Cola 350ml", preco: 7.0, descricao: "Lata gelada 350ml.", imagem: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600", categoria: "Bebidas" },
  { id: 9, nome: "Suco Natural Laranja", preco: 9.5, descricao: "500ml de suco natural feito na hora.", imagem: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600", categoria: "Bebidas" },
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

// Normaliza dados (aceita campos com/sem acento)
function normalize(arr) {
  return arr.map((p) => ({
    id: String(p.id ?? p.ID ?? Math.random()),
    nome: p.nome ?? p.Nome ?? "Sem nome",
    preco: Number(p.preco ?? p["preço"] ?? p.Preco ?? p.Preço ?? 0),
    descricao: p.descricao ?? p["descrição"] ?? p.Descricao ?? "",
    imagem: p.imagem ?? p.Imagem ?? "",
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
