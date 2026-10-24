const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const secret = 'bookverse-demo-test-secret-at-least-32-characters';
process.env.JWT_SECRET = secret;

const paymentRoutes = require('../dist/routes/payment.js').default;

const withServer = async (app, callback) => {
  const server = app.listen(0);
  const address = server.address();
  try {
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
};

const token = () => jwt.sign({
  id: '64f000000000000000000001',
  email: 'demo@example.com',
  name: 'Demo Test User',
}, secret);

const createApp = () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/payment', paymentRoutes);
  return app;
};

test('demo order endpoint rejects unauthenticated requests', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  delete process.env.NODE_ENV;
  try {
    await withServer(createApp(), async baseUrl => {
      const response = await fetch(`${baseUrl}/api/payment/demo-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: 'b3a2f091-41b2-4a9b-a6e3-5f9d1b1b7c21', orderItems: [] }),
      });
      assert.equal(response.status, 401);
    });
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test('demo order endpoint is disabled in production unless explicitly enabled', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousEnable = process.env.ENABLE_DEMO_PAYMENTS;
  process.env.NODE_ENV = 'production';
  delete process.env.ENABLE_DEMO_PAYMENTS;
  try {
    await withServer(createApp(), async baseUrl => {
      const response = await fetch(`${baseUrl}/api/payment/demo-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `token=${token()}`,
        },
        body: JSON.stringify({ requestId: 'b3a2f091-41b2-4a9b-a6e3-5f9d1b1b7c21', orderItems: [] }),
      });
      assert.equal(response.status, 403);
      const data = await response.json();
      assert.equal(data.success, false);
      assert.match(data.message, /disabled/i);
    });
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousEnable === undefined) delete process.env.ENABLE_DEMO_PAYMENTS;
    else process.env.ENABLE_DEMO_PAYMENTS = previousEnable;
  }
});
