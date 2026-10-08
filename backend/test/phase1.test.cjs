const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../dist/server.js');
const { validateEnvironment } = require('../dist/config/env.js');
const { errorHandler } = require('../dist/middleware/errorHandler.js');
const { requestId } = require('../dist/middleware/requestId.js');
const express = require('express');

const withEnv = (overrides, callback) => {
    const previous = { ...process.env };
    const next = { ...previous, ...overrides };
    process.env = next;
    try {
        return callback();
    } finally {
        process.env = previous;
    }
};

const request = async (path, options = {}) => {
    const server = createApp().listen(0);
    const address = server.address();

    try {
        const response = await fetch(`http://127.0.0.1:${address.port}${path}`, options);
        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await response.json() : await response.text();
        return { response, body };
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
};

test('request ID middleware generates and returns a request ID header', async () => {
    const { response } = await request('/health');
    const requestIdValue = response.headers.get('x-request-id');

    assert.ok(requestIdValue);
    assert.match(requestIdValue, /^[a-zA-Z0-9_-]{1,128}$/);
});

test('request ID middleware accepts a safe caller-supplied ID', async () => {
    const { response } = await request('/health', {
        headers: { 'X-Request-Id': 'phase-1-test-id' }
    });

    assert.equal(response.headers.get('x-request-id'), 'phase-1-test-id');
});

test('unknown API routes return a centralized 404 response with a request ID', async () => {
    const { response, body } = await request('/api/does-not-exist');

    assert.equal(response.status, 404);
    assert.equal(body.success, false);
    assert.equal(body.code, 'NOT_FOUND');
    assert.ok(body.requestId);
});

test('centralized error handler returns a request ID and sanitized production message', async () => {
    const app = express();
    app.use(requestId);
    app.use((req, _res, next) => {
        const error = new Error('sensitive payment details must not be returned');
        error.statusCode = 500;
        next(error);
    });
    app.use(errorHandler);

    const server = app.listen(0);
    const address = server.address();
    const previousEnvironment = process.env.NODE_ENV;

    try {
        process.env.NODE_ENV = 'production';
        const response = await fetch(`http://127.0.0.1:${address.port}/api/error`, {
            headers: { 'X-Request-Id': 'phase-1-error-test' }
        });
        const body = await response.json();

        assert.equal(response.status, 500);
        assert.equal(body.message, 'An unexpected server error occurred');
        assert.equal(body.requestId, 'phase-1-error-test');
        assert.doesNotMatch(JSON.stringify(body), /sensitive payment details/i);
    } finally {
        process.env.NODE_ENV = previousEnvironment;
        await new Promise(resolve => server.close(resolve));
    }
});

test('centralized error handler catches rejected async route promises', async () => {
    const app = express();
    app.use(requestId);
    app.get('/api/async-error', async () => {
        throw new Error('route failure details');
    });
    app.use(errorHandler);

    const server = app.listen(0);
    const address = server.address();

    try {
        const response = await fetch(`http://127.0.0.1:${address.port}/api/async-error`, {
            headers: { 'X-Request-Id': 'phase-1-async-test' }
        });
        const body = await response.json();

        assert.equal(response.status, 500);
        assert.equal(body.requestId, 'phase-1-async-test');
        assert.equal(body.message, 'route failure details');
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});

test('environment validation rejects missing critical production variables', () => {
    const missing = withEnv({
        NODE_ENV: 'production',
        MONGO_URI: '',
        JWT_SECRET: '',
        CLIENT_URL: '',
        STRIPE_SECRET_KEY: '',
        STRIPE_WEBHOOK_SECRET: '',
        PHONEPE_MERCHANT_ID: '',
        PHONEPE_SALT_KEY: ''
    }, () => {
        assert.throws(
            validateEnvironment,
            /Missing or invalid production environment variables: MONGO_URI, JWT_SECRET, CLIENT_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PHONEPE_MERCHANT_ID, PHONEPE_SALT_KEY/
        );
    });

    assert.equal(missing, undefined);
});

test('health reports degraded database state and readiness false', async () => {
    const { response, body } = await request('/health');

    assert.equal(response.status, 503);
    assert.equal(body.success, false);
    assert.equal(body.status, 'degraded');
    assert.equal(body.database, 'unavailable');
    assert.equal(body.readiness, false);
});

test('CORS allows explicit trusted origins and rejects an unrelated origin', async () => {
    const trusted = await request('/health', {
        headers: { Origin: 'https://bookverse-neon.vercel.app' }
    });
    const rejected = await request('/health', {
        headers: { Origin: 'https://untrusted.example' }
    });

    assert.equal(trusted.response.status, 503);
    assert.equal(trusted.response.headers.get('access-control-allow-origin'), 'https://bookverse-neon.vercel.app');
    assert.equal(rejected.response.headers.get('access-control-allow-origin'), null);
});

test('JSON request body is limited to one megabyte', async () => {
    const largeBody = JSON.stringify({ value: 'x'.repeat(1024 * 1024) });
    const { response } = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: largeBody
    });

    assert.equal(response.status, 413);
});

test('environment validation accepts complete production configuration', () => {
    const valid = withEnv({
        NODE_ENV: 'production',
        MONGO_URI: 'mongodb://localhost:27017/bookverse',
        JWT_SECRET: 'a'.repeat(32),
        CLIENT_URL: 'https://bookverse.example.com',
        STRIPE_SECRET_KEY: 'stripe-test-key',
        STRIPE_WEBHOOK_SECRET: 'stripe-webhook-secret',
        PHONEPE_MERCHANT_ID: 'merchant-id',
        PHONEPE_SALT_KEY: 'phonepe-salt-key'
    }, () => {
        assert.doesNotThrow(validateEnvironment);
    });

    assert.equal(valid, undefined);
});
