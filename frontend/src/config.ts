// Central API configuration — keep the frontend pointed at the active local backend.
// The backend is currently healthy on port 5000, so prefer that port first and then
// fall back to the next ports if the server is restarted on a different local port.
const DEV_API_URLS = ['http://localhost:5000', 'http://localhost:5001', 'http://localhost:5002', 'http://localhost:5003', 'http://localhost:5004'];
const DEV_API_URL = DEV_API_URLS[0];
const API_URL: string = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? DEV_API_URL : '');
const APP_URL: string = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;
const GEOAPIFY_API_KEY: string = import.meta.env.VITE_GEOAPIFY_API_KEY || '653a68529cc64f2da559cfdd7d9cbd72';
const configuredAreaRequestBudget = Number(import.meta.env.VITE_GEOAPIFY_MAX_AREA_REQUESTS);
const GEOAPIFY_MAX_AREA_REQUESTS = Number.isInteger(configuredAreaRequestBudget) && configuredAreaRequestBudget > 0
    ? Math.min(configuredAreaRequestBudget, 32)
    : 16;
const DEFAULT_OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
];
const OVERPASS_ENDPOINTS = (import.meta.env.VITE_OVERPASS_ENDPOINTS || DEFAULT_OVERPASS_ENDPOINTS.join(','))
    .split(',')
    .map((endpoint: string) => endpoint.trim())
    .filter(Boolean)
    .slice(0, 3);

if (!import.meta.env.VITE_API_URL && !import.meta.env.DEV) {
    console.warn(
        '⚠️ VITE_API_URL is not set! API calls will go to the current origin.',
        'Set VITE_API_URL in your .env or hosting environment variables.'
    );
}

export { API_URL, APP_URL, GEOAPIFY_API_KEY, GEOAPIFY_MAX_AREA_REQUESTS, OVERPASS_ENDPOINTS };
