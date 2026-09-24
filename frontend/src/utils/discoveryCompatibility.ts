import { IAuthor, IImageAsset, IPublisher, IUpcomingBook } from '../types';

/** BookVerse-local fallback shared by every discovery surface. */
export const DISCOVERY_IMAGE_FALLBACK = '/images/bookstore-hero-editorial.png';

const DISCOVERY_PALETTES = [
    ['#4f46e5', '#7c3aed', '#ec4899'],
    ['#0f766e', '#14b8a6', '#22c55e'],
    ['#f59e0b', '#f97316', '#ef4444'],
    ['#2563eb', '#38bdf8', '#8b5cf6'],
    ['#0f172a', '#475569', '#a855f7'],
    ['#9d174d', '#e11d48', '#f59e0b'],
] as const;

const makeUniqueDiscoveryArt = (title: string, subtitle?: string, seed?: string) => {
    const label = title?.trim() || subtitle?.trim() || 'Featured';
    const short = label.length > 20 ? `${label.slice(0, 18)}…` : label;
    const initials = label
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part.slice(0, 1).toUpperCase())
        .join('') || 'LB';

    const hashSource = `${seed || label}${label}`;
    let hash = 0;
    for (let index = 0; index < hashSource.length; index += 1) {
        hash = (hash * 31 + hashSource.charCodeAt(index)) | 0;
    }
    const [start, mid, end] = DISCOVERY_PALETTES[Math.abs(hash) % DISCOVERY_PALETTES.length];

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
            <defs>
                <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stop-color="${start}" />
                    <stop offset="50%" stop-color="${mid}" />
                    <stop offset="100%" stop-color="${end}" />
                </linearGradient>
            </defs>
            <rect width="1200" height="900" fill="url(#g)" />
            <circle cx="980" cy="180" r="180" fill="rgba(255,255,255,0.12)" />
            <circle cx="220" cy="730" r="220" fill="rgba(255,255,255,0.10)" />
            <rect x="90" y="90" width="1020" height="720" rx="52" fill="rgba(15,23,42,0.12)" stroke="rgba(255,255,255,0.30)"/>
            <text x="600" y="430" text-anchor="middle" font-size="280" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="rgba(255,255,255,0.92)">${initials}</text>
            <text x="600" y="570" text-anchor="middle" font-size="76" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="#ffffff">${short}</text>
            <text x="600" y="640" text-anchor="middle" font-size="34" font-family="Arial, Helvetica, sans-serif" fill="rgba(255,255,255,0.78)">LuminaBook Discovery</text>
        </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const DISCOVERY_FALLBACKS = [
    '/images/hero-book.png',
    '/images/bookstore-hero-editorial.png',
    '/images/future library.jpeg',
    '/images/reading corner.jpeg',
    '/images/genres.jpeg',
];

/** Stable hash so different discovery records do not all collapse onto the same placeholder. */
const fallbackIndex = (seed?: string): number => {
    if (!seed) return 0;
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
        hash = (hash * 31 + seed.charCodeAt(index)) | 0;
    }
    return Math.abs(hash) % DISCOVERY_FALLBACKS.length;
};

export const getDiscoveryFallback = (seed?: string, title?: string, subtitle?: string, usedImages: Set<string> = new Set()): string => {
    const generated = makeUniqueDiscoveryArt(title || subtitle || 'Discovery', subtitle, seed);
    const staticFallback = DISCOVERY_FALLBACKS[fallbackIndex(seed)];

    if (!usedImages.has(generated) && !usedImages.has(staticFallback)) {
        return generated;
    }

    const start = fallbackIndex(seed);
    for (let offset = 0; offset < DISCOVERY_FALLBACKS.length; offset += 1) {
        const candidate = DISCOVERY_FALLBACKS[(start + offset) % DISCOVERY_FALLBACKS.length];
        if (!usedImages.has(candidate)) return candidate;
    }

    return generated;
};

/** Accept both current asset objects and legacy plain URL strings from MongoDB. */
export const resolveDiscoveryImage = (
    image?: string | IImageAsset | null,
    fallback = DISCOVERY_IMAGE_FALLBACK
): string => {
    if (typeof image === 'string' && image.trim()) return image.trim();
    if (image && typeof image === 'object' && typeof image.url === 'string' && image.url.trim()) {
        return image.url.trim();
    }
    return fallback;
};

/** Normalize the backend's legacy string coverImage into the frontend asset contract. */
export const normalizeUpcomingBook = (value: unknown): IUpcomingBook => {
    const raw = (value && typeof value === 'object' ? value : {}) as Record<string, any>;
    const coverImage = raw.coverImage;
    const normalizedCover: IImageAsset | undefined =
        typeof coverImage === 'string' && coverImage.trim()
            ? { url: coverImage.trim(), publicId: '' }
            : coverImage && typeof coverImage === 'object' && typeof coverImage.url === 'string'
                ? { url: coverImage.url, publicId: typeof coverImage.publicId === 'string' ? coverImage.publicId : '' }
                : undefined;

    return {
        ...raw,
        _id: String(raw._id ?? raw.id ?? ''),
        title: typeof raw.title === 'string' && raw.title.trim() ? raw.title : 'Untitled book',
        coverImage: normalizedCover,
        authorId: raw.authorId as string | IAuthor,
        publisherId: raw.publisherId as string | IPublisher | undefined,
        expectedReleaseDate: raw.expectedReleaseDate,
        status: raw.status || 'ANNOUNCED',
    } as IUpcomingBook;
};
