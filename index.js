require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Enable CORS for all origins (adjust if you want to restrict to specific domain)
app.use(cors());

// Enable JSON body parsing
app.use(express.json());

// Load sensitive data from .env
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;

// ISO 20022-compliant coins only
const ALLOWED_COINS = ['xrp', 'xlm', 'algo', 'xdc'];

app.post('/create-invoice', async (req, res) => {
  const { amount, currency, orderId } = req.body;

  // Validate required fields
  if (!amount || !currency) {
    return res.status(400).json({ error: 'Missing required fields: amount and currency' });
  }

  // Check if currency is allowed
  const currencyLower = currency.toLowerCase();
  if (!ALLOWED_COINS.includes(currencyLower)) {
    return res.status(400).json({ error: 'Currency not supported (must be ISO 20022: xrp, xlm, algo, xdc)' });
  }

  try {
    const response = await axios.post('https://api.nowpayments.io/v1/invoice', {
      price_amount: amount,
      price_currency: 'usd',
      pay_currency: currencyLower,
      order_id: orderId || `order-${Date.now()}`,
      ipn_callback_url: `https://${SHOPIFY_STORE_DOMAIN}/payment-notification`
    }, {
      headers: {
        'x-api-key': NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    res.json({ invoice_url: response.data.invoice_url });
  } catch (err) {
    console.error('Invoice creation failed:', err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create invoice.' });
  }
});

// Handle IPN (Instant Payment Notification) callbacks from NOWPayments
app.post('/payment-notification', (req, res) => {
  console.log('Received NOWPayments notification:', req.body);
  res.status(200).send('OK');
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Crypto Gateway running at http://localhost:${PORT}`);
});
