import { Book } from '../types';

/** Local image keeps cards usable if a remote semantic image cannot be loaded. */
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

/**
 * The old seed data uses placehold.co covers that literally render the title
 * as text. Those are not useful as real book artwork, so cards now receive a
 * deterministic real-photo URL based on the book's meaning instead.
 *
 * LoremFlickr serves real Flickr photography and accepts keyword tags. The
 * lock is derived from the book identity so different books get different,
 * stable photos rather than a single repeated image.
 */
const isTextPlaceholder = (value?: string): boolean => {
    if (!value) return true;
    const image = value.toLowerCase();
    return image.includes('placehold.co')
        || image.includes('via.placeholder.com')
        || image.includes('placeholder.com')
        || image.includes('text=');
};

const hashString = (value: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0);
};

const semanticKeywords = (title: string, genre: string, author: string): string[] => {
    const text = `${title} ${genre} ${author}`.toLowerCase();

    const rules: Array<[RegExp, string[]]> = [
        [/great gatsby/, ['jazz', '1920s', 'elegant', 'city', 'night']],
        [/\b1984\b|dystop/, ['surveillance', 'city', 'dark', 'future']],
        [/dune/, ['desert', 'sand', 'dunes', 'landscape']],
        [/pride and prejudice/, ['regency', 'manor', 'garden', 'romantic']],
        [/hobbit|lord of the rings|rings/, ['fantasy', 'mountains', 'forest', 'adventure']],
        [/sapiens|history of humankind/, ['archaeology', 'ancient', 'human', 'history']],
        [/thinking.*fast|psychology|kahneman/, ['psychology', 'brain', 'thinking', 'research']],
        [/brief history of time|hawking|cosmos|universe/, ['space', 'galaxy', 'stars', 'telescope']],
        [/silent spring|environment|ecology/, ['forest', 'nature', 'wildlife', 'green']],
        [/catcher in the rye/, ['new york', 'autumn', 'city', 'youth']],
        [/mockingbird/, ['southern town', 'oak tree', 'summer', 'street']],
        [/da vinci|mystery|gone girl/, ['mystery', 'museum', 'clues', 'noir']],
        [/alchemist/, ['desert', 'journey', 'pyramid', 'sunset']],
        [/life of pi/, ['ocean', 'boat', 'tropical', 'wildlife']],
        [/hunger games/, ['forest', 'survival', 'archery', 'dystopian']],
        [/fault in our stars|romance/, ['romance', 'stars', 'night', 'couple']],
        [/steve jobs|elon musk|technology|programmer|programming|code|algorithm|developer/, ['technology', 'computer', 'workspace', 'innovation']],
        [/zero to one|startup|entrepreneur|business/, ['startup', 'innovation', 'office', 'technology']],
        [/wings of fire|abdul kalam/, ['india', 'aerospace', 'rocket', 'sky']],
        [/biography|memoir/, ['portrait', 'person', 'writing', 'life']],
        [/science|physics/, ['laboratory', 'science', 'research', 'microscope']],
        [/fiction|classic/, ['library', 'reading', 'novel', 'books']],
        [/fantasy/, ['fantasy', 'forest', 'mountains', 'adventure']],
        [/romance/, ['romance', 'flowers', 'sunset', 'couple']],
        [/mystery|thriller/, ['mystery', 'detective', 'city', 'night']],
        [/history/, ['history', 'museum', 'ancient', 'architecture']],
        [/non-fiction/, ['books', 'writing', 'research', 'desk']],
    ];

    for (const [pattern, keywords] of rules) {
        if (pattern.test(text)) return keywords;
    }

    return [genre || 'books', 'reading', 'literature', author || 'author'];
};

export const getBookSemanticImage = (
    title: string,
    genre: string,
    author: string,
    bookId: string
): string => {
    const keywords = semanticKeywords(title, genre, author);
    const lock = (hashString(`${bookId}:${title}:${author}`) % 900000) + 100000;
    return `https://loremflickr.com/800/1200/${keywords.map(encodeURIComponent).join(',')}?lock=${lock}`;
};

/**
 * Accepts legacy marketplace data as well as newer/imported book shapes.
 * Text-only placeholder covers are deliberately replaced by relevant real
 * photography so the same generic graphic is not repeated across the site.
 */
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
    const image = isTextPlaceholder(rawImage)
        ? getBookSemanticImage(title, category, author, bookId)
        : rawImage || BOOK_IMAGE_FALLBACK;

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
