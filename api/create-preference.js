const { MercadoPagoConfig, Preference } = require('mercadopago');

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { items, payer } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'El carrito está vacío' });
  }

  try {
    const preference = new Preference(client);
    const frontendUrl = process.env.FRONTEND_URL || 'https://mezher-burger.vercel.app';

    const body = {
      items: items.map(item => ({
        id:          item.id,
        title:       item.title,
        quantity:    Number(item.quantity),
        unit_price:  Number(item.unit_price),
        currency_id: 'ARS',
      })),
      payer: {
        name:  payer?.name  || '',
        email: payer?.email || 'comprador@test.com',
        phone: { number: payer?.phone || '' },
      },
      metadata: {
        buyer_name:    payer?.name    || '',
        buyer_phone:   payer?.phone   || '',
        buyer_address: payer?.address || '',
        buyer_notes:   payer?.notes   || '',
      },
      back_urls: {
        success: `${frontendUrl}/?pago=exitoso`,
        failure: `${frontendUrl}/?pago=error`,
        pending: `${frontendUrl}/?pago=pendiente`,
      },
      auto_return:          'approved',
      statement_descriptor: 'mezherBurgers',
      notification_url:     `${process.env.BACKEND_URL || frontendUrl}/api/webhook`,
    };

    const result = await preference.create({ body });

    return res.status(200).json({
      id:                 result.id,
      init_point:         result.init_point,
      sandbox_init_point: result.sandbox_init_point,
    });

  } catch (error) {
    console.error('Error MP:', error?.message || error);
    return res.status(500).json({ error: 'Error al crear la preferencia de pago' });
  }
};
