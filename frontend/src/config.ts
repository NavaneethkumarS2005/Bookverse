// Central API configuration — single source of truth for the backend URL.
// VITE_API_URL must be set in Netlify environment variables for production.
// In development this explicit default avoids accidental calls to the Vite server
// when a local environment file is missing. Production must provide VITE_API_URL.
const API_URL: string = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

if (!import.meta.env.VITE_API_URL && !import.meta.env.DEV) {
    console.warn(
        '⚠️ VITE_API_URL is not set! API calls will go to the current origin.',
        'Set VITE_API_URL in your .env or hosting environment variables.'
    );
}

export { API_URL };
