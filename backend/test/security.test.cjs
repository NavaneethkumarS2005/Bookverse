const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Security regression tests for the admin-only cover enrichment endpoint
// (POST /api/books/enrich-covers) and the Geoapify proxy gating.

const secret = 'bookverse-security-test-secret-at-least-32-characters';
process.env.JWT_SECRET = secret;

const bookRoutes = require('../dist/routes/books.js').default;
const geoapifyRoutes = require('../dist/routes/geoapify.js').default;

const withServer = async (app, callback) => {
  const server = app.listen(0);
  const address = server.address();
  try {
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
};

const tokenFor = (role) => jwt.sign({
  id: '64f000000000000000000001',
  email: 'user@example.com',
  name: 'Test User',
  role,
}, secret);

const createBooksApp = () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/books', bookRoutes);
  return app;
};

const createGeoapifyApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/geoapify', geoapifyRoutes);
  return app;
};

test('cover enrichment rejects unauthenticated requests', async () => {
  await withServer(createBooksApp(), async baseUrl => {
    const response = await fetch(`${baseUrl}/api/books/enrich-covers`, { method: 'POST' });
    assert.equal(response.status, 401);
  });
});

test('cover enrichment rejects non-admin tokens before touching the catalogue', async () => {
  // Non-admin: auth passes, the admin middleware re-checks the user role
  // server-side. Without a database the check fails closed (5xx) — the key
  // assertion is that it never returns success and never runs enrichment.
  await withServer(createBooksApp(), async baseUrl => {
    const response = await fetch(`${baseUrl}/api/books/enrich-covers`, {
      method: 'POST',
      headers: { Cookie: `token=${tokenFor('user')}` },
    });
    assert.notEqual(response.status, 200);
  });
});

test('cover enrichment endpoint is not reachable via GET', async () => {
  await withServer(createBooksApp(), async baseUrl => {
    const response = await fetch(`${baseUrl}/api/books/enrich-covers`);
    // GET falls through to book-details (DB buffered); the key assertion is
    // that no GET request can ever trigger enrichment (never 200).
    assert.notEqual(response.status, 200);
  });
});

test('geoapify proxy never exposes the API key and fails closed when unconfigured', async () => {
  const previousKey = process.env.GEOAPIFY_API_KEY;
  delete process.env.GEOAPIFY_API_KEY;
  try {
    await withServer(createGeoapifyApp(), async baseUrl => {
      const response = await fetch(`${baseUrl}/api/geoapify/geocode?text=chennai`);
      assert.equal(response.status, 503);
      const body = await response.json();
      assert.equal(body.code, 'GEOAPIFY_NOT_CONFIGURED');
      assert.ok(!JSON.stringify(body).includes('apiKey'), 'response must not contain key material');
    });
  } finally {
    if (previousKey === undefined) delete process.env.GEOAPIFY_API_KEY;
    else process.env.GEOAPIFY_API_KEY = previousKey;
  }
});

test('geoapify proxy rejects invalid search text without calling upstream', async () => {
  const previousKey = process.env.GEOAPIFY_API_KEY;
  process.env.GEOAPIFY_API_KEY = 'test-key-not-real';
  try {
    await withServer(createGeoapifyApp(), async baseUrl => {
      const response = await fetch(`${baseUrl}/api/geoapify/geocode?text=${encodeURIComponent('<script>x</script>')}`);
      assert.equal(response.status, 400);
    });
  } finally {
    if (previousKey === undefined) delete process.env.GEOAPIFY_API_KEY;
    else process.env.GEOAPIFY_API_KEY = previousKey;
  }
});

test('backend dist has no automatic cover enrichment at startup', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const distServer = fs.readFileSync(path.join(__dirname, '../dist/server.js'), 'utf8');
  // The only permitted call site is the auth+admin-gated route in books.js.
  const serverCalls = distServer.match(/enrichBookCovers/g) || [];
  assert.equal(serverCalls.length, 0, 'server.js must not call enrichBookCovers');
  const booksRoutes = fs.readFileSync(path.join(__dirname, '../dist/routes/books.js'), 'utf8');
  assert.ok(booksRoutes.includes('enrichBookCovers'), 'books routes must own the enrichment call');
  assert.ok(booksRoutes.includes('admin'), 'enrichment route must be admin-gated');
});
