import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
// @ts-ignore
import { API_URL } from '../config';
import { Book } from '../types';
import { normalizeBook, normalizeBookCollection } from '../utils/bookCompatibility';

const Home: React.FC = () => {
    const { clearCart } = useCart();
    const { theme } = useTheme();
    const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);
    const [recommendations, setRecommendations] = useState<Book[]>([]);
    const [recommendationLabel, setRecommendationLabel] = useState('Live picks for you');
    const [recommendationBasis, setRecommendationBasis] = useState<'general' | 'history'>('general');
    const [recommendationLoading, setRecommendationLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paymentComplete, setPaymentComplete] = useState(false);

    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        if (query.get('payment') !== 'success') return;
        setPaymentComplete(true);
        void clearCart();
        window.history.replaceState({}, '', window.location.pathname);
    }, [clearCart]);

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

    const fetchRecommendations = async (refresh = false) => {
        setRecommendationLoading(true);
        try {
            const token = localStorage.getItem('token');
            const endpoint = token ? '/api/recommendations/personalized' : '/api/recommendations/general';
            let response;
            try {
                response = await axios.get(`${API_URL}${endpoint}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    params: refresh ? { refresh: 'true' } : undefined
                });
            } catch (personalizedError) {
                if (!token) throw personalizedError;
                response = await axios.get(`${API_URL}/api/recommendations/general`, { params: refresh ? { refresh: 'true' } : undefined });
            }
            const rawBooks = Array.isArray(response.data?.books) ? response.data.books : [];
            const seenIds = new Set<string>();
            const normalizedBooks = rawBooks
                .map((book: unknown, index: number) => normalizeBook(book, index))
                .filter((book: Book) => {
                    const id = String(book._id || book.id || book.title);
                    if (seenIds.has(id)) return false;
                    seenIds.add(id);
                    return true;
                })
                .slice(0, 4);
            setRecommendations(normalizedBooks);
            setRecommendationLabel(response.data?.label || 'Live picks for you');
            setRecommendationBasis(response.data?.basis === 'history' ? 'history' : 'general');
        } catch (err) {
            console.error('Failed to load recommendations', err);
            setRecommendations([]);
        } finally {
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

    const recommendationSection = theme === 'dark'
        ? 'bg-slate-950 text-white'
        : 'bg-gradient-to-br from-indigo-50 via-white to-pink-50 text-slate-900';

    return (
        <>
            {paymentComplete && <div className="fixed top-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-xl">Payment successful! Your order has been placed.</div>}

            <header className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white py-20 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -left-20 top-12 h-72 w-72 rounded-full bg-indigo-500/15 blur-[120px]" />
                    <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-pink-500/15 blur-[120px]" />
                    <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-500/10 blur-[120px]" />
                </div>

                <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 px-5 md:grid-cols-[1.1fr_0.9fr]">
                    <div className="animate-[fadeIn_0.6s_ease-out_forwards]">
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
                            AI-native reading discovery
                        </div>

                        <h1 className="mb-6 max-w-xl text-5xl font-black leading-tight text-slate-900 dark:text-white md:text-7xl">
                            Read by <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 bg-clip-text text-transparent">mood</span>, not just title.
                        </h1>

                        <p className="mb-8 max-w-xl text-lg text-slate-600 dark:text-slate-300">
                            Discover books through vibe, theme, trope, and story emotion. Buy your next favorite, sell used treasures, and read with a smart assistant built around your taste.
                        </p>

                        <div className="flex flex-wrap gap-4">
                            <Link to="/marketplace" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-7 py-4 text-lg font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-1 hover:shadow-xl">
                                Browse the shelf <span>→</span>
                            </Link>
                            <Link to="/sell" className="inline-flex items-center rounded-xl border border-slate-200 bg-white/80 px-7 py-4 text-lg font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                                Sell a book
                            </Link>
                        </div>

                        <div className="mt-8 flex flex-wrap gap-3">
                            {['Dark fantasy romance', 'Cozy literary fiction', 'Slow-burn thrillers', 'Philosophical sci-fi'].map((tag) => (
                                <span key={tag} className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="relative animate-[fadeIn_0.6s_ease-out_0.2s_forwards] opacity-0">
                        <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-slate-950 p-4 shadow-[0_30px_80px_rgba(79,70,229,0.25)]">
                            <div className="rounded-[1.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-200">Trending AI shelf</p>
                                        <h3 className="mt-2 text-2xl font-bold text-white">For your next obsession</h3>
                                    </div>
                                    <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Live</span>
                                </div>

                                <div className="mt-5 space-y-3">
                                    {[
                                        { title: 'The Glass Archive', author: 'Aarav Sen', tag: 'Literary mystery', price: '₹499' },
                                        { title: 'Signal of the Ember Sea', author: 'Naira Khanna', tag: 'Epic sci-fi', price: '₹649' },
                                        { title: 'The Orchard Between Worlds', author: 'Rhea Mishra', tag: 'Romantic fantasy', price: '₹579' }
                                    ].map((book) => (
                                        <div key={book.title} className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                                            <img src="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80" alt={book.title} className="h-20 w-16 rounded-xl object-cover" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-white">{book.title}</p>
                                                <p className="text-xs text-slate-400">{book.author}</p>
                                                <span className="mt-1 inline-block rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200">{book.tag}</span>
                                            </div>
                                            <div className="text-right text-sm font-bold text-indigo-300">{book.price}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <section className="relative py-20">
                <div className="mx-auto max-w-7xl px-5">
                    <div className="mb-12 text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500">Why LuminaBook AI</p>
                        <h2 className="mt-3 text-4xl font-bold text-slate-900 dark:text-white">One platform for discovery, buying, and reading.</h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                        {[
                            {
                                title: 'Mood-based discovery',
                                text: 'Tell the AI what you want to feel, and it surfaces books that match your emotional taste.',
                                icon: '✦'
                            },
                            {
                                title: 'Used-book marketplace',
                                text: 'Buy and sell secondhand books with trust, quality checks, and cleaner inventory.',
                                icon: '↺'
                            },
                            {
                                title: 'Semantic search',
                                text: 'Search the catalogue by concept, theme, or story similarity rather than exact titles.',
                                icon: '⌕'
                            },
                            {
                                title: 'AI reading assistant',
                                text: 'Generate reading paths, summaries, and smarter recommendations as you explore.',
                                icon: '⚡'
                            }
                        ].map((feature) => (
                            <div key={feature.title} className="group rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/80">
                                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 text-xl font-bold text-white shadow-lg shadow-indigo-500/20">
                                    {feature.icon}
                                </div>
                                <h3 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                                <p className="text-base text-slate-600 dark:text-slate-300">{feature.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className={`relative overflow-hidden py-20 transition-colors duration-300 ${recommendationSection}`}>
                <div className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-pink-500/15 blur-3xl" />
                <div className="relative mx-auto max-w-7xl px-5">
                    <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className={`mb-2 text-sm font-semibold uppercase tracking-[0.22em] ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-600'}`}>Live recommendations</p>
                            <h2 className="text-3xl font-bold sm:text-4xl">{recommendationLabel}</h2>
                            <p className={`mt-3 max-w-xl ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                {recommendationBasis === 'history' ? 'Personalized from your LuminaBook reading history.' : 'Fresh picks from the live catalog and reader preferences.'}
                            </p>
                        </div>

                        <button onClick={() => void fetchRecommendations(true)} disabled={recommendationLoading} className={`self-start rounded-xl border px-5 py-3 text-sm font-semibold transition sm:self-auto disabled:cursor-not-allowed disabled:opacity-60 ${theme === 'dark' ? 'border-white/20 bg-white/10 hover:bg-white/20 text-white' : 'border-indigo-200 bg-white/80 text-indigo-700 shadow-sm hover:bg-white hover:border-indigo-300'}`}>
                            {recommendationLoading ? 'Refreshing…' : 'Refresh picks ↻'}
                        </button>
                    </div>

                    {recommendationLoading ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className={`h-80 animate-pulse rounded-2xl ${theme === 'dark' ? 'bg-white/10' : 'bg-indigo-100/70'}`} />
                            ))}
                        </div>
                    ) : recommendations.length ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                            {recommendations.map((book, index) => (
                                <ProductCard key={book._id || book.id || `recommendation-${index}`} book={book} />
                            ))}
                        </div>
                    ) : (
                        <div className={`rounded-2xl border p-8 ${theme === 'dark' ? 'border-white/10 bg-white/5 text-slate-300' : 'border-indigo-100 bg-white/80 text-slate-600 shadow-sm'}`}>
                            Recommendations will appear when books are available in the catalog.
                        </div>
                    )}
                </div>
            </section>

            <section className="py-24 relative">
                <div className="mx-auto max-w-7xl px-5">
                    <div className="mb-16 text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500">Featured titles</p>
                        <h2 className="mt-3 text-4xl font-bold text-slate-900 dark:text-white">Curated favorites from the community</h2>
                    </div>

                    {loading ? (
                        <div className="text-center p-10 text-slate-500 animate-pulse">Loading bestsellers...</div>
                    ) : error ? (
                        <div className="rounded-2xl border border-dashed border-red-200 bg-red-50/60 p-8 text-center text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                            {error}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                            {featuredBooks.map((book, index) => (
                                <ProductCard key={book._id || book.id || `featured-${index}`} book={book} />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="bg-slate-50 py-24 dark:bg-slate-900/60">
                <div className="mx-auto max-w-7xl px-5">
                    <div className="mb-12 text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500">Popular genres</p>
                        <h2 className="mt-3 text-4xl font-bold text-slate-900 dark:text-white">Explore shelves built for every kind of reader</h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                        {[
                            { name: 'Fiction', image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&q=80', accent: 'from-indigo-600 to-blue-500', description: 'Stories that stay with you long after the final page.' },
                            { name: 'Sci-Fi', image: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&q=80', accent: 'from-purple-600 to-pink-500', description: 'Bold futures, deep ideas, and impossible worlds.' },
                            { name: 'History', image: 'https://images.unsplash.com/photo-1524578271613-d550eacf6090?auto=format&fit=crop&q=80', accent: 'from-amber-500 to-orange-500', description: 'Grounded narratives and human stories that endure.' },
                            { name: 'Technology', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80', accent: 'from-cyan-500 to-indigo-600', description: 'Practical insight for curious minds and builders.' }
                        ].map((genre) => (
                            <Link key={genre.name} to={`/categories?genre=${genre.name}`} className="group relative overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
                                <div className={`h-52 bg-gradient-to-r ${genre.accent}`}>
                                    <img src={genre.image} alt={genre.name} className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105" />
                                </div>
                                <div className="p-5">
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{genre.name}</h3>
                                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{genre.description}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-24 text-center">
                <div className="mx-auto max-w-5xl px-5">
                    <h2 className="mb-6 text-5xl font-bold text-slate-900 dark:text-white">Build your personal library with LuminaBook AI</h2>
                    <p className="mx-auto mb-10 max-w-2xl text-xl text-slate-500 dark:text-slate-400">
                        Follow recommendations, trade secondhand finds, and discover your next favorite read through one seamless discovery engine.
                    </p>
                    <Link to="/login" className="inline-flex items-center rounded-full bg-gradient-to-r from-pink-500 to-indigo-600 px-10 py-4 text-lg font-bold text-white shadow-2xl shadow-indigo-500/30 transition-all hover:-translate-y-1">
                        Get started
                    </Link>
                </div>
            </section>
        </>
    );
};

export default Home;
