import { IAuthor, IImageAsset, IPublisher, IUpcomingBook } from '../types';

/** BookVerse-local fallback shared by every discovery surface. */
export const DISCOVERY_IMAGE_FALLBACK = '/images/hero-book.png';

/** Existing BookVerse visuals used only when a discovery record has no usable image. */
const DISCOVERY_FALLBACKS = [
    '/images/hero-book.png',
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

export const getDiscoveryFallback = (seed?: string): string => DISCOVERY_FALLBACKS[fallbackIndex(seed)];

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
