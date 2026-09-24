// Central API configuration — keep the frontend pointed at the active local backend.
// The backend is currently healthy on port 5000, so prefer that port first and then
// fall back to the next ports if the server is restarted on a different local port.
const DEV_API_URLS = ['http://localhost:5000', 'http://localhost:5001', 'http://localhost:5002', 'http://localhost:5003', 'http://localhost:5004'];
const DEV_API_URL = DEV_API_URLS[0];
const API_URL: string = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? DEV_API_URL : '');

if (!import.meta.env.VITE_API_URL && !import.meta.env.DEV) {
    console.warn(
        '⚠️ VITE_API_URL is not set! API calls will go to the current origin.',
        'Set VITE_API_URL in your .env or hosting environment variables.'
    );
}

export { API_URL };
