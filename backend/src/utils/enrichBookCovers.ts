import Book from '../models/Book.js';

const GOOGLE_BOOKS_ENDPOINT = 'https://www.googleapis.com/books/v1/volumes';
const PLACEHOLDER_MARKERS = [
  'placehold.co',
  'via.placeholder.com',
  'placeholder.com',
  'loremflickr.com',
  '/images/hero-book.png',
  'text='
];

const isPlaceholder = (image?: string) => {
  if (!image) return true;
  const value = image.toLowerCase();
  return PLACEHOLDER_MARKERS.some(marker => value.includes(marker));
};

const cleanImageUrl = (image?: string) => {
  if (!image) return '';
  return image.replace(/^http:\/\//i, 'https://');
};

const normalize = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

/**
 * Resolve the existing demo catalogue to real published book-cover artwork.
 * This is intentionally a one-time cache: after a cover is stored in MongoDB,
 * subsequent server restarts do not call Google Books for that book again.
 */
export const enrichBookCovers = async (): Promise<void> => {
  const books = await Book.find({
    $or: [
      { image: { $exists: false } },
      { image: '' },
      { image: { $regex: 'placehold\\.co|placeholder\\.com|loremflickr\\.com|hero-book', $options: 'i' } }
    ]
  }).select('_id title author image').lean();

  if (!books.length) return;

  let updated = 0;

  for (const book of books) {
    try {
      const query = encodeURIComponent(`intitle:${book.title} inauthor:${book.author}`);
      const response = await fetch(`${GOOGLE_BOOKS_ENDPOINT}?q=${query}&maxResults=5&printType=books`);
      if (!response.ok) continue;

      const data = await response.json() as {
        items?: Array<{
          volumeInfo?: {
            title?: string;
            authors?: string[];
            imageLinks?: {
              extraLarge?: string;
              large?: string;
              medium?: string;
              small?: string;
              thumbnail?: string;
            };
          };
        }>;
      };

      const targetTitle = normalize(book.title);
      const targetAuthor = normalize(book.author);

      const match = (data.items || []).find(item => {
        const info = item.volumeInfo;
        if (!info?.imageLinks) return false;

        const candidateTitle = normalize(info.title || '');
        const candidateAuthors = (info.authors || []).map(normalize).join(' ');

        return (
          candidateTitle === targetTitle || candidateTitle.includes(targetTitle) || targetTitle.includes(candidateTitle)
        ) && (
          !targetAuthor || candidateAuthors.includes(targetAuthor) || targetAuthor.includes(candidateAuthors)
        );
      }) || (data.items || []).find(item => item.volumeInfo?.imageLinks);

      const image = cleanImageUrl(
        match?.volumeInfo?.imageLinks?.extraLarge
        || match?.volumeInfo?.imageLinks?.large
        || match?.volumeInfo?.imageLinks?.medium
        || match?.volumeInfo?.imageLinks?.small
        || match?.volumeInfo?.imageLinks?.thumbnail
      );

      if (!image || isPlaceholder(image)) continue;

      await Book.updateOne({ _id: book._id }, { $set: { image } });
      updated += 1;
    } catch (error) {
      console.warn(`⚠️ Cover lookup skipped for "${book.title}": ${(error as Error).message}`);
    }
  }

  console.log(`🖼️ Book cover enrichment: ${updated}/${books.length} placeholder covers replaced.`);
};
