import { Book } from '../types';
import { API_URL } from '../config';

/** Local image keeps cards usable if a real cover cannot be loaded. */
export const BOOK_IMAGE_FALLBACK = '/images/bookstore-hero-editorial.png';

const buildFallbackCoverSvg = (title: string, author = '', category = '') => {
    const safeTitle = title?.trim() || 'Untitled';
    const safeAuthor = author?.trim() || 'LuminaBook';
    const safeCategory = category?.trim() || 'Featured';
    const palette = [
        ['#4f46e5', '#7c3aed', '#ec4899'],
        ['#0f766e', '#14b8a6', '#22c55e'],
        ['#f59e0b', '#f97316', '#ef4444'],
        ['#2563eb', '#38bdf8', '#8b5cf6'],
        ['#0f172a', '#475569', '#a855f7'],
        ['#9d174d', '#e11d48', '#f59e0b']
    ];
    const paint = palette[Math.abs(safeTitle.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % palette.length];
    const initials = safeTitle.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part.slice(0, 1).toUpperCase()).join('') || 'LB';
    const labelTitle = safeTitle.length > 20 ? `${safeTitle.slice(0, 18)}…` : safeTitle;
    const labelAuthor = safeAuthor.length > 24 ? `${safeAuthor.slice(0, 22)}…` : safeAuthor;
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800" viewBox="0 0 1200 1800">
            <defs>
                <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stop-color="${paint[0]}" />
                    <stop offset="50%" stop-color="${paint[1]}" />
                    <stop offset="100%" stop-color="${paint[2]}" />
                </linearGradient>
            </defs>
            <rect width="1200" height="1800" fill="url(#g)" />
            <circle cx="980" cy="220" r="240" fill="rgba(255,255,255,0.12)" />
            <circle cx="260" cy="1550" r="300" fill="rgba(255,255,255,0.10)" />
            <rect x="120" y="120" width="960" height="1560" rx="72" fill="rgba(15,23,42,0.16)" stroke="rgba(255,255,255,0.33)" />
            <text x="600" y="780" text-anchor="middle" font-size="300" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="rgba(255,255,255,0.95)">${initials}</text>
            <text x="600" y="1020" text-anchor="middle" font-size="92" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="#ffffff">${labelTitle}</text>
            <text x="600" y="1120" text-anchor="middle" font-size="52" font-family="Arial, Helvetica, sans-serif" fill="rgba(255,255,255,0.82)">${safeCategory}</text>
            <text x="600" y="1200" text-anchor="middle" font-size="46" font-family="Arial, Helvetica, sans-serif" fill="rgba(255,255,255,0.76)">${labelAuthor}</text>
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
