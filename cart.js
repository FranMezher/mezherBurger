// ─── URL del backend (auto-detecta local vs producción) ────
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'  // Desarrollo local
  : '';                       // Vercel: rutas relativas /api/...

// ─── Menú completo ─────────────────────────────────────────
const MENU = {
  // Burgers (incluyen papas fritas)
  'og-smash':      { id: 'og-smash',      category: 'burger', title: 'THE OG SMASH',    unit_price: 2800, description: 'Doble smash, cheddar, panceta, cebolla, pickles, tomate, lechuga, salsa mezher · Incluye papas' },
  'rebel-crispy':  { id: 'rebel-crispy',  category: 'burger', title: 'REBEL CRISPY',    unit_price: 2500, description: 'Pollo crispy, coleslaw de lima, jalapeños, mayo de chipotle · Incluye papas' },
  'black-metal':   { id: 'black-metal',   category: 'burger', title: 'BLACK METAL',     unit_price: 3200, description: 'Triple smash, bacon, queso azul, cebolla crispy, rúcula, mostaza Dijon · Incluye papas' },
  'smokey-joe':    { id: 'smokey-joe',    category: 'burger', title: 'SMOKEY JOE',      unit_price: 2900, description: 'Doble smash, cheddar ahumado, bacon BBQ, cebolla caramelizada, mayo de ajo · Incluye papas' },
  'mezher-veggie': { id: 'mezher-veggie', category: 'burger', title: 'MEZHER VEGGIE',   unit_price: 2400, description: 'Burger de garbanzos y remolacha, queso brie, rúcula, tomate seco, alioli · Incluye papas' },

  // Sides
  'papas-simples': { id: 'papas-simples', category: 'side',   title: 'PAPAS FRITAS',   unit_price: 800,  description: 'Papas crocantes con sal gruesa' },
  'papas-cheddar': { id: 'papas-cheddar', category: 'side',   title: 'PAPAS CON CHEDDAR', unit_price: 1100, description: 'Papas fritas bañadas en salsa cheddar y bacon' },
  'onion-rings':   { id: 'onion-rings',   category: 'side',   title: 'ONION RINGS',    unit_price: 950,  description: 'Aros de cebolla rebozados con panko, salsa BBQ' },

  // Bebidas
  'coca-cola':     { id: 'coca-cola',     category: 'drink',  title: 'COCA-COLA',      unit_price: 600,  description: 'Lata 354ml' },
  'agua':          { id: 'agua',          category: 'drink',  title: 'AGUA SIN GAS',   unit_price: 400,  description: 'Botella 500ml' },
  'cerveza-ipa':   { id: 'cerveza-ipa',   category: 'drink',  title: 'CERVEZA IPA',    unit_price: 1200, description: 'Craft IPA 473ml — Basta Brewing' },
  'cerveza-stout': { id: 'cerveza-stout', category: 'drink',  title: 'CERVEZA STOUT',  unit_price: 1200, description: 'Craft Stout 473ml — Basta Brewing' },
  'limonada':      { id: 'limonada',      category: 'drink',  title: 'LIMONADA MEZHER', unit_price: 700, description: 'Limonada exprimida, menta y jengibre' },

  // Combos
  'combo-og':      { id: 'combo-og',      category: 'combo',  title: 'COMBO OG',       unit_price: 3200, description: 'THE OG SMASH + Papas + Bebida a elección' },
  'combo-rebel':   { id: 'combo-rebel',   category: 'combo',  title: 'COMBO REBEL',    unit_price: 2900, description: 'REBEL CRISPY + Papas + Bebida a elección' },
  'combo-metal':   { id: 'combo-metal',   category: 'combo',  title: 'COMBO METAL',    unit_price: 3600, description: 'BLACK METAL + Papas + Bebida a elección' },
};

// ─── Estado del carrito ────────────────────────────────────
let cart = JSON.parse(localStorage.getItem('mezher-cart') || '[]');

function saveCart() {
  localStorage.setItem('mezher-cart', JSON.stringify(cart));
}

function getCartItem(id) {
  return cart.find(i => i.id === id);
}

function addToCart(id) {
  const product = MENU[id];
  if (!product) return;
  const existing = getCartItem(id);
  if (existing) existing.quantity++;
  else cart.push({ ...product, quantity: 1 });
  saveCart();
  renderCart();
  openCart();
  animateCartBadge();
  showAddedToast(product.title);
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  renderCart();
}

function changeQty(id, delta) {
  const item = getCartItem(id);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) removeFromCart(id);
  else { saveCart(); renderCart(); }
}

function getTotal() {
  return cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
}

function getCount() {
  return cart.reduce((sum, i) => sum + i.quantity, 0);
}

// ─── Toast "agregado" ───────────────────────────────────────
function showAddedToast(title) {
  const existing = document.getElementById('added-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'added-toast';
  toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] bg-brand-gold text-brand-black font-semibold px-6 py-3 rounded-full shadow-xl flex items-center gap-2 transition-all duration-300 opacity-0 translate-y-4';
  toast.innerHTML = `<span>✓</span><span>${title} agregado al carrito</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', 'translate-y-4');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-4');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// ─── Render carrito ────────────────────────────────────────
function renderCart() {
  const badge   = document.getElementById('cart-badge');
  const count   = getCount();
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);

  const list    = document.getElementById('cart-items');
  const emptyMsg = document.getElementById('cart-empty');
  const footer  = document.getElementById('cart-footer');
  const totalEl = document.getElementById('cart-total');

  if (cart.length === 0) {
    list.innerHTML = '';
    emptyMsg.classList.remove('hidden');
    footer.classList.add('hidden');
    return;
  }

  emptyMsg.classList.add('hidden');
  footer.classList.remove('hidden');
  totalEl.textContent = `$${getTotal().toLocaleString('es-AR')}`;

  list.innerHTML = cart.map(item => `
    <div class="flex items-start gap-3 py-4 border-b border-white/5">
      <div class="flex-1 min-w-0">
        <p class="font-display tracking-wide text-brand-cream text-lg leading-tight">${item.title}</p>
        <p class="text-brand-cream/40 text-xs mt-0.5 leading-snug">${item.description}</p>
        <p class="text-brand-gold font-semibold mt-1">$${(item.unit_price * item.quantity).toLocaleString('es-AR')}</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button onclick="changeQty('${item.id}', -1)" class="w-7 h-7 rounded-full border border-white/20 text-brand-cream hover:border-brand-gold hover:text-brand-gold transition-colors text-sm font-bold flex items-center justify-center">−</button>
        <span class="text-brand-cream font-semibold w-4 text-center">${item.quantity}</span>
        <button onclick="changeQty('${item.id}', 1)" class="w-7 h-7 rounded-full border border-white/20 text-brand-cream hover:border-brand-gold hover:text-brand-gold transition-colors text-sm font-bold flex items-center justify-center">+</button>
        <button onclick="removeFromCart('${item.id}')" class="w-7 h-7 rounded-full border border-white/10 text-brand-cream/30 hover:border-red-500 hover:text-red-500 transition-colors text-sm flex items-center justify-center ml-1">✕</button>
      </div>
    </div>
  `).join('');
}

// ─── Open / Close carrito ───────────────────────────────────
function openCart() {
  document.getElementById('cart-drawer').classList.remove('translate-x-full');
  document.getElementById('cart-overlay').classList.remove('opacity-0', 'pointer-events-none');
}

function closeCart() {
  document.getElementById('cart-drawer').classList.add('translate-x-full');
  document.getElementById('cart-overlay').classList.add('opacity-0', 'pointer-events-none');
}

function animateCartBadge() {
  const badge = document.getElementById('cart-badge');
  badge.classList.add('scale-125');
  setTimeout(() => badge.classList.remove('scale-125'), 200);
}

// ─── Modal de datos del pedido ─────────────────────────────
function openOrderForm() {
  document.getElementById('order-modal').classList.remove('hidden');
  document.getElementById('order-modal').classList.add('flex');
  closeCart();
}

function closeOrderForm() {
  document.getElementById('order-modal').classList.add('hidden');
  document.getElementById('order-modal').classList.remove('flex');
}

async function submitOrder(e) {
  e.preventDefault();
  const name    = document.getElementById('order-name').value.trim();
  const phone   = document.getElementById('order-phone').value.trim();
  const address = document.getElementById('order-address').value.trim();
  const notes   = document.getElementById('order-notes').value.trim();

  if (!name || !phone || !address) return;

  const btn = document.getElementById('order-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Procesando...';

  try {
    const res = await fetch(`${API_URL}/api/create-preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart,
        payer: { name, phone, address, notes, email: 'comprador@test.com' },
      }),
    });

    if (!res.ok) throw new Error('Error del servidor');
    const data = await res.json();
    window.location.href = data.sandbox_init_point || data.init_point;

  } catch (err) {
    console.error(err);
    alert('No se pudo conectar con el servidor de pagos. Asegurate que el servidor Node.js está corriendo en localhost:3000');
    btn.disabled = false;
    btn.textContent = 'Ir a pagar →';
  }
}

// ─── Feedback de retorno de MP ─────────────────────────────
function checkPaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  const pago   = params.get('pago');
  if (!pago) return;

  const messages = {
    exitoso:   { text: '¡Pago exitoso! Tu pedido está confirmado 🍔', color: 'bg-green-600' },
    error:     { text: 'Hubo un error con el pago. Intentá de nuevo.', color: 'bg-red-600' },
    pendiente: { text: 'Tu pago está pendiente de acreditación.', color: 'bg-yellow-600' },
  };

  const msg = messages[pago];
  if (!msg) return;

  const toast = document.createElement('div');
  toast.className = `fixed top-24 left-1/2 -translate-x-1/2 z-[200] ${msg.color} text-white font-semibold px-8 py-4 rounded-full shadow-xl transition-opacity duration-500`;
  toast.textContent = msg.text;
  document.body.appendChild(toast);

  if (pago === 'exitoso') { cart = []; saveCart(); renderCart(); }

  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 4000);
  window.history.replaceState({}, '', window.location.pathname);
}

// ─── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderCart();
  checkPaymentReturn();
});
