require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const https   = require('https');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({ origin: '*' }));

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-000',
});

// ─── Health check ───────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'mezherBurgers server corriendo', port: PORT });
});

// ─── Crear preferencia de pago ──────────────────────────────
app.post('/create-preference', async (req, res) => {
  const { items, payer } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'El carrito está vacío' });
  }

  try {
    const preference = new Preference(client);
    const isLocal = !process.env.FRONTEND_URL ||
      process.env.FRONTEND_URL.includes('localhost') ||
      process.env.FRONTEND_URL.includes('127.0.0.1');

    const body = {
      items: items.map(item => ({
        id:         item.id,
        title:      item.title,
        quantity:   Number(item.quantity),
        unit_price: Number(item.unit_price),
        currency_id: 'ARS',
      })),
      payer: {
        name:  payer?.name  || '',
        email: payer?.email || 'comprador@test.com',
        phone: { number: payer?.phone || '' },
      },
      // Metadata del pedido para el webhook
      metadata: {
        buyer_name:    payer?.name    || '',
        buyer_phone:   payer?.phone   || '',
        buyer_address: payer?.address || '',
        buyer_notes:   payer?.notes   || '',
      },
      statement_descriptor: 'mezherBurgers',
      // back_urls solo en producción (requieren URL pública)
      ...(!isLocal && {
        back_urls: {
          success: `${process.env.FRONTEND_URL}/index.html?pago=exitoso`,
          failure: `${process.env.FRONTEND_URL}/index.html?pago=error`,
          pending: `${process.env.FRONTEND_URL}/index.html?pago=pendiente`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.BACKEND_URL}/webhook`,
      }),
    };

    const result = await preference.create({ body });

    res.json({
      id:                 result.id,
      init_point:         result.init_point,
      sandbox_init_point: result.sandbox_init_point,
    });
  } catch (error) {
    console.error('Error MP:', error?.message || error);
    res.status(500).json({ error: 'Error al crear la preferencia de pago' });
  }
});

// ─── Webhook de MercadoPago ─────────────────────────────────
app.post('/webhook', async (req, res) => {
  const { type, data } = req.body;
  res.sendStatus(200); // Responder rápido a MP

  if (type !== 'payment') return;

  try {
    const payment = new Payment(client);
    const info    = await payment.get({ id: data.id });

    if (info.status !== 'approved') return;

    const meta  = info.metadata || {};
    const items = info.additional_info?.items || [];
    const total = info.transaction_amount;

    const itemsList = items.map(i => `• ${i.title} x${i.quantity}`).join('\n');

    const mensaje = [
      '🍔 *NUEVO PEDIDO PAGADO — mezherBurgers*',
      '',
      `👤 *Cliente:* ${meta.buyer_name || 'N/A'}`,
      `📞 *Teléfono:* ${meta.buyer_phone || 'N/A'}`,
      `📍 *Dirección:* ${meta.buyer_address || 'N/A'}`,
      meta.buyer_notes ? `📝 *Notas:* ${meta.buyer_notes}` : '',
      '',
      '*Pedido:*',
      itemsList,
      '',
      `💰 *Total:* $${total?.toLocaleString('es-AR')}`,
      `🆔 *ID pago:* ${info.id}`,
    ].filter(Boolean).join('\n');

    await sendWhatsApp(mensaje);
    console.log('✅ Notificación WhatsApp enviada para pago:', info.id);

  } catch (err) {
    console.error('Error webhook:', err?.message || err);
  }
});

// ─── Enviar WhatsApp via CallMeBot ──────────────────────────
// Setup: agregá +34 603 21 25 97 a tus contactos de WA y mandá
// "I allow callmebot to send me messages" — recibirás tu apikey
function sendWhatsApp(message) {
  return new Promise((resolve, reject) => {
    const phone  = process.env.WA_PHONE   || '';   // Tu número: 549XXXXXXXXXX
    const apiKey = process.env.WA_APIKEY  || '';   // Tu apikey de callmebot

    if (!phone || !apiKey) {
      console.log('⚠️  WhatsApp no configurado (WA_PHONE / WA_APIKEY en .env)');
      return resolve();
    }

    const encoded = encodeURIComponent(message);
    const url     = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encoded}&apikey=${apiKey}`;

    https.get(url, (res) => {
      res.on('data', () => {});
      res.on('end', resolve);
    }).on('error', reject);
  });
}

app.listen(PORT, () => {
  console.log(`\n🍔 mezherBurgers server corriendo en http://localhost:${PORT}`);
  console.log(`   MP Token:   ${process.env.MP_ACCESS_TOKEN ? '✅' : '❌ falta .env'}`);
  console.log(`   WhatsApp:   ${process.env.WA_PHONE ? '✅' : '⚠️  no configurado (opcional)'}\n`);
});
