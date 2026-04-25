require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors({ origin: '*' }));

// MercadoPago client — se configura cuando tengamos el token real
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-000',
});

// ─── Health check ──────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'mezherBurgers server corriendo', port: PORT });
});

// ─── Crear preferencia de pago ─────────────────────────────
// Body esperado: { items: [{ id, title, quantity, unit_price }], payer: { email } }
app.post('/create-preference', async (req, res) => {
  const { items, payer } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'El carrito está vacío' });
  }

  try {
    const preference = new Preference(client);

    const body = {
      items: items.map(item => ({
        id: item.id,
        title: item.title,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        currency_id: 'ARS',
      })),
      payer: {
        email: payer?.email || 'test@test.com',
      },
      // auto_return requiere URLs públicas — solo se activa en producción
      ...(process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost') && !process.env.FRONTEND_URL.includes('127.0.0.1') ? {
        back_urls: {
          success: `${process.env.FRONTEND_URL}/index.html?pago=exitoso`,
          failure: `${process.env.FRONTEND_URL}/index.html?pago=error`,
          pending: `${process.env.FRONTEND_URL}/index.html?pago=pendiente`,
        },
        auto_return: 'approved',
      } : {}),
      statement_descriptor: 'mezherBurgers',
    };

    const result = await preference.create({ body });

    res.json({
      id: result.id,
      init_point: result.init_point,         // URL producción
      sandbox_init_point: result.sandbox_init_point, // URL sandbox (pruebas)
    });
  } catch (error) {
    console.error('Error MP:', error);
    res.status(500).json({ error: 'Error al crear la preferencia de pago' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🍔 mezherBurgers server corriendo en http://localhost:${PORT}`);
  console.log(`   MP Token configurado: ${process.env.MP_ACCESS_TOKEN ? '✅' : '❌ (falta .env)'}\n`);
});
