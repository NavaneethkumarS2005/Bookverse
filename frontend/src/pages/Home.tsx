import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import BookCover from '../components/BookCover';
import { API_URL } from '../config';
import { Book } from '../types';
import { normalizeBook, normalizeBookCollection } from '../utils/bookCompatibility';

const genres = [
    { name: 'Fiction', image: '/images/reading corner.jpeg', tone: 'bg-[#F8E7A1]', description: 'Stories to settle into, return to, and carry with you.' },
    { name: 'Sci-Fi', image: '/images/genre-collection.png', tone: 'bg-[#DCD6F7]', description: 'Strange futures, big questions, and new worlds.' },
    { name: 'History', image: '/images/future library.jpeg', tone: 'bg-[#B9D5BE]', description: 'Human stories that give the present more depth.' },
    { name: 'Technology', image: '/images/genres.jpeg', tone: 'bg-[#FFCCB8]', description: 'Ideas and practical insight for curious minds.' },
];

const Home: React.FC = () => {
    const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);
    const [recommendations, setRecommendations] = useState<Book[]>([]);
    const [recommendationLabel, setRecommendationLabel] = useState('Live picks for you');
    const [recommendationBasis, setRecommendationBasis] = useState<'general' | 'history'>('general');
    const [recommendationLoading, setRecommendationLoading] = useState(true);
    const [recommendationError, setRecommendationError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/books?limit=4`);
                const normalized = normalizeBookCollection(res.data).books.slice(0, 4);
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

    const lastRecommendationSignatureRef = React.useRef<string>('');
    const recommendationRequestRef = React.useRef(false);
    const getBookIdentifier = (book: Book): string => String(book._id ?? book.id ?? book.title);

    const fetchRecommendations = async (refresh = false, attempt = 0) => {
        if (recommendationRequestRef.current) return;

        recommendationRequestRef.current = true;
        setRecommendationLoading(true);

        try {
            const isAuthenticated = Boolean(localStorage.getItem('user'));
            const endpoint = isAuthenticated ? '/api/recommendations/personalized' : '/api/recommendations/general';
            let response;
            try {
                response = await axios.get(`${API_URL}${endpoint}`, {
                    withCredentials: true,
                    params: refresh ? { refresh: 'true' } : undefined,
                });
            } catch (personalizedError) {
                if (!isAuthenticated) throw personalizedError;
                response = await axios.get(`${API_URL}/api/recommendations/general`, {
                    params: refresh ? { refresh: 'true' } : undefined,
                });
            }

            const rawBooks = Array.isArray(response.data?.books) ? response.data.books : [];
            const seenIds = new Set<string>();
            const normalizedBooks: Book[] = rawBooks
                .map((book: unknown, index: number): Book => normalizeBook(book, index))
                .filter((book: Book): boolean => {
                    const id = getBookIdentifier(book);
                    if (seenIds.has(id)) return false;
                    seenIds.add(id);
                    return true;
                })
                .slice(0, 4);

            const nextSignature = normalizedBooks.map(getBookIdentifier).join('|');
            if (refresh && attempt < 2 && lastRecommendationSignatureRef.current && nextSignature === lastRecommendationSignatureRef.current && normalizedBooks.length > 1) {
                return fetchRecommendations(true, attempt + 1);
            }

            setRecommendations(normalizedBooks);
            lastRecommendationSignatureRef.current = nextSignature;
            setRecommendationLabel(response.data?.label || 'Live picks for you');
            setRecommendationBasis(response.data?.basis === 'history' ? 'history' : 'general');
            setRecommendationError(null);
        } catch (err) {
            console.error('Failed to load recommendations', err);
            setRecommendationError('Recommendations are temporarily unavailable. The catalog or backend request is not responding right now.');
        } finally {
            recommendationRequestRef.current = false;
            setRecommendationLoading(false);
        }
    };

    useEffect(() => {
        void fetchRecommendations();
        const handleAuthChange = () => void fetchRecommendations(true);
        window.addEventListener('storage', handleAuthChange);
        const refreshTimer = window.setInterval(() => void fetchRecommendations(true), 5 * 60 * 1000);
        return () => {
            window.removeEventListener('storage', handleAuthChange);
            window.clearInterval(refreshTimer);
        };
    }, []);

    const heroBooks = featuredBooks.slice(0, 3);

    return (
        <main className="overflow-hidden">
            <header className="relative bg-[#FFFDF8] py-14 sm:py-24 lg:py-28">
                <div className="absolute -right-40 top-0 h-96 w-96 rounded-full bg-[#F8E7A1]/35 blur-3xl" />
                <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[#B9D5BE]/25 blur-3xl" />
                <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-8">
                    <div className="max-w-2xl">
                        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-[#7965D8]">Lumina Book AI · an independent bookstore online</p>
                        <h1 className="max-w-xl font-serif text-5xl font-semibold leading-[0.95] tracking-[-0.05em] text-[#29243A] sm:text-7xl">
                            Stories worth <em className="text-[#7965D8]">keeping close.</em>
                        </h1>
                        <p className="mt-7 max-w-lg text-lg leading-8 text-[#716B7E] sm:text-xl">
                            Thoughtful discovery, real catalogue titles, and a little help finding the book that fits the moment.
                        </p>
                        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                            <Link to="/marketplace" className="inline-flex items-center justify-center rounded-full bg-[#7965D8] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#7965D8]/20 transition hover:-translate-y-0.5 hover:bg-[#6754C4] focus-visible:ring-4 focus-visible:ring-[#7965D8]/25">
                                Explore the shelves <span className="ml-2 text-lg">→</span>
                            </Link>
                            <Link to="/discover" className="inline-flex items-center justify-center rounded-full border border-[#DAD2C5] bg-white/70 px-7 py-3.5 text-sm font-semibold text-[#29243A] transition hover:-translate-y-0.5 hover:border-[#7965D8]">
                                Discover by feeling
                            </Link>
                        </div>
                        <div className="mt-10 flex items-center gap-4 border-t border-[#E7E1D8] pt-5 text-sm text-[#716B7E]">
                            <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#7965D8]">01 / welcome in</span>
                            <span className="h-px w-10 bg-[#DAD2C5]" />
                            <span>For curious readers and repeat visitors</span>
                        </div>
                    </div>

                    <div className="relative min-h-[410px] sm:min-h-[540px]">
                        <div className="absolute inset-0 overflow-hidden rounded-[2rem] border border-[#E7E1D8] bg-[#F7F3EC] shadow-[0_24px_70px_rgba(41,36,58,0.12)]">
                            <img src="/images/bookstore-hero-editorial.png" alt="Warm independent bookstore with an open book" className="h-full w-full object-cover opacity-80 mix-blend-multiply" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#29243A]/65 via-[#29243A]/5 to-transparent" />
                            <div className="absolute bottom-6 left-6 right-6 text-white sm:bottom-8 sm:left-8">
                                <p className="text-xs uppercase tracking-[0.24em] text-[#F8E7A1]">The reading room</p>
                                <p className="mt-2 max-w-xs font-serif text-2xl leading-tight sm:text-3xl">Make space for a story that stays.</p>
                            </div>
                        </div>
                        {heroBooks.length > 0 && (
                            <div className="absolute -bottom-8 right-3 flex items-end gap-2 sm:-right-6 sm:gap-3">
                                {heroBooks.map((book, index) => (
                                    <Link key={getBookIdentifier(book)} to={`/book/${getBookIdentifier(book)}`} aria-label={`View ${book.title}`} className={`block overflow-hidden rounded-lg border-4 border-[#FFFDF8] shadow-xl transition hover:-translate-y-2 ${index === 1 ? 'w-24 sm:w-32' : 'w-20 sm:w-28'}`}>
                                        <BookCover book={book} className="aspect-[2/3] w-full" imageClassName="object-cover" />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <section className="bg-white py-16 sm:py-20">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <div className="grid gap-8 border-y border-[#E7E1D8] py-8 md:grid-cols-3">
                        {[
                            ['01', 'Find your feeling', 'Explore by mood, theme, and curiosity.'],
                            ['02', 'Meet your next book', 'Browse live titles with real details.'],
                            ['03', 'Keep reading', 'Save favourites and build your cart.'],
                        ].map(([number, title, text]) => (
                            <div key={number} className="flex gap-4">
                                <span className="font-mono text-xs text-[#7965D8]">{number}</span>
                                <div>
                                    <h2 className="font-serif text-2xl text-[#29243A]">{title}</h2>
                                    <p className="mt-2 text-sm leading-6 text-[#716B7E]">{text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-[#FFFDF8] py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <div className="mb-10 flex items-end justify-between gap-5">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7965D8]">From the live catalogue</p>
                            <h2 className="mt-3 font-serif text-4xl text-[#29243A] sm:text-5xl">Books to linger over</h2>
                        </div>
                        <Link to="/marketplace" className="hidden text-sm font-semibold text-[#7965D8] hover:text-[#6754C4] sm:block">View all books →</Link>
                    </div>
                    {loading ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-80 animate-pulse rounded-2xl bg-[#F0EBE3]" />)}</div>
                    ) : error ? (
                        <div className="rounded-2xl border border-dashed border-[#D7A7A7] bg-[#FFF6F6] p-8 text-center text-[#9A4747]">{error}</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">{featuredBooks.map((book, index) => <ProductCard key={getBookIdentifier(book) || `featured-${index}`} book={book} />)}</div>
                    )}
                    <Link to="/marketplace" className="mt-8 inline-flex text-sm font-semibold text-[#7965D8] sm:hidden">View all books →</Link>
                </div>
            </section>

            <section className="bg-[#F7F3EC] py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                        <div className="max-w-2xl">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7965D8]">A little help from Lumina</p>
                            <h2 className="mt-3 font-serif text-4xl text-[#29243A]  sm:text-5xl">{recommendationLabel}</h2>
                            <p className="mt-3 text-[#716B7E] ">
                                {recommendationBasis === 'history' ? 'Personalized from your Lumina Book AI reading history.' : 'Fresh picks from the live catalogue and reader preferences.'}
                            </p>
                        </div>
                        <button onClick={() => void fetchRecommendations(true)} disabled={recommendationLoading} className="self-start rounded-full border border-[#CFC5B7] bg-white/70 px-5 py-2.5 text-sm font-semibold text-[#29243A] transition hover:border-[#7965D8] disabled:cursor-not-allowed disabled:opacity-60    sm:self-auto">
                            {recommendationLoading ? 'Refreshing…' : 'Refresh picks ↻'}
                        </button>
                    </div>
                    {recommendationLoading ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-80 animate-pulse rounded-2xl bg-[#E8E1D7] " />)}</div>
                    ) : recommendations.length ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">{recommendations.map((book, index) => <ProductCard key={getBookIdentifier(book) || `recommendation-${index}`} book={book} />)}</div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-[#CFC5B7] p-8 text-center text-[#716B7E]  ">Recommendations will appear when books are available in the catalogue.</div>
                    )}
                    {recommendationError && <p className="mt-5 rounded-xl border border-[#E5C7A5] bg-[#FFF7E9] px-4 py-3 text-sm text-[#76501F]   ">{recommendationError}</p>}
                </div>
            </section>

            <section className="bg-[#FFFDF8] py-20  sm:py-24">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <div className="mb-10 max-w-2xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7965D8]">Choose a doorway</p>
                        <h2 className="mt-3 font-serif text-4xl text-[#29243A]  sm:text-5xl">Where are you wandering today?</h2>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {genres.map((genre) => (
                            <Link key={genre.name} to={`/categories?genre=${encodeURIComponent(genre.name)}`} className={`group overflow-hidden rounded-2xl border border-[#E7E1D8] ${genre.tone} shadow-sm transition hover:-translate-y-1 hover:shadow-lg `}>
                                <div className="h-36 overflow-hidden">
                                    <img src={genre.image} alt="" className="h-full w-full object-cover mix-blend-multiply transition duration-500 group-hover:scale-105  " />
                                </div>
                                <div className="p-5">
                                    <h3 className="font-serif text-2xl text-[#29243A]">{genre.name}</h3>
                                    <p className="mt-2 text-sm leading-6 text-[#716B7E]">{genre.description}</p>
                                    <span className="mt-5 inline-block text-sm font-semibold text-[#6754C4]">Explore {genre.name} →</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-[#7965D8] px-5 py-20 text-center text-white sm:py-24">
                <div className="mx-auto max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#F8E7A1]">Keep a good story nearby</p>
                    <h2 className="mt-4 font-serif text-4xl sm:text-6xl">Your next favourite is waiting on a shelf.</h2>
                    <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/80">Browse real catalogue titles, follow your curiosity, and let Lumina Book AI help you find the book that feels right.</p>
                    <Link to="/marketplace" className="mt-8 inline-flex rounded-full bg-[#FFFDF8] px-7 py-3.5 text-sm font-semibold text-[#29243A] transition hover:-translate-y-0.5 hover:bg-white">Browse the marketplace →</Link>
                </div>
            </section>
        </main>
    );
};

export default Home;
