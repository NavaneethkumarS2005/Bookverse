import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import ProductCard from '../components/ProductCard';
import BookCover from '../components/BookCover';
import SectionHeader from '../components/SectionHeader';
import { API_URL } from '../config';
import { Book } from '../types';
import { normalizeBookCollection } from '../utils/bookCompatibility';

interface AuthorCard {
    _id?: string;
    name: string;
    bio?: string;
    nationality?: string;
    image?: string;
}

const SAMPLE_AUTHORS: AuthorCard[] = [
    {
        name: 'Mara Venn',
        nationality: 'British · Coastal fiction',
        bio: 'Writes quiet novels about maps, tides, and the people who stay behind to chart them.',
    },
    {
        name: 'Elias Wren',
        nationality: 'Irish · Night gardens',
        bio: 'His stories grow after dark — greenhouse letters, moonlit orchards, and second chances.',
    },
    {
        name: 'Clara Vale',
        nationality: 'English · Domestic essays',
        bio: 'Essays on Sundays, long tables, and the small ceremonies that hold a household together.',
    },
    {
        name: 'Theo Mercer',
        nationality: 'Welsh · Weather writing',
        bio: 'Field notes on rain, light, and common weather — the everyday skies we forget to read.',
    },
];

const JOURNAL_POSTS = [
    {
        tag: 'Field Notes',
        title: 'Why Independent Bookshops Still Matter',
        teaser: 'On curation, conversation, and the quiet case for buying books from people who have read them.',
    },
    {
        tag: 'Reading Life',
        title: 'How to Build a Reading Year',
        teaser: 'A gentler approach to reading goals — twelve months of books chosen for the life you actually live.',
    },
    {
        tag: 'Design',
        title: 'The Art of the Small Press Cover',
        teaser: 'Why the most beautiful jackets this year are coming from the smallest printing runs.',
    },
];

const fadeUp = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.6, ease: 'easeOut' as const },
};

const Home: React.FC = () => {
    const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);
    const [authors, setAuthors] = useState<AuthorCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getBookIdentifier = (book: Book): string => String(book._id ?? book.id ?? book.title);

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/books?limit=6`);
                const normalized = normalizeBookCollection(res.data).books.slice(0, 6);
                if (normalized.length) {
                    setFeaturedBooks(normalized);
                    setError(null);
                } else {
                    setFeaturedBooks([]);
                    setError('Unable to load featured books right now. Please visit the marketplace for the full catalog.');
                }
            } catch (err) {
                console.error('Failed to load books', err);
                setFeaturedBooks([]);
                setError('Unable to load featured books right now. Please check your connection or try again later.');
            } finally {
                setLoading(false);
            }
        };
        void fetchBooks();
    }, []);

    useEffect(() => {
        const fetchAuthors = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/api/discovery/authors`);
                const list: AuthorCard[] = Array.isArray(data) ? data : (Array.isArray(data?.authors) ? data.authors : []);
                setAuthors(list.slice(0, 4));
            } catch (err) {
                console.error('Failed to load authors, using sample shelf', err);
                setAuthors([]);
            }
        };
        void fetchAuthors();
    }, []);

    const shelfAuthors: AuthorCard[] = authors.length ? authors : SAMPLE_AUTHORS;

    return (
        <main className="overflow-hidden bg-[#f4efe5]">
            {/* ── Hero ── */}
            <header className="relative py-20 sm:py-28 lg:py-32">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <motion.p {...fadeUp} className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#68675f]">
                        Lumina Book AI · Independent booksellers
                    </motion.p>
                    <motion.h1 {...fadeUp} className="mt-6 max-w-3xl font-serif text-5xl font-medium leading-[1.02] text-[#171713] sm:text-7xl">
                        Stories worth <em className="italic text-[#7d2428]">keeping close.</em>
                    </motion.h1>
                    <motion.p {...fadeUp} className="mt-7 max-w-xl text-lg leading-8 text-[#68675f]">
                        A small, carefully curated collection of fiction, essays, poetry, and field notes — chosen for the lives they might accompany.
                    </motion.p>
                    <motion.div {...fadeUp} className="mt-9 flex flex-col gap-3 sm:flex-row">
                        <Link
                            to="/marketplace"
                            className="inline-flex items-center justify-center rounded-[2px] bg-[#171713] px-7 py-3.5 text-sm font-semibold text-[#fffdf8] transition-colors hover:bg-[#7d2428]"
                        >
                            Shop the collection
                        </Link>
                        <a
                            href="#our-story"
                            className="inline-flex items-center justify-center rounded-[2px] border border-[#cec5b7] bg-transparent px-7 py-3.5 text-sm font-semibold text-[#171713] transition-colors hover:border-[#171713]"
                        >
                            Our story
                        </a>
                    </motion.div>

                    <motion.div {...fadeUp} className="mt-16 grid gap-4 sm:grid-cols-3 lg:gap-6">
                        {Array.from({ length: Math.min(3, Math.max(featuredBooks.length, 1)) }).map((_, index) => (
                            <div key={index} className="relative overflow-hidden rounded-[3px] border border-[#e8e1d4] bg-[#fffdf8]">
                                {featuredBooks.length ? (
                                    <Link to={`/book/${getBookIdentifier(featuredBooks[index])}`} className="block">
                                        <div className="aspect-[4/5] w-full overflow-hidden">
                                            <BookCover
                                                book={featuredBooks[index]}
                                                className="aspect-[4/5] w-full"
                                                imageClassName="object-cover transition-transform duration-700 hover:scale-[1.03]"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between border-t border-[#e8e1d4] px-4 py-3">
                                            <span className="font-serif text-lg text-[#171713]">{featuredBooks[index].title}</span>
                                            <span className="text-sm font-medium text-[#68675f]">
                                                {featuredBooks[index].price === 0 ? 'Free' : `₹${featuredBooks[index].price}`}
                                            </span>
                                        </div>
                                    </Link>
                                ) : (
                                    <div className="aspect-[4/5] w-full animate-pulse bg-[#ece6d9]" />
                                )}
                            </div>
                        ))}
                    </motion.div>
                </div>
            </header>

            {/* ── The current shelf ── */}
            <section className="py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <motion.div {...fadeUp}>
                        <SectionHeader
                            eyebrow="The current shelf"
                            title="Books to begin with"
                            linkTo="/marketplace"
                            linkLabel="Browse all books"
                        />
                    </motion.div>
                    {loading ? (
                        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
                            {Array.from({ length: 6 }).map((_, index) => <div key={index} className="aspect-[2/3] animate-pulse rounded-[2px] bg-[#ece6d9]" />)}
                        </div>
                    ) : error ? (
                        <div className="border border-dashed border-[#cec5b7] p-8 text-center text-[#68675f]">{error}</div>
                    ) : (
                        <motion.div {...fadeUp} className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-6">
                            {featuredBooks.map((book, index) => (
                                <ProductCard key={getBookIdentifier(book) || `featured-${index}`} book={book} />
                            ))}
                        </motion.div>
                    )}
                </div>
            </section>

            {/* ── About / values ── */}
            <section id="our-story" className="border-y border-[#e8e1d4] bg-[#fffdf8] py-20 sm:py-28">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#78806a]">A place for slow discovery</p>
                        <h2 className="mt-5 font-serif text-4xl leading-[1.1] text-[#171713] sm:text-5xl">
                            We choose books for the lives they might accompany.
                        </h2>
                        <p className="mt-6 leading-8 text-[#68675f]">
                            Every title on our shelves is read, argued over, and kept only if it earns its place. No algorithms deciding your next chapter — just human curation, honest notes, and books that stay with you long after the last page.
                        </p>
                        <Link to="/discover" className="mt-8 inline-flex items-center gap-2 border-b border-[#cec5b7] pb-1 text-sm font-semibold text-[#171713] transition-colors hover:border-[#7d2428] hover:text-[#7d2428]">
                            Read our story <span aria-hidden="true">→</span>
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* ── Authors ── */}
            <section className="py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <motion.div {...fadeUp}>
                        <SectionHeader
                            eyebrow="Writers on our shelves"
                            title="Meet the voices behind the books."
                            linkTo="/authors"
                            linkLabel="All authors"
                        />
                    </motion.div>
                    <motion.div {...fadeUp} className="grid gap-px overflow-hidden border border-[#e8e1d4] bg-[#e8e1d4] sm:grid-cols-2 lg:grid-cols-4">
                        {shelfAuthors.map((author, index) => (
                            <Link
                                key={author._id || author.name}
                                to={author._id ? `/authors/${author._id}` : '/authors'}
                                className="group bg-[#fffdf8] p-8 transition-colors hover:bg-[#f4efe5]"
                            >
                                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#78806a]">{String(index + 1).padStart(2, '0')}</p>
                                <h3 className="mt-6 font-serif text-2xl text-[#171713]">{author.name}</h3>
                                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#68675f]">{author.nationality || 'On our shelves'}</p>
                                {author.bio && <p className="mt-4 text-sm leading-7 text-[#68675f] line-clamp-4">{author.bio}</p>}
                                <span className="mt-6 inline-block border-b border-transparent pb-0.5 text-xs font-semibold text-[#171713] transition-colors group-hover:border-[#7d2428] group-hover:text-[#7d2428]">
                                    View author →
                                </span>
                            </Link>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ── Journal ── */}
            <section className="py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <motion.div {...fadeUp}>
                        <SectionHeader
                            eyebrow="From the journal"
                            title="Notes for a richer reading life"
                            linkTo="/discover"
                            linkLabel="Read the journal"
                        />
                    </motion.div>
                    <motion.div {...fadeUp} className="grid gap-8 md:grid-cols-3">
                        {JOURNAL_POSTS.map((post) => (
                            <Link key={post.title} to="/discover" className="group border-t-2 border-[#171713] pt-6">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7d2428]">{post.tag}</p>
                                <h3 className="mt-4 font-serif text-2xl leading-snug text-[#171713] transition-colors group-hover:text-[#7d2428]">{post.title}</h3>
                                <p className="mt-3 text-sm leading-7 text-[#68675f]">{post.teaser}</p>
                                <span className="mt-5 inline-block text-xs font-semibold uppercase tracking-[0.16em] text-[#68675f] transition-colors group-hover:text-[#7d2428]">
                                    Read note →
                                </span>
                            </Link>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ── Visit ── */}
            <section className="bg-[#171713] py-20 text-[#f4efe5] sm:py-28">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <motion.div {...fadeUp} className="grid items-center gap-12 lg:grid-cols-2">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#cec5b7]">Visit the shop</p>
                            <h2 className="mt-5 font-serif text-4xl leading-[1.08] sm:text-5xl" style={{ color: '#f4efe5' }}>Come for one book. Leave with a new direction.</h2>
                            <p className="mt-6 max-w-lg leading-8 text-[#cec5b7]">
                                Browse the shelves online, or find independent bookstores near you on our live map. Every visit starts with a single title.
                            </p>
                            <Link
                                to="/bookstore-explorer"
                                className="mt-9 inline-flex items-center justify-center rounded-[2px] bg-[#f4efe5] px-7 py-3.5 text-sm font-semibold text-[#171713] transition-colors hover:bg-[#fffdf8]"
                            >
                                Plan your visit
                            </Link>
                        </div>
                        <div className="border border-[#3a3a34] p-8 sm:p-10">
                            <dl className="space-y-6 text-sm">
                                <div>
                                    <dt className="text-[10px] uppercase tracking-[0.24em] text-[#918d85]">The shop</dt>
                                    <dd className="mt-2 font-serif text-xl text-[#f4efe5]">Lumina Book AI — Online & on the map</dd>
                                </div>
                                <div>
                                    <dt className="text-[10px] uppercase tracking-[0.24em] text-[#918d85]">Hours</dt>
                                    <dd className="mt-2 font-serif text-xl text-[#f4efe5]">Open daily · 10am – 6pm</dd>
                                </div>
                                <div>
                                    <dt className="text-[10px] uppercase tracking-[0.24em] text-[#918d85]">Say hello</dt>
                                    <dd className="mt-2 font-serif text-xl text-[#f4efe5]">support@bookverse.com</dd>
                                </div>
                            </dl>
                        </div>
                    </motion.div>
                </div>
            </section>
        </main>
    );
};

export default Home;
