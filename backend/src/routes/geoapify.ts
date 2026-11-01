import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Server-side Geoapify proxy.
 *
 * Keeps the Geoapify API key out of the frontend bundle: the browser calls
 * this proxy, and the key never leaves the server. Only the two endpoints the
 * Bookstore Explorer map actually uses are exposed, with whitelisted query
 * parameters — everything else is rejected before reaching the upstream API.
 */

const GEOAPIFY_BASE = 'https://api.geoapify.com';

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY || '';

// Per-IP limiter; the proxy would otherwise let one client exhaust the quota.
const geoapifyLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many map search requests. Please wait a moment.' }
});

const router = express.Router();
router.use(geoapifyLimiter);

// Query values are forwarded verbatim to Geoapify via URLSearchParams (which
// percent-encodes them), but we still constrain length/charset up front.
const safeQueryValue = (value: unknown, maxLength: number): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > maxLength) return null;
    if (!/^[\p{L}\p{N}\s,.:'’\-():@]+$/u.test(trimmed)) return null;
    return trimmed;
};

const proxyGeoapify = async (req: Request, res: Response, next: NextFunction, buildUrl: (params: URLSearchParams) => URL) => {
    if (!GEOAPIFY_API_KEY) {
        return res.status(503).json({
            success: false,
            message: 'Map search is not configured on this server.',
            code: 'GEOAPIFY_NOT_CONFIGURED'
        });
    }

    try {
        const params = new URLSearchParams(req.query as Record<string, string>);
        const upstreamUrl = buildUrl(params);
        upstreamUrl.searchParams.set('apiKey', GEOAPIFY_API_KEY);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        let upstream: globalThis.Response;
        try {
            upstream = await fetch(upstreamUrl, {
                headers: { Accept: 'application/json' },
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeout);
        }

        // Pass through the upstream status so client error handling (429/401/…)
        // keeps working, without echoing upstream body verbatim.
        let data: unknown = null;
        try { data = await upstream.json(); } catch { /* non-JSON upstream error */ }

        return res.status(upstream.status).json(data ?? {
            success: false,
            message: `Map provider returned HTTP ${upstream.status}.`
        });
    } catch (error) {
        if ((error as Error)?.name === 'AbortError') {
            return res.status(504).json({ success: false, message: 'Map search timed out.' });
        }
        return next(error);
    }
};

// GET /api/geoapify/geocode?text=... — forward geocoding for place search.
router.get('/geocode', (req, res, next) => {
    const text = safeQueryValue(req.query.text, 200);
    if (!text) {
        return res.status(400).json({ success: false, message: 'A valid search text is required.' });
    }
    return void proxyGeoapify(req, res, next, (params) => {
        const url = new URL(`${GEOAPIFY_BASE}/v1/geocode/search`);
        url.searchParams.set('text', text);
        url.searchParams.set('format', 'json');
        url.searchParams.set('limit', '5');
        url.searchParams.set('lang', 'en');
        return url;
    });
});

// GET /api/geoapify/places — bookstore category search; filter/bias/name only.
router.get('/places', (req, res, next) => {
    const allowed: Record<string, string> = {};
    for (const key of ['filter', 'bias', 'name'] as const) {
        const value = safeQueryValue(req.query[key], 200);
        if (value) allowed[key] = value;
    }
    if (!allowed.filter && !allowed.bias) {
        return res.status(400).json({ success: false, message: 'A location filter or bias is required.' });
    }
    return void proxyGeoapify(req, res, next, (params) => {
        const url = new URL(`${GEOAPIFY_BASE}/v2/places`);
        url.searchParams.set('categories', 'commercial.books');
        for (const [key, value] of Object.entries(allowed)) {
            url.searchParams.set(key, value);
        }
        url.searchParams.set('limit', '20');
        url.searchParams.set('lang', 'en');
        return url;
    });
});

export default router;
