// Central API configuration — single source of truth for the backend URL.
// VITE_API_URL must be set in Netlify environment variables for production.
const API_URL: string = import.meta.env.VITE_API_URL || '';

if (!import.meta.env.VITE_API_URL) {
    console.warn(
        '⚠️ VITE_API_URL is not set! API calls will go to the current origin.',
        'Set VITE_API_URL in your .env or hosting environment variables.'
    );
}

export { API_URL };
