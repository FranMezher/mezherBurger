const https = require('https');
const { MercadoPagoConfig, Payment } = require('mercadopago');

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  res.status(200).end(); // Responder rápido a MP

  const { type, data } = req.body;
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
  } catch (err) {
    console.error('Error webhook:', err?.message || err);
  }
};

function sendWhatsApp(message) {
  return new Promise((resolve) => {
    const phone  = process.env.WA_PHONE  || '';
    const apiKey = process.env.WA_APIKEY || '';
    if (!phone || !apiKey) return resolve();

    const encoded = encodeURIComponent(message);
    const url     = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encoded}&apikey=${apiKey}`;
    https.get(url, (r) => { r.on('data', () => {}); r.on('end', resolve); }).on('error', resolve);
  });
}
