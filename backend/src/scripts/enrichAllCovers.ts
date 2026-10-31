/**
 * Catalogue-wide cover enrichment (idempotent, resumable, rate-limited).
 *
 * Goal: every book ends up with either
 *   1. a VERIFIED original publisher cover (Google Books, then Open Library —
 *      title AND author must match; nothing is accepted on a loose match), or
 *   2. a clearly-labelled generated EDITORIAL cover (title + author + an
 *      "Editorial Edition" mark, so it is never mistaken for publisher art).
 *
 * Usage:
 *   npx tsx src/scripts/enrichAllCovers.ts            # dry run (no writes)
 *   npx tsx src/scripts/enrichAllCovers.ts --apply --confirm   # write
 *
 * Safety:
 * - Dry run is the default; writes require BOTH --apply and --confirm.
 * - Idempotent: books whose image is already a verified non-placeholder URL
 *   (or an editorial cover produced by this script) are skipped.
 * - Resumable: each run re-scans and processes only pending books.
 * - Rate-limited: 350ms between external API calls.
 * - Auditable: prints a per-book decision table and a final summary.
 */
import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const APPLY = process.argv.includes('--apply');
const CONFIRM = process.argv.includes('--confirm');
// Re-attempt books that currently hold a generated editorial cover (used to
// upgrade transient Open Library failures to verified covers on later runs).
const RETRY_EDITORIAL = process.argv.includes('--retry-editorial');
const RATE_LIMIT_MS = 350;

const PLACEHOLDER_MARKERS = [
  'placehold.co', 'via.placeholder.com', 'placeholder.com', 'loremflickr.com',
  '/images/hero-book.png', '/images/bookstore-hero-editorial.png', 'text=',
];
const EDITORIAL_MARKER = 'editorial-edition';

const isPending = (image?: string) => {
  if (!image || !image.trim()) return true;
  const value = image.toLowerCase();
  if (value.startsWith('http://localhost')) return true; // broken local origin
  if (RETRY_EDITORIAL && value.startsWith('data:image/svg') && (value.includes(EDITORIAL_MARKER) || value.includes('editorial%20edition'))) return true;
  return PLACEHOLDER_MARKERS.some(marker => value.includes(marker));
};

const normalize = (value: string) => value
  .toLowerCase()
  .replace(/\(.*?\)/g, ' ')        // drop parentheticals like "(Internal)"
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

/** True when every word of the target author appears in the candidate authors
 *  string — handles initials and name-order differences ("Peter A. Thiel"). */
const authorTokensMatch = (targetAuthor: string, candidateAuthors: string) => {
  const targetTokens = targetAuthor.split(' ').filter(Boolean);
  if (!targetTokens.length) return true;
  return targetTokens.every(token => candidateAuthors.includes(token));
};

/**
 * Strict title acceptance:
 *  - exact normalized equality, OR
 *  - the candidate is the same title followed by a subtitle (": …" / "( …)").
 * Plain containment is rejected — it would match "The Alchemist Graphic Novel"
 * when looking for "The Alchemist".
 */
const titleMatches = (targetTitle: string, rawCandidateTitle: string) => {
  const cTitle = normalize(rawCandidateTitle);
  if (cTitle === targetTitle) return true;
  const target = targetTitle.toLowerCase();
  const raw = rawCandidateTitle.toLowerCase();
  if (!raw.startsWith(target)) return false;
  const remainder = raw.slice(target.length).trim();
  return remainder.startsWith(':') || remainder.startsWith('(');
};

const searchTitle = (title: string) => title.replace(/\(.*?\)/g, ' ').replace(/'/g, '').replace(/\s+/g, ' ').trim();

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const cleanUrl = (url: string) => url.replace(/^http:\/\//i, 'https://');

interface Candidate { [key: string]: any }

/** Google Books: strict title+author verified match. */
const findGoogleCover = async (title: string, author: string): Promise<string | null> => {
  const query = encodeURIComponent(`intitle:${searchTitle(title)} inauthor:${author}`);
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5&printType=books`);
  if (!res.ok) return null;
  const data = await res.json() as { items?: Candidate[] };
  const targetTitle = normalize(searchTitle(title));
  const targetAuthor = normalize(author);
  const match = (data.items || []).find(item => {
    const info = item.volumeInfo || item;
    const authorOk = authorTokensMatch(targetAuthor, (info.authors || []).map((a: string) => normalize(a)).join(' '));
    return titleMatches(targetTitle, info.title || '') && authorOk && info.imageLinks;
  });
  if (!match) return null;
  const links = match.volumeInfo?.imageLinks || match.imageLinks || {};
  const best = links.extraLarge || links.large || links.medium || links.small || links.thumbnail;
  return best ? cleanUrl(best) : null;
};

/** Open Library: strict title+author verified match; cover must be a real image. */
const findOpenLibraryCover = async (title: string, author: string): Promise<string | null> => {
  const params = new URLSearchParams({ title: searchTitle(title), limit: '5', fields: 'title,author_name,cover_i' });
  if (author) params.set('author', author);
  const res = await fetch(`https://openlibrary.org/search.json?${params}`);
  if (!res.ok) return null;
  const data = await res.json() as { docs?: Candidate[] };
  const targetTitle = normalize(searchTitle(title));
  const targetAuthor = normalize(author);
  for (const doc of data.docs || []) {
    if (!doc.cover_i) continue;
    const cAuthors = (doc.author_name || []).map((a: string) => normalize(a)).join(' ');
    if (!titleMatches(targetTitle, doc.title || '') || !authorTokensMatch(targetAuthor, cAuthors)) continue;
    const url = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
    // Open Library serves a 1x1 blank GIF when no scan exists — reject it.
    const head = await fetch(url);
    const bytes = await head.arrayBuffer();
    if (head.ok && bytes.byteLength > 1000) return url;
    await sleep(RATE_LIMIT_MS);
  }
  return null;
};

/** Editorial fallback: unique per book, clearly labelled as generated artwork. */
const editorialCover = (title: string, author: string, category?: string): string => {
  const safeTitle = title?.trim() || 'Untitled';
  const safeAuthor = author?.trim() || 'Unknown Author';
  const initials = safeTitle.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || 'LB';
  const sum = [...safeTitle].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const palettes = [
    ['#1f2937', '#374151', '#9ca3af'],
    ['#14532d', '#166534', '#86efac'],
    ['#1e3a5f', '#1d4ed8', '#93c5fd'],
    ['#4c1d95', '#6d28d9', '#c4b5fd'],
    ['#7c2d12', '#c2410c', '#fdba74'],
    ['#0f172a', '#334155', '#94a3b8'],
  ];
  const [start, mid, end] = palettes[Math.abs(sum) % palettes.length];
  const wrap = (t: string, max: number) => t.length > max ? `${t.slice(0, max - 1)}…` : t;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800" viewBox="0 0 1200 1800">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${start}"/><stop offset="55%" stop-color="${mid}"/><stop offset="100%" stop-color="${end}"/>
      </linearGradient></defs>
      <rect width="1200" height="1800" fill="url(#g)"/>
      <rect x="90" y="90" width="1020" height="1620" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="6"/>
      <rect x="60" y="0" width="30" height="1800" fill="rgba(0,0,0,0.25)"/>
      <text x="600" y="300" text-anchor="middle" font-family="Georgia, serif" font-size="46" letter-spacing="14" fill="rgba(255,255,255,0.85)">${EDITORIAL_MARKER.replace(/-/g, ' ').toUpperCase()}</text>
      <text x="600" y="900" text-anchor="middle" font-family="Georgia, serif" font-size="340" font-weight="700" fill="rgba(255,255,255,0.95)">${initials}</text>
      <text x="600" y="1150" text-anchor="middle" font-family="Georgia, serif" font-size="86" font-weight="600" fill="#ffffff">${wrap(safeTitle, 24)}</text>
      <text x="600" y="1260" text-anchor="middle" font-family="Georgia, serif" font-size="52" fill="rgba(255,255,255,0.85)">${wrap(safeAuthor, 32)}</text>
      <text x="600" y="1620" text-anchor="middle" font-family="Arial" font-size="38" fill="rgba(255,255,255,0.6)">Lumina Book AI · generated cover</text>
      <text x="0" y="-100" font-size="1" fill="none">${encodeURIComponent(category || '').slice(0, 0)}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI as string, { serverSelectionTimeoutMS: 10000 });
  const books = await mongoose.connection.db.collection('books')
    .find({}, { projection: { _id: 1, title: 1, author: 1, genre: 1, image: 1 } })
    .toArray();

  const pending = books.filter(b => isPending(b.image));
  console.log(`📚 Catalogue: ${books.length} books · pending enrichment: ${pending.length}`);
  if (books.length - pending.length > 0) {
    console.log(`✅ Skipped (already valid): ${books.length - pending.length}`);
  }

  const results: Array<{ title: string; source: string; outcome: string }> = [];
  let verified = 0, editorial = 0, failed = 0;

  for (const book of pending) {
    const title: string = book.title || '';
    const author: string = book.author || '';
    let source = '';
    let image: string | null = null;

    try {
      image = await findGoogleCover(title, author);
      source = 'google-books (verified match)';
    } catch { /* fall through */ }
    await sleep(RATE_LIMIT_MS);

    if (!image) {
      try {
        image = await findOpenLibraryCover(title, author);
        source = 'open-library (verified match)';
      } catch { /* fall through */ }
      await sleep(RATE_LIMIT_MS);
    }

    let outcome: string;
    if (image && !isPending(image)) {
      outcome = 'VERIFIED_PUBLISHER_COVER';
      verified++;
    } else {
      image = editorialCover(title, author, book.genre);
      source = 'generated';
      outcome = 'EDITORIAL_COVER (labelled, not publisher art)';
      editorial++;
    }

    results.push({ title: `${title} — ${author}`, source, outcome });

    if (APPLY && CONFIRM) {
      await mongoose.connection.db.collection('books')
        .updateOne({ _id: book._id }, { $set: { image } });
    }
    console.log(`${APPLY && CONFIRM ? '✍️ ' : '🔍 '}[${outcome}] ${title} → ${source}`);
  }

  console.log('\n===== SUMMARY =====');
  console.log(`Total pending: ${pending.length}`);
  console.log(`Verified publisher covers: ${verified}`);
  console.log(`Generated editorial covers: ${editorial}`);
  console.log(`Unresolved: ${failed}`);
  console.log(`Mode: ${APPLY && CONFIRM ? 'APPLIED' : 'DRY RUN (no writes)'}`);
  if (APPLY && !CONFIRM) console.log('⚠️ --apply requires --confirm. Nothing was written.');

  await mongoose.disconnect();
  process.exit(0);
};

main().catch(err => { console.error('❌', err.message); process.exit(1); });
