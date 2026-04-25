// ─── Estado del carrito ────────────────────────────────────
const MENU = {
  'og-smash': { id: 'og-smash', title: 'THE OG SMASH', unit_price: 2800, description: 'Doble smash, cheddar, panceta, cebolla, pickles, tomate, lechuga, salsa mezher' },
  'rebel-crispy': { id: 'rebel-crispy', title: 'REBEL CRISPY', unit_price: 2500, description: 'Pollo crispy, coleslaw de lima, jalapeños, mayo de chipotle' },
  'black-metal': { id: 'black-metal', title: 'BLACK METAL', unit_price: 3200, description: 'Triple smash, bacon, queso azul, cebolla crispy, rúcula, mostaza Dijon' },
};

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
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  saveCart();
  renderCart();
  openCart();
  animateCartBadge();
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

// ─── Render ────────────────────────────────────────────────
function renderCart() {
  const badge = document.getElementById('cart-badge');
  const count = getCount();
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);

  const list = document.getElementById('cart-items');
  const emptyMsg = document.getElementById('cart-empty');
  const footer = document.getElementById('cart-footer');
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
        <button onclick="changeQty('${item.id}', -1)"
          class="w-7 h-7 rounded-full border border-white/20 text-brand-cream hover:border-brand-gold hover:text-brand-gold transition-colors text-sm font-bold flex items-center justify-center">−</button>
        <span class="text-brand-cream font-semibold w-4 text-center">${item.quantity}</span>
        <button onclick="changeQty('${item.id}', 1)"
          class="w-7 h-7 rounded-full border border-white/20 text-brand-cream hover:border-brand-gold hover:text-brand-gold transition-colors text-sm font-bold flex items-center justify-center">+</button>
        <button onclick="removeFromCart('${item.id}')"
          class="w-7 h-7 rounded-full border border-white/10 text-brand-cream/30 hover:border-brand-red hover:text-brand-red transition-colors text-sm flex items-center justify-center ml-1">✕</button>
      </div>
    </div>
  `).join('');
}

// ─── Open / Close ──────────────────────────────────────────
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

// ─── Checkout ──────────────────────────────────────────────
async function checkout() {
  if (cart.length === 0) return;

  const btn = document.getElementById('checkout-btn');
  btn.disabled = true;
  btn.textContent = 'Procesando...';

  try {
    const res = await fetch('http://localhost:3000/create-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart,
        payer: { email: 'comprador@test.com' },
      }),
    });

    if (!res.ok) throw new Error('Error del servidor');

    const data = await res.json();
    // En sandbox usamos sandbox_init_point, en producción init_point
    window.location.href = data.sandbox_init_point || data.init_point;

  } catch (err) {
    console.error(err);
    alert('No se pudo conectar con el servidor de pagos. Asegurate que el servidor Node.js está corriendo en localhost:3000');
    btn.disabled = false;
    btn.textContent = 'Pagar ahora';
  }
}

// ─── Feedback de retorno de MP ─────────────────────────────
function checkPaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  const pago = params.get('pago');
  if (!pago) return;

  const messages = {
    exitoso: { text: '¡Pago exitoso! Tu pedido está confirmado 🍔', color: 'bg-green-600' },
    error: { text: 'Hubo un error con el pago. Intentá de nuevo.', color: 'bg-brand-red' },
    pendiente: { text: 'Tu pago está pendiente de acreditación.', color: 'bg-yellow-600' },
  };

  const msg = messages[pago];
  if (!msg) return;

  const toast = document.createElement('div');
  toast.className = `fixed top-24 left-1/2 -translate-x-1/2 z-[200] ${msg.color} text-white font-semibold px-8 py-4 rounded-full shadow-xl transition-opacity duration-500`;
  toast.textContent = msg.text;
  document.body.appendChild(toast);

  if (pago === 'exitoso') {
    cart = [];
    saveCart();
    renderCart();
  }

  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 4000);
  window.history.replaceState({}, '', window.location.pathname);
}

// ─── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderCart();
  checkPaymentReturn();
});
