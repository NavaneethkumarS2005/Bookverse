import { Book } from '../types';

/** Local image keeps cards usable if a real cover cannot be loaded. */
export const BOOK_IMAGE_FALLBACK = '/images/hero-book.png';

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
        ? raw.genres.filter((genre: unknown): genre is string => typeof genre === 'string' && genre.trim())
        : [];
    const category = firstNonEmptyString(raw.category, raw.genre, genres[0]) || 'Other';
    const title = firstNonEmptyString(raw.title, raw.name) || 'Untitled book';
    const author = getAuthorName(raw.author);
    const id = raw._id ?? raw.id ?? `legacy-book-${index}`;
    const bookId = typeof id === 'string' ? id : String(id);

    // Placeholder covers are intentionally not replaced with random photos.
    // A real cover should come from the backend/Open Library enrichment path.
    const image = isTextPlaceholder(rawImage) ? BOOK_IMAGE_FALLBACK : rawImage;

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
