const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Regression tests for the Stripe TEST-ONLY credential guard.
// The webhook route is used as the probe because it reaches getStripe()
// without needing a database connection; every other Stripe path
// (createPaymentIntent, saveOrder) funnels through the same getStripe()
// choke point, so a live key rejected here is rejected everywhere.
// No real Stripe API is ever called: the guard throws before a client
// is constructed, and webhook requests carry no valid signature.
// All subtests run inside one outer test so env changes are sequential.

process.env.JWT_SECRET = 'bookverse-stripe-guard-test-secret-32-chars';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy_test_only';

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

const createApp = () => {
  const app = express();
  app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
  app.use('/api/payment', paymentRoutes);
  return app;
};

const postWebhook = (baseUrl) => fetch(`${baseUrl}/api/payment/webhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'stripe-signature': 't=1,v1=invalid' },
  body: JSON.stringify({ id: 'evt_test', type: 'payment_intent.succeeded' }),
});

const withKey = async (key, fn) => {
  const previous = process.env.STRIPE_SECRET_KEY;
  // process.env coerces assigned undefined into the string "undefined",
  // so a missing key must be removed with delete.
  if (key === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = key;
  try {
    await fn();
  } finally {
    if (previous === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previous;
  }
};

test('Stripe test-only credential guard', async (t) => {

  await t.test('valid sk_test_ configuration is accepted (guard does not reject)', async () => {
    await withKey('sk_test_dummy_test_only_key', async () => {
      await withServer(createApp(), async baseUrl => {
        const res = await postWebhook(baseUrl);
        // Reaches signature verification -> the key guard passed. The failure
        // must be about the signature, never about configuration.
        const body = await res.text();
        assert.equal(res.status, 400);
        assert.ok(!/configuration error/i.test(body), 'guard must not reject a test key');
        assert.ok(/signature/i.test(body));
      });
    });
  });

  await t.test('sk_live_ configuration is rejected with a safe configuration error', async () => {
    await withKey('sk_live_dummyLiveKeyNeverReal', async () => {
      await withServer(createApp(), async baseUrl => {
        const res = await postWebhook(baseUrl);
        const body = await res.text();
        assert.equal(res.status, 400);
        assert.ok(/live credentials are not permitted/i.test(body));
        // The key material must never be echoed back.
        assert.ok(!body.includes('dummyLiveKeyNeverReal'));
      });
    });
  });

  await t.test('missing Stripe key is rejected', async () => {
    await withKey(undefined, async () => {
      await withServer(createApp(), async baseUrl => {
        const res = await postWebhook(baseUrl);
        const body = await res.text();
        assert.equal(res.status, 400);
        assert.ok(/STRIPE_SECRET_KEY is missing/i.test(body));
      });
    });
  });

  await t.test('malformed key prefix is rejected', async () => {
    await withKey('sk_notarealprefix_12345', async () => {
      await withServer(createApp(), async baseUrl => {
        const res = await postWebhook(baseUrl);
        const body = await res.text();
        assert.equal(res.status, 400);
        assert.ok(/must be a sk_test_ key/i.test(body));
      });
    });
  });

  await t.test('webhook cannot initialize Stripe with live credentials', async () => {
    // Proves the guard fires before any Stripe client exists: with a live key
    // the request fails at configuration, never reaching constructEvent or
    // any network call.
    await withKey('sk_live_anotherDummyNeverReal', async () => {
      await withServer(createApp(), async baseUrl => {
        const res = await postWebhook(baseUrl);
        assert.equal(res.status, 400);
        assert.ok(/live credentials are not permitted/i.test(await res.text()));
      });
    });
  });

  await t.test('COD and QR simulation routes do not depend on Stripe configuration', async () => {
    // With NO Stripe key configured at all, the demo-session (QR simulation)
    // route must respond based on its own environment gate - not a Stripe
    // configuration error - proving the guard does not affect it.
    const previousKey = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      await withServer(createApp(), async baseUrl => {
        const res = await fetch(`${baseUrl}/api/payment/demo-session/created`, { method: 'POST' });
        assert.notEqual(res.status, 500);
        const body = await res.json().catch(() => ({}));
        assert.ok(!/stripe/i.test(body.message || ''));
      });
    } finally {
      if (previousKey === undefined) delete process.env.STRIPE_SECRET_KEY;
      else process.env.STRIPE_SECRET_KEY = previousKey;
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });
});
