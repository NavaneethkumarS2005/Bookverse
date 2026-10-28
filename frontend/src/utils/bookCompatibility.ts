import { Book } from '../types';
import { API_URL } from '../config';

/** Local image keeps cards usable if a real cover cannot be loaded. */
export const BOOK_IMAGE_FALLBACK = '/images/bookstore-hero-editorial.png';

const buildFallbackCoverSvg = (title: string, author = '', category = '') => {
    const safeTitle = title?.trim() || 'Untitled book';
    const safeAuthor = author?.trim() || 'Lumina Book AI';
    const safeCategory = category?.trim() || 'Featured';
    const labelTitle = safeTitle.length > 26 ? `${safeTitle.slice(0, 24)}…` : safeTitle;
    const labelAuthor = safeAuthor.length > 28 ? `${safeAuthor.slice(0, 26)}…` : safeAuthor;
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800" viewBox="0 0 1200 1800">
            <defs>
                <linearGradient id="panel" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stop-color="#f9f5ef" />
                    <stop offset="100%" stop-color="#efe5d9" />
                </linearGradient>
            </defs>
            <rect width="1200" height="1800" fill="#f5efe7" />
            <rect x="100" y="140" width="1000" height="1520" rx="60" fill="url(#panel)" stroke="#d7cab6" stroke-width="12"/>
            <rect x="190" y="260" width="820" height="220" rx="24" fill="#e7dcc8" stroke="#cbbca7" stroke-width="8"/>
            <rect x="250" y="330" width="700" height="18" rx="9" fill="#bca78a" opacity="0.9"/>
            <rect x="250" y="370" width="540" height="18" rx="9" fill="#bca78a" opacity="0.75"/>
            <rect x="250" y="470" width="700" height="12" rx="6" fill="#d4c2a4" opacity="0.9"/>
            <rect x="250" y="510" width="620" height="12" rx="6" fill="#d4c2a4" opacity="0.8"/>
            <rect x="250" y="550" width="540" height="12" rx="6" fill="#d4c2a4" opacity="0.7"/>
            <path d="M420 1200 C520 1080, 680 1080, 780 1200 L780 1470 C680 1570, 520 1570, 420 1470 Z" fill="#ddd1c1" stroke="#baa884" stroke-width="8"/>
            <path d="M505 1230 C555 1200, 645 1200, 695 1230" stroke="#a69271" stroke-width="10" stroke-linecap="round" fill="none"/>
            <text x="600" y="915" text-anchor="middle" font-size="76" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="#4f463e">Cover unavailable</text>
            <text x="600" y="1035" text-anchor="middle" font-size="104" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="#2f2930">${labelTitle}</text>
            <text x="600" y="1140" text-anchor="middle" font-size="58" font-family="Arial, Helvetica, sans-serif" fill="#5a524d">${safeCategory}</text>
            <text x="600" y="1215" text-anchor="middle" font-size="48" font-family="Arial, Helvetica, sans-serif" fill="#635d59">${labelAuthor}</text>
            <text x="600" y="1500" text-anchor="middle" font-size="36" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="#8a7664" letter-spacing="6">LUMINA BOOK AI</text>
        </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const isValidExternalUrl = (url: unknown): string | undefined => {
    if (typeof url !== 'string') return undefined;
    const trimmed = url.trim();
    if (!trimmed) return undefined;
    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return trimmed;
        }
    } catch {
        return undefined;
    }
    return undefined;
};

const STALE_LOCAL_UPLOAD_ORIGINS = new Set([
    'http://localhost:5001',
    'http://127.0.0.1:5001',
]);

const resolveStaleLocalUploadUrl = (value: string): string => {
    if (!API_URL || !value.toLowerCase().startsWith('http')) return value;

    try {
        const parsed = new URL(value);
        const origin = `${parsed.protocol}//${parsed.host}`.replace(/\/$/, '').toLowerCase();
        if (!STALE_LOCAL_UPLOAD_ORIGINS.has(origin) || !parsed.pathname.startsWith('/uploads/')) {
            return value;
        }

        return `${API_URL.replace(/\/$/, '')}${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return value;
    }
};

export const resolveBookImage = (value?: string, title?: string, author?: string, category?: string): string => {
    if (!value || !value.trim()) return buildFallbackCoverSvg(title || 'Untitled', author, category);

    const normalized = value.trim();
    const lower = normalized.toLowerCase();
    const placeholderMatch = lower.includes('placehold.co')
        || lower.includes('via.placeholder.com')
        || lower.includes('placeholder.com')
        || lower.includes('loremflickr.com')
        || lower.includes('/images/hero-book.png')
        || lower.includes('/images/bookstore-hero-editorial.png')
        || lower.includes('text=');

    if (placeholderMatch) {
        return buildFallbackCoverSvg(title || 'Untitled', author, category);
    }

    return resolveStaleLocalUploadUrl(normalized);
};

type UnknownRecord = Record<string, any>;

const asRecord = (value: unknown): UnknownRecord =>
    value && typeof value === 'object' ? (value as UnknownRecord) : {};

const firstNonEmptyString = (...values: unknown[]): string | undefined => {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return undefined;
};

const asNumber = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const getAuthorName = (value: unknown): string => {
    if (typeof value === 'string' && value.trim()) return value.trim();
    const author = asRecord(value);
    return firstNonEmptyString(author.name, author.fullName, author.authorName) || 'Unknown author';
};

/** Old seed data used text-generated placeholder covers. Never turn those into
 * generic genre photos: the backend now resolves the real published cover. */
const isTextPlaceholder = (value?: string): boolean => {
    if (!value) return true;
    const image = value.toLowerCase();
    return image.includes('placehold.co')
        || image.includes('via.placeholder.com')
        || image.includes('placeholder.com')
        || image.includes('loremflickr.com')
        || image.includes('/images/hero-book.png')
        || image.includes('/images/bookstore-hero-editorial.png')
        || image.includes('text=');
};

export const normalizeBook = (value: unknown, index = 0): Book => {
    const raw = asRecord(value);
    const imageObject = asRecord(raw.coverImage || raw.cover || raw.photo);
    const images = Array.isArray(raw.images) ? raw.images : [];

    const rawImage = firstNonEmptyString(
        raw.image,
        raw.imageUrl,
        raw.coverImageUrl,
        typeof raw.coverImage === 'string' ? raw.coverImage : undefined,
        imageObject.url,
        raw.thumbnail,
        images[0]
    );

    const genres = Array.isArray(raw.genres)
        ? raw.genres.filter((genre: unknown): genre is string => typeof genre === 'string' && Boolean(genre.trim()))
        : [];
    const category = firstNonEmptyString(raw.category, raw.genre, genres[0]) || 'Other';
    const title = firstNonEmptyString(raw.title, raw.name) || 'Untitled book';
    const author = getAuthorName(raw.author);
    const id = raw._id ?? raw.id ?? `legacy-book-${index}`;
    const bookId = typeof id === 'string' ? id : String(id);

    const image = isTextPlaceholder(rawImage)
        ? buildFallbackCoverSvg(title, author, category)
        : resolveStaleLocalUploadUrl(rawImage || '');

    const price = asNumber(raw.price ?? raw.cost, 0);
    const rating = asNumber(raw.rating ?? raw.averageRating, 0);
    const reviews = asNumber(raw.numReviews ?? raw.reviews ?? raw.reviewCount, 0);

    return {
        ...raw,
        _id: bookId,
        id: raw.id,
        title,
        author,
        description: firstNonEmptyString(raw.description, raw.summary) || '',
        price,
        image,
        category,
        genre: firstNonEmptyString(raw.genre, category),
        rating,
        numReviews: reviews,
        reviews,
        seller: raw.seller ?? '',
        fulfillment: raw.fulfillment === 'internal' || raw.fulfillment === 'external' ? raw.fulfillment : undefined,
        buyLink: isValidExternalUrl(raw.buyLink),
        stock: asNumber(raw.stock ?? raw.quantity, 0),
        createdAt: firstNonEmptyString(raw.createdAt, raw.publishedAt) || '',
        updatedAt: firstNonEmptyString(raw.updatedAt, raw.createdAt) || '',
        genres: genres.length ? genres : [category],
        averageRating: rating,
    } as Book;
};

interface BookCollectionResult {
    books: Book[];
    pages: number;
}

/** Supports array responses and common paginated response wrappers. */
export const normalizeBookCollection = (payload: unknown): BookCollectionResult => {
    if (Array.isArray(payload)) {
        return {
            books: payload.map((book, index) => normalizeBook(book, index)),
            pages: 1,
        };
    }

    const root = asRecord(payload);
    const nested = asRecord(root.data);
    const rawBooks = Array.isArray(root.books)
        ? root.books
        : Array.isArray(root.items)
            ? root.items
            : Array.isArray(root.results)
                ? root.results
                : Array.isArray(nested.books)
                    ? nested.books
                    : Array.isArray(nested.items)
                        ? nested.items
                        : Array.isArray(nested.results)
                            ? nested.results
                            : [];

    const pages = Math.max(
        1,
        asNumber(root.pages ?? root.totalPages ?? nested.pages ?? nested.totalPages, 1)
    );

    return {
        books: rawBooks.map((book, index) => normalizeBook(book, index)),
        pages,
    };
};
