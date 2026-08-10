import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';
// @ts-ignore
import { API_URL } from '../config';

import { Book } from '../types';

const Home: React.FC = () => {
    const { clearCart } = useCart();
    // Initialize as empty array but typed as Book[]
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
                // Handle paginated response { books: [], total: ... } or legacy array
                const bookData = res.data.books || res.data;
                if (Array.isArray(bookData)) {
                    setFeaturedBooks(bookData.slice(0, 4));
                    setError(null);
                } else {
                    console.error("Expected array for books, got:", typeof bookData);
                    setFeaturedBooks([]);
                    setError('Unable to load featured books right now. Please visit the marketplace for the full catalog.');
                }
            } catch (err) {
                console.error("Failed to load books", err);
                setError('Unable to load featured books right now. Please check your connection or try again later.');
            } finally {
                setLoading(false);
            }
        };
        fetchBooks();
    }, []);

    const fetchRecommendations = async (refresh = false) => {
        setRecommendationLoading(true);
        try {
            const token = localStorage.getItem('token');
            const endpoint = token ? '/api/recommendations/personalized' : `/api/recommendations/general${refresh ? '?refresh=true' : ''}`;
            const response = await axios.get(`${API_URL}${endpoint}`, token ? { headers: { Authorization: `Bearer ${token}` }, params: refresh ? { refresh: 'true' } : undefined } : undefined);
            setRecommendations((response.data.books || []).slice(0, 4));
            setRecommendationLabel(response.data.label || 'Live picks for you');
            setRecommendationBasis(response.data.basis === 'history' ? 'history' : 'general');
        } catch (err) {
            console.error('Failed to load recommendations', err);
            setRecommendations([]);
        } finally {
            setRecommendationLoading(false);
        }
    };

    useEffect(() => { void fetchRecommendations(); }, []);

    return (
        <>
            {paymentComplete && (
                <div className="fixed top-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-xl">
                    Payment successful! Your order has been placed.
                </div>
            )}
            {/* HERO SECTION */}
            <header className="min-h-[calc(100vh-72px)] flex items-center relative overflow-hidden py-20 bg-gradient-to-b from-indigo-50/50 via-white to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
                {/* Background Blobs for specific mood */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[100px] animate-pulse"></div>
                    <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-pink-500/10 blur-[100px] animate-pulse delay-700"></div>
                </div>

                <div className="max-w-7xl mx-auto px-5 grid grid-cols-1 md:grid-cols-2 items-center gap-16 w-full relative z-10">

                    <div className="animate-[fadeIn_0.6s_ease-out_forwards]">
                        <h1 className="font-outfit text-5xl md:text-7xl font-extrabold mb-6 leading-tight text-slate-900 dark:text-white">
                            Discover Your Next <span className="bg-gradient-to-br from-indigo-600 to-pink-500 bg-clip-text text-transparent">Great Read</span>
                        </h1>

                        <p className="text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-lg leading-relaxed font-light">
                            Your gateway to a universe of stories. Buy, sell, and connect with a community that shares your passion for books.
                        </p>

                        <div className="flex flex-wrap gap-4">
                            <Link to="/marketplace" className="px-8 py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-1 transition-all text-lg shadow-indigo-500/30 flex items-center gap-2">
                                <span>Browse Books</span>
                                <span>→</span>
                            </Link>
                            <Link to="/sell" className="px-8 py-4 rounded-xl font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-500 hover:-translate-y-1 transition-all text-lg bg-white/50 backdrop-blur-sm">
                                Sell a Book
                            </Link>
                        </div>
                    </div>

                    <div className="flex justify-center animate-[fadeIn_0.6s_ease-out_0.2s_forwards] opacity-0 relative">
                        <div className="relative z-10">
                            <img
                                src="/images/hero-book.png"
                                alt="Magical Book"
                                className="max-w-full max-h-[550px] drop-shadow-2xl animate-[float_6s_ease-in-out_infinite] transform hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                        {/* Glow effect behind book */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-indigo-500/20 blur-[80px] rounded-full -z-10"></div>
                    </div>

                </div>
            </header>

            {/* LIVE RECOMMENDATIONS */}
            <section className="relative overflow-hidden bg-slate-950 py-20 text-white">
                <div className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
                <div className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-pink-500/25 blur-3xl" />
                <div className="relative mx-auto max-w-7xl px-5">
                    <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-indigo-300">Live recommendations</p>
                            <h2 className="font-outfit text-3xl font-bold sm:text-4xl">{recommendationLabel}</h2>
                            <p className="mt-3 max-w-xl text-slate-300">{recommendationBasis === 'history' ? 'Tailored from the books you have enjoyed with BookVerse.' : 'A live selection from our catalog. Sign in and build your reading history for personalized suggestions.'}</p>
                        </div>
                        <button onClick={() => void fetchRecommendations(true)} disabled={recommendationLoading} className="self-start rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto">
                            {recommendationLoading ? 'Refreshing…' : 'Refresh picks ↻'}
                        </button>
                    </div>
                    {recommendationLoading ? <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-80 animate-pulse rounded-2xl bg-white/10" />)}</div>
                        : recommendations.length ? <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">{recommendations.map(book => <ProductCard key={book._id || book.id} book={book} />)}</div>
                        : <div className="rounded-2xl border border-white/15 bg-white/5 p-8 text-slate-300">Recommendations will appear when the catalog is available.</div>}
                </div>
            </section>

            {/* FEATURED BOOKS */}
            <section className="py-24 relative">
                <div className="max-w-7xl mx-auto px-5">
                    <div className="text-center mb-16">
                        <h2 className="font-outfit text-4xl font-bold mb-4 text-slate-900 dark:text-white">Featured Titles</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-lg">Top picks from our community</p>
                    </div>

                    {loading ? (
                        <div className="text-center p-10 text-slate-500 animate-pulse">Loading bestsellers...</div>
                    ) : error ? (
                        <div className="text-center p-8 rounded-2xl border border-dashed border-red-200 bg-red-50/60 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                            {error}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                            {featuredBooks.map(book => (
                                <ProductCard key={book.id} book={book} />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* CATEGORIES */}
            <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
                <div className="max-w-7xl mx-auto px-5 grid grid-cols-1 md:grid-cols-2 items-center gap-20">

                    <div>
                        <h2 className="font-outfit text-4xl font-bold mb-6 text-slate-900 dark:text-white">Explore Genres</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-lg mb-10 leading-relaxed">
                            Dive into our extensive catalog organized by genre and interest. Find exactly what you are looking for.
                        </p>
                        <ul className="grid grid-cols-2 gap-x-8 gap-y-4 mb-10">
                            {['Fiction', 'Sci-Fi', 'History', 'Technology', 'Romance', 'Mystery'].map(genre => (
                                <li key={genre}>
                                    <Link to={`/categories?genre=${genre}`} className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group">
                                        <span className="text-indigo-500 group-hover:scale-125 transition-transform">•</span> {genre}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <Link to="/categories" className="inline-flex items-center px-6 py-3 rounded-xl font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-500 transition-all shadow-sm">
                            View All Categories
                        </Link>
                    </div>

                    <div className="flex justify-center items-center">
                        <img
                            src="/images/genre-collection.png"
                            alt="Genre Collection"
                            className="max-w-full h-auto max-h-[400px] drop-shadow-2xl rounded-3xl animate-[float_8s_ease-in-out_infinite_reverse]"
                        />
                    </div>

                </div>
            </section>

            {/* CTA */}
            <section className="py-24 text-center bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
                <div className="max-w-4xl mx-auto px-5">
                    <h2 className="font-outfit text-5xl font-bold mb-6 text-slate-900 dark:text-white">Join the BookVerse</h2>
                    <p className="text-xl text-slate-500 dark:text-slate-400 mb-10 max-w-lg mx-auto">
                        Sign up today to start your collection or declutter your shelf.
                    </p>
                    <Link to="/login" className="px-10 py-4 rounded-full font-bold text-white bg-gradient-to-r from-pink-500 to-indigo-600 hover:shadow-2xl hover:-translate-y-1 transition-all text-lg shadow-indigo-500/40">
                        Get Started
                    </Link>
                </div>
            </section>
        </>
    );
};

export default Home;
