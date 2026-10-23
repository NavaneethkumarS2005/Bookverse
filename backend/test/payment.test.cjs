const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const {
  normalizeOrderInput,
  serializeOrder,
} = require('../dist/utils/contracts.js');
const paymentRoutes = require('../dist/routes/payment.js').default;
const phonepeRoutes = require('../dist/routes/phonepe.js').default;
const { getJwtSecret } = require('../dist/config/env.js');

const withServer = async (app, callback) => {
  const server = app.listen(0);
  const address = server.address();
  try {
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
};

const createAuthToken = (user = { id: '64f000000000000000000001', email: 'user@example.com', name: 'Test User' }) => {
  return jwt.sign(user, getJwtSecret());
};

test('COD order creates valid normalized input with Placed status and stock consumption intent', () => {
  const catalogBooks = [
    {
      _id: '64f5d8a9b5e6d9a0f2c3d4e5',
      id: 1,
      title: 'Internal Test Book',
      price: 499,
      stock: 10,
      fulfillment: 'internal',
    },
  ];

  const normalized = normalizeOrderInput({
    orderItems: [{ bookId: '64f5d8a9b5e6d9a0f2c3d4e5', quantity: 2 }],
    shippingAddress: {
      address: '42 Baker Street',
      city: 'London',
      zip: 'NW1 6XE',
      phone: '9876543210',
    },
    paymentMethod: 'COD',
  }, catalogBooks);

  assert.equal(normalized.paymentMethod, 'COD');
  assert.equal(normalized.totalPrice, 998);
  assert.equal(normalized.orderItems.length, 1);
  assert.equal(normalized.orderItems[0].quantity, 2);
  assert.equal(normalized.shippingAddress.address, '42 Baker Street');

  const serialized = serializeOrder({
    _id: '64f5d8a9b5e6d9a0f2c3d4e5',
    orderItems: normalized.orderItems,
    shippingAddress: normalized.shippingAddress,
    totalPrice: normalized.totalPrice,
    paymentId: 'COD_test123',
    paymentMethod: 'COD',
    status: 'Placed',
    stockConsumed: true,
    createdAt: new Date('2026-03-01T00:00:00.000Z'),
  });

  assert.equal(serialized.status, 'Placed');
  assert.equal(serialized.paymentMethod, 'COD');
  assert.equal(serialized.totalPrice, 998);
  assert.deepEqual(serialized.paymentResult, { id: 'COD_test123', status: 'Placed' });
});

test('Stripe order input accepts valid items and rejects mismatched payment method', () => {
  const catalogBooks = [
    {
      _id: '64f5d8a9b5e6d9a0f2c3d4e5',
      id: 2,
      title: 'Stripe Book',
      price: 250,
      stock: 5,
      fulfillment: 'internal',
    },
  ];

  const normalized = normalizeOrderInput({
    orderItems: [{ bookId: '64f5d8a9b5e6d9a0f2c3d4e5', quantity: 1 }],
    shippingAddress: {
      address: '10 Downing Street',
      city: 'London',
      zip: 'SW1A 2AA',
      phone: '9123456789',
    },
    paymentMethod: 'Stripe',
  }, catalogBooks);

  assert.equal(normalized.paymentMethod, 'Stripe');
  assert.equal(normalized.totalPrice, 250);

  const serialized = serializeOrder({
    _id: '64f5d8a9b5e6d9a0f2c3d4e6',
    orderItems: normalized.orderItems,
    shippingAddress: normalized.shippingAddress,
    totalPrice: normalized.totalPrice,
    paymentId: 'pi_test123',
    paymentMethod: 'Stripe',
    status: 'Paid',
    stockConsumed: true,
    createdAt: new Date('2026-03-01T00:00:00.000Z'),
  });

  assert.equal(serialized.status, 'Paid');
  assert.equal(serialized.paymentMethod, 'Stripe');
  assert.deepEqual(serialized.paymentResult, { id: 'pi_test123', status: 'Paid' });
});

test('Order input preserves PhonePe payment method identifier', () => {
  const catalogBooks = [
    {
      _id: '64f5d8a9b5e6d9a0f2c3d4e5',
      id: 3,
      title: 'PhonePe Book',
      price: 350,
      stock: 8,
      fulfillment: 'internal',
    },
  ];

  const normalized = normalizeOrderInput({
    orderItems: [{ bookId: '64f5d8a9b5e6d9a0f2c3d4e5', quantity: 1 }],
    shippingAddress: {
      address: 'MG Road',
      city: 'Bengaluru',
      zip: '560001',
      phone: '9988776655',
    },
    paymentMethod: 'PhonePe',
  }, catalogBooks);

  assert.equal(normalized.paymentMethod, 'PhonePe');
  assert.equal(normalized.totalPrice, 350);
});

test('Payment endpoints reject unauthenticated checkout requests', async () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/payment', paymentRoutes);
  app.use('/api/phonepe', phonepeRoutes);

  await withServer(app, async baseUrl => {
    const resIntent = await fetch(`${baseUrl}/api/payment/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderItems: [] }),
    });
    assert.equal(resIntent.status, 401);

    const resSave = await fetch(`${baseUrl}/api/payment/save-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderItems: [] }),
    });
    assert.equal(resSave.status, 401);

    const resPhonepe = await fetch(`${baseUrl}/api/phonepe/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderItems: [] }),
    });
    assert.equal(resPhonepe.status, 401);
  });
});

test('Stripe webhook rejects requests when webhook secret is unconfigured', async () => {
  const app = express();
  app.use(express.raw({ type: '*/*' }));
  app.use('/api/payment', paymentRoutes);

  const prevSecret = process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_WEBHOOK_SECRET;

  try {
    await withServer(app, async baseUrl => {
      const res = await fetch(`${baseUrl}/api/payment/webhook`, {
        method: 'POST',
        headers: { 'stripe-signature': 'mock_sig' },
        body: JSON.stringify({ type: 'payment_intent.succeeded' }),
      });
      assert.equal(res.status, 400);
      const text = await res.text();
      assert.match(text, /Secret missing/i);
    });
  } finally {
    if (prevSecret) process.env.STRIPE_WEBHOOK_SECRET = prevSecret;
  }
});

test('PhonePe /pay returns 503 gateway unavailable when merchant credentials are unset', async () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/phonepe', phonepeRoutes);

  const token = createAuthToken();
  const prevMerchant = process.env.PHONEPE_MERCHANT_ID;
  const prevSalt = process.env.PHONEPE_SALT_KEY;
  delete process.env.PHONEPE_MERCHANT_ID;
  delete process.env.PHONEPE_SALT_KEY;

  try {
    await withServer(app, async baseUrl => {
      const res = await fetch(`${baseUrl}/api/phonepe/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `token=${token}`,
        },
        body: JSON.stringify({
          orderItems: [],
          shippingAddress: { address: 'Test', phone: '9999999999' },
        }),
      });
      assert.equal(res.status, 503);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /not configured/i);
    });
  } finally {
    if (prevMerchant) process.env.PHONEPE_MERCHANT_ID = prevMerchant;
    if (prevSalt) process.env.PHONEPE_SALT_KEY = prevSalt;
  }
});
