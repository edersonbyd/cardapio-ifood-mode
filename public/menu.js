/* =========================================================
 * Cardápio Digital — script principal
 * ========================================================= */
const CONFIG = {
  SHEET_ID: "1yELWMHl4AMWPbiLrJqIQ9C08zCOdruUQysWl4gu5cjQ",
  SHEET_NAME: "Cardapio",
  API_URL: "/api/menu",
  WHATSAPP: "5598984940944",
  STORAGE_KEY: "cardapio_cart_v1",
};

const MOCK_PRODUCTS = [
  { id: 1, nome: "Bolo Vulcão", preco: 28.9, descricao: "Ninho", imagem: "/imagens/logo-amanda.jpeg", categoria: "Bolos e Tortas" },
  { id: 2, nome: "Bolo Vulcão", preco: 34.5, descricao: "Chocolate", imagem: "/imagens/bolo-vulcao.jpeg", categoria: "Bolos e Tortas" },
  { id: 7, nome: "Caseirinho", preco: 49.9, descricao: "Chocolate", imagem: "/imagens/caseirinho.jpeg", categoria: "Doces Finos" },
  { id: 28, nome: "Coca-Cola 350ml", preco: 7.0, descricao: "Lata 350ml.", imagem: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600", categoria: "Bebidas" },
];

// Estado
let products = [];
let cart = loadCart();
let activeCategory = "Todos";
let deliveryMethod = "retirar"; // retirar | delivery
let paymentMethod = "PIX";

// DOM refs
const $ = (sel) => document.querySelector(sel);
const productsEl = $("#products");
const statusEl = $("#status");
const categoriesEl = $("#categories");
const cartCount = $("#cart-count");
const drawerCount = $("#drawer-count");
const cartItemsEl = $("#cart-items");
const cartTotalEl = $("#cart-total");
const cartSubtotalEl = $("#cart-subtotal");
const drawer = $("#cart-drawer");
const overlay = $("#overlay");
const toastEl = $("#toast");
const cartBtn = $("#cart-btn");

init();

async function init() {
  bindEvents();
  updateCartUI();
  await loadProducts();
}

function bindEvents() {
  cartBtn.addEventListener("click", openCart);
  $("#close-cart").addEventListener("click", closeCart);
  overlay.addEventListener("click", closeCart);
  $("#checkout-btn").addEventListener("click", checkout);

  $("#delivery-group").querySelectorAll(".opt-card").forEach((b) => {
    b.addEventListener("click", () => {
      deliveryMethod = b.dataset.delivery;
      $("#delivery-group").querySelectorAll(".opt-card").forEach((x) => x.classList.toggle("active", x === b));
    });
  });
  $("#payment-group").querySelectorAll(".opt-card").forEach((b) => {
    b.addEventListener("click", () => {
      paymentMethod = b.dataset.payment;
      $("#payment-group").querySelectorAll(".opt-card").forEach((x) => x.classList.toggle("active", x === b));
    });
  });
  // estado inicial visual
  const defaultPay = $('#payment-group .opt-card[data-payment="PIX"]');
  if (defaultPay) defaultPay.classList.add("active");
}

// ====== Carregamento de produtos ======
async function loadProducts() {
  showStatus(`<div class="spinner"></div><p style="margin-top:10px">Carregando cardápio...</p>`);
  try {
    let data = null;
    if (CONFIG.API_URL) {
      try {
        const res = await fetch(CONFIG.API_URL, { headers: { Accept: "application/json" } });
        if (res.ok) {
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("application/json")) data = await res.json();
        }
      } catch (_) {}
    }
    if (!data && CONFIG.SHEET_ID) {
      data = await fetchSheetAsCsv(CONFIG.SHEET_ID, CONFIG.SHEET_NAME);
    }
    if (!data || !data.length) throw new Error("Sem dados");
    products = normalize(data);
    statusEl.innerHTML = "";
    renderCategories();
    renderProducts();
  } catch (err) {
    console.error("Falha ao carregar cardápio:", err);
    showStatus(`<p style="color:var(--primary)">⚠️ Não foi possível carregar o cardápio da planilha.</p>
      <p style="font-size:13px;margin-top:6px">Exibindo itens de demonstração.</p>`);
    products = normalize(MOCK_PRODUCTS);
    renderCategories();
    renderProducts();
  }
}

async function fetchSheetAsCsv(sheetId, sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("CSV HTTP " + res.status);
  return parseCsv(await res.text());
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cell += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (c === "\r") {}
      else cell += c;
    }
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1)
    .filter((r) => r.some((c) => String(c).trim() !== ""))
    .map((r) => {
      const obj = {};
      headers.forEach((h, i) => {
        let val = r[i] ?? "";
        if (h === "preco" || h === "preço") {
          const n = Number(String(val).replace(",", "."));
          val = isNaN(n) ? 0 : n;
        }
        obj[h] = val;
      });
      return obj;
    });
}

function resolveImageUrl(url) {
  if (!url) return "";
  const s = String(url).trim();
  let m = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w800`;
  m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w800`;
  return s;
}

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

function showStatus(html) { statusEl.innerHTML = html; }

// ====== Renderização ======
function renderCategories() {
  const cats = ["Todos", ...new Set(products.map((p) => p.categoria))];
  categoriesEl.innerHTML = cats
    .map((c) => `<button class="chip ${c === activeCategory ? "active" : ""}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`)
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
  const list = activeCategory === "Todos" ? products : products.filter((p) => p.categoria === activeCategory);
  if (!list.length) {
    productsEl.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px">Nenhum produto encontrado.</p>`;
    return;
  }
  productsEl.innerHTML = list
    .map((p) => `
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
    </article>`).join("");
  productsEl.querySelectorAll(".btn-add").forEach((b) => {
    b.addEventListener("click", () => addToCart(b.dataset.id));
  });
}

// ====== Carrinho ======
function loadCart() {
  try { return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY)) || []; } catch { return []; }
}
function saveCart() { localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(cart)); }

function addToCart(id) {
  const product = products.find((p) => String(p.id) === String(id));
  if (!product) return;
  const existing = cart.find((i) => String(i.id) === String(id));
  if (existing) existing.qty += 1;
  else cart.push({ id: product.id, nome: product.nome, preco: product.preco, imagem: product.imagem, qty: 1 });
  saveCart();
  updateCartUI();
  cartBtn.classList.remove("bump");
  void cartBtn.offsetWidth;
  cartBtn.classList.add("bump");
  openCart();
  toast(`${product.nome} adicionado!`);
}

function changeQty(id, delta) {
  const item = cart.find((i) => String(i.id) === String(id));
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) return removeItem(id);
  saveCart();
  updateCartUI();
}

function removeItem(id) {
  const node = cartItemsEl.querySelector(`[data-row="${CSS.escape(String(id))}"]`);
  if (node) {
    node.classList.add("removing");
    setTimeout(() => {
      cart = cart.filter((i) => String(i.id) !== String(id));
      saveCart();
      updateCartUI();
    }, 220);
  } else {
    cart = cart.filter((i) => String(i.id) !== String(id));
    saveCart();
    updateCartUI();
  }
}

function updateCartUI() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  cartCount.textContent = count;
  if (drawerCount) drawerCount.textContent = count;
  const total = cart.reduce((s, i) => s + i.qty * i.preco, 0);
  cartTotalEl.textContent = formatBRL(total);
  if (cartSubtotalEl) cartSubtotalEl.textContent = formatBRL(total);

  if (!cart.length) {
    cartItemsEl.innerHTML = `
      <div class="cart-empty">
        <div class="empty-ico">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
            <path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </div>
        <div>
          <p style="font-weight:600;color:var(--text)">Sua sacola está vazia</p>
          <p style="font-size:13px;margin-top:4px">Adicione itens do cardápio para começar</p>
        </div>
      </div>`;
    $("#checkout-btn").disabled = true;
    return;
  }
  $("#checkout-btn").disabled = false;

  cartItemsEl.innerHTML = cart
    .map((i) => `
    <div class="cart-item" data-row="${escapeHtml(i.id)}">
      <img src="${escapeHtml(i.imagem)}" alt="${escapeHtml(i.nome)}" onerror="this.src='https://via.placeholder.com/64'"/>
      <div class="cart-item-info">
        <div class="ci-head">
          <h4 class="ci-name">${escapeHtml(i.nome)}</h4>
          <button class="ci-remove" data-act="rm" data-id="${escapeHtml(i.id)}" aria-label="Remover">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
        <div class="ci-unit">${formatBRL(i.preco)} cada</div>
        <div class="ci-bottom">
          <div class="qty">
            <button data-act="dec" data-id="${escapeHtml(i.id)}" aria-label="Diminuir">−</button>
            <span>${i.qty}</span>
            <button data-act="inc" data-id="${escapeHtml(i.id)}" aria-label="Aumentar">+</button>
          </div>
          <div class="ci-subtotal">${formatBRL(i.preco * i.qty)}</div>
        </div>
      </div>
    </div>`).join("");

  cartItemsEl.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (btn.dataset.act === "inc") changeQty(id, 1);
      if (btn.dataset.act === "dec") changeQty(id, -1);
      if (btn.dataset.act === "rm") removeItem(id);
    });
  });
}

function isDesktop() { return window.matchMedia("(min-width: 901px)").matches; }
function openCart() {
  drawer.classList.add("open");
  document.body.classList.add("drawer-open");
  return;
}
function _openCartLegacy() {
  drawer.classList.add("open");
  document.body.classList.add("drawer-open");
  if (!isDesktop()) overlay.classList.add("show");
}
function closeCart() {
  drawer.classList.remove("open");
  document.body.classList.remove("drawer-open");
  overlay.classList.remove("show");
}

// ====== Checkout WhatsApp ======
function checkout() {
  if (!cart.length) return;
  const lines = cart.map((i) => `• ${i.nome} x${i.qty} — ${formatBRL(i.preco * i.qty)}`);
  const total = cart.reduce((s, i) => s + i.qty * i.preco, 0);
  const entrega = deliveryMethod === "delivery" ? "Delivery" : "Retirar no estabelecimento";

  let msg = `*Novo Pedido* 🛍️\n\n${lines.join("\n")}\n\n💰 *Total: ${formatBRL(total)}*\n\n📦 Entrega: ${entrega}\n💳 Pagamento: ${paymentMethod}`;
  if (deliveryMethod === "delivery") {
    msg += `\n\n📍 Por favor, informe o endereço de entrega para que o atendente continue seu pedido.`;
  }
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
