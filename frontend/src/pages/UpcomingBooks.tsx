import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { API_URL } from '../config';
import DiscoveryCard from '../components/DiscoveryCard';
import { IAuthor, IPublisher, IUpcomingBook } from '../types';
import { normalizeUpcomingBook } from '../utils/discoveryCompatibility';

const nameOf = (ref?: string | IAuthor | IPublisher): string => typeof ref === 'object' && ref !== null ? ref.name : '';
const formatDate = (value?: string): string => value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Date TBA';

const UpcomingBooks: React.FC = () => {
    const [books, setBooks] = useState<IUpcomingBook[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const observerRef = React.useRef<IntersectionObserver | null>(null);
    const lastElementRef = React.useCallback((node: HTMLDivElement | null) => {
        if (loading) return;
        if (observerRef.current) observerRef.current.disconnect();
        observerRef.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observerRef.current.observe(node);
    }, [loading]);
    const ITEMS_PER_PAGE = 6;

    useEffect(() => {
        let active = true;
        const fetchUpcomingBooks = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data } = await axios.get(`${API_URL}/api/discovery/upcoming-books`, { params: { sort: 'releaseDate' } });
                if (!active) return;
                setBooks(Array.isArray(data) ? data.map(normalizeUpcomingBook) : []);
            } catch (err) {
                console.error('Error fetching upcoming books:', err);
                if (active) setError('Failed to load upcoming books. Please try again later.');
            } finally {
                if (active) setLoading(false);
            }
        };
        fetchUpcomingBooks();
        return () => { active = false; };
    }, []);

    const visibleBooks = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        let filtered = books;
        if (term) {
            filtered = books.filter(book => [book.title, nameOf(book.authorId), nameOf(book.publisherId), ...(book.genres || [])].join(' ').toLowerCase().includes(term));
        }
        return filtered.slice(0, page * ITEMS_PER_PAGE);
    }, [books, searchTerm, page]);

    const usedImageUrls = new Set<string>();
    const uniqueBookImage = (book: IUpcomingBook): string | undefined => {
        const candidate = book.coverImage?.url?.trim();
        if (!candidate || usedImageUrls.has(candidate)) return undefined;
        usedImageUrls.add(candidate);
        return candidate;
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen pt-24 pb-12 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-5">
                <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-900 p-6 shadow-2xl shadow-slate-200/40 dark:border-slate-800 dark:shadow-none sm:p-8 lg:p-10">
                    <div className="absolute inset-0">
                        <img
                            src="https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&q=80"
                            alt="Upcoming books banner"
                            className="h-full w-full object-cover opacity-30"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-indigo-950/80" />
                    </div>

                    <div className="relative z-10 grid gap-6 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-indigo-300">Coming soon</p>
                            <h1 className="mb-3 text-4xl font-black tracking-tight text-white md:text-5xl">Up next on the reading radar.</h1>
                            <p className="max-w-xl text-base text-slate-300 md:text-lg">
                                Keep an eye on the most anticipated releases, their authors, and the stories the community is already waiting for.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                            {[
                                { label: 'Anticipated', value: `${books.length}+` },
                                { label: 'Genres', value: '12' },
                                { label: 'Pre-orders', value: 'Live' }
                            ].map((stat) => (
                                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                                    <div className="text-2xl font-black text-white">{stat.value}</div>
                                    <div className="mt-1 text-sm text-slate-300">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.section>

                <div className="mt-8 flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-500">Releases</p>
                        <h2 className="font-outfit text-3xl font-bold text-slate-900 dark:text-white mb-2">Upcoming Books</h2>
                    </div>
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search title, author, genre..." className="w-full md:w-72 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm" />
                </div>
                {loading && page === 1 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="h-[420px] rounded-[1.8rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col animate-pulse">
                                <div className="w-full h-48 bg-slate-200 dark:bg-slate-800 rounded-xl mb-4"></div>
                                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-2"></div>
                                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-4"></div>
                                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full mb-2"></div>
                                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm text-red-500">{error}</div>
                ) : visibleBooks.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border border-slate-200 dark:border-slate-800 shadow-sm"><div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-4xl mb-6 mx-auto">📖</div><h3 className="font-outfit text-xl font-bold text-slate-900 dark:text-white mb-2">No upcoming books</h3><p className="text-slate-500 dark:text-slate-400">New releases will appear here as publishers announce them.</p></div>
                ) : (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {visibleBooks.map((book, index) => {
                                const isLastElement = index === visibleBooks.length - 1;
                                return (
                                    <motion.div 
                                        key={book._id} 
                                        ref={isLastElement ? lastElementRef : null}
                                        initial={{ opacity: 0, y: 20 }} 
                                        animate={{ opacity: 1, y: 0 }} 
                                        transition={{ delay: (index % ITEMS_PER_PAGE) * 0.1 }}
                                    >
                                        <DiscoveryCard title={book.title} subtitle={nameOf(book.authorId) || 'Author to be announced'} description={book.description} image={uniqueBookImage(book)} fallbackSeed={`upcoming-book:${book._id}:${index}`} fallbackIndex={index} badge={book.status?.replace('_', ' ') || 'ANNOUNCED'} label={formatDate(book.expectedReleaseDate)} to={`/marketplace?keyword=${encodeURIComponent(book.title)}`} />
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                        
                        {/* Loading more skeletons */}
                        {page * ITEMS_PER_PAGE < (books.length) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <div key={`more-${index}`} className="h-[420px] rounded-[1.8rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col animate-pulse opacity-50">
                                        <div className="w-full h-48 bg-slate-200 dark:bg-slate-800 rounded-xl mb-4"></div>
                                        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-2"></div>
                                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-4"></div>
                                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full mb-2"></div>
                                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </motion.div>
    );
};

export default UpcomingBooks;
