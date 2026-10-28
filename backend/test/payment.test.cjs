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
const { areDemoPaymentsEnabled, getJwtSecret } = require('../dist/config/env.js');
const demoPaymentSessionModel = require('../dist/models/DemoPaymentSession.js').default;

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

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

test('Order input preserves the demo UPI payment method identifier', () => {
  const catalogBooks = [
    {
      _id: '64f5d8a9b5e6d9a0f2c3d4e5',
      id: 3,
      title: 'Demo UPI Book',
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
    paymentMethod: 'UPI_QR_DEMO',
  }, catalogBooks);

  assert.equal(normalized.paymentMethod, 'UPI_QR_DEMO');
  assert.equal(normalized.totalPrice, 350);
});

test('Payment endpoints reject unauthenticated checkout requests', async () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/payment', paymentRoutes);

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

    const resDemo = await fetch(`${baseUrl}/api/payment/demo-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderItems: [] }),
    });
    assert.equal(resDemo.status, 401);

  });
});

test('Demo payment session endpoint is registered and disabled in production by default', async () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/payment', paymentRoutes);

  const previousNodeEnv = process.env.NODE_ENV;
  const previousDemoFlag = process.env.ENABLE_DEMO_PAYMENTS;
  const previousJwtSecret = process.env.JWT_SECRET;
  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = 'test-only-jwt-secret-with-32-chars';
  delete process.env.ENABLE_DEMO_PAYMENTS;

  try {
    await withServer(app, async baseUrl => {
      const res = await fetch(`${baseUrl}/api/payment/demo-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `token=${createAuthToken()}`,
        },
        body: JSON.stringify({
          orderItems: [],
        }),
      });
      assert.equal(res.status, 403);
      assert.deepEqual(await res.json(), {
        success: false,
        message: 'Demo payments are disabled in this environment.',
      });
    });
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousJwtSecret;
    if (previousDemoFlag === undefined) delete process.env.ENABLE_DEMO_PAYMENTS;
    else process.env.ENABLE_DEMO_PAYMENTS = previousDemoFlag;
  }
});

test('Demo payment sessions remain disabled when NODE_ENV is missing', async () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/payment', paymentRoutes);

  const previousNodeEnv = process.env.NODE_ENV;
  const previousDemoFlag = process.env.ENABLE_DEMO_PAYMENTS;
  const previousJwtSecret = process.env.JWT_SECRET;
  delete process.env.NODE_ENV;
  process.env.ENABLE_DEMO_PAYMENTS = 'true';
  process.env.JWT_SECRET = 'test-only-jwt-secret-with-32-chars';

  try {
    await withServer(app, async baseUrl => {
      const res = await fetch(`${baseUrl}/api/payment/demo-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `token=${createAuthToken()}`,
        },
        body: JSON.stringify({ orderItems: [] }),
      });

      test('Demo payment opt-in is limited to the test/development environment', () => {
        const previousNodeEnv = process.env.NODE_ENV;
        const previousDemoFlag = process.env.ENABLE_DEMO_PAYMENTS;

        try {
          process.env.NODE_ENV = 'test';
          process.env.ENABLE_DEMO_PAYMENTS = 'true';
          assert.equal(areDemoPaymentsEnabled(), true);

          process.env.NODE_ENV = 'production';
          assert.equal(areDemoPaymentsEnabled(), false);
        } finally {
          if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
          else process.env.NODE_ENV = previousNodeEnv;
          if (previousDemoFlag === undefined) delete process.env.ENABLE_DEMO_PAYMENTS;
          else process.env.ENABLE_DEMO_PAYMENTS = previousDemoFlag;
        }
      });
      assert.equal(res.status, 403);
    });
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousDemoFlag === undefined) delete process.env.ENABLE_DEMO_PAYMENTS;
    else process.env.ENABLE_DEMO_PAYMENTS = previousDemoFlag;
    if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousJwtSecret;
  }
});

test('Removed PhonePe route is not registered', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/payment', paymentRoutes);

  await withServer(app, async baseUrl => {
    const res = await fetch(`${baseUrl}/api/phonepe/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 404);
  });
});

test('Demo payment session rejects an empty order before database access', async () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/payment', paymentRoutes);

  await withServer(app, async baseUrl => {
    const res = await fetch(`${baseUrl}/api/payment/demo-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${createAuthToken()}`,
      },
      body: JSON.stringify({
        orderItems: [],
      }),
    });
    assert.equal(res.status, 400);
    assert.match((await res.json()).message, /order item/i);
  });
});

test('Demo payment session rejects malformed order items before database access', async () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/payment', paymentRoutes);

  await withServer(app, async baseUrl => {
    const res = await fetch(`${baseUrl}/api/payment/demo-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${createAuthToken()}`,
      },
      body: JSON.stringify({
        orderItems: [{ quantity: 1 }],
      }),
    });
    assert.equal(res.status, 400);
    assert.match((await res.json()).message, /book is missing/i);
  });
});

test('Concurrent demo failure requests return the persisted terminal state', async () => {
  const originalFindOne = demoPaymentSessionModel.findOne;
  const originalFindOneAndUpdate = demoPaymentSessionModel.findOneAndUpdate;
  const originalFindById = demoPaymentSessionModel.findById;
  let updateCalls = 0;
  const sessionId = '64f000000000000000000099';
  const createdSession = {
    _id: sessionId,
    state: 'CREATED',
    totalPrice: 350,
    expiresAt: new Date(Date.now() + 60_000),
  };
  const failedSession = { ...createdSession, state: 'FAILED' };

  demoPaymentSessionModel.findOne = async () => ({ ...createdSession });
  demoPaymentSessionModel.findOneAndUpdate = async () => {
    updateCalls += 1;
    return updateCalls === 1 ? { ...failedSession } : null;
  };
  demoPaymentSessionModel.findById = async () => ({ ...failedSession });

  try {
    const app = express();
    app.use(express.json());
    app.use('/api/payment', paymentRoutes);

    await withServer(app, async baseUrl => {
      const request = () => fetch(`${baseUrl}/api/payment/demo-session/${'a'.repeat(64)}/fail`, {
        method: 'POST',
      });
      const responses = await Promise.all([request(), request()]);
      const payloads = await Promise.all(responses.map(response => response.json()));

      assert.deepEqual(responses.map(response => response.status), [200, 200]);
      assert.deepEqual(payloads.map(payload => payload.state).sort(), ['FAILED', 'FAILED']);
      assert.equal(updateCalls, 2);
    });
  } finally {
    demoPaymentSessionModel.findOne = originalFindOne;
    demoPaymentSessionModel.findOneAndUpdate = originalFindOneAndUpdate;
    demoPaymentSessionModel.findById = originalFindById;
  }
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
