import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import DiscoveryCard from '../components/DiscoveryCard';
import { IAuthor, IPublisher, IUpcomingBook } from '../types';

const FALLBACK_COVER = '/images/hero-book.png';

const nameOf = (ref?: string | IAuthor | IPublisher): string =>
    typeof ref === 'object' && ref !== null ? ref.name : '';

const formatDate = (value?: string): string =>
    value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Date TBA';

const UpcomingBooks: React.FC = () => {
    const [books, setBooks] = useState<IUpcomingBook[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        let active = true;

        const fetchUpcomingBooks = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data } = await axios.get(`${API_URL}/api/discovery/upcoming-books`, {
                    params: { sort: 'releaseDate' }
                });
                if (!active) return;
                setBooks(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error fetching upcoming books:', err);
                if (active) setError('Failed to load upcoming books. Please try again later.');
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchUpcomingBooks();
        return () => {
            active = false;
        };
    }, []);

    const visibleBooks = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return books;
        return books.filter(book =>
            [book.title, nameOf(book.authorId), nameOf(book.publisherId), ...(book.genres || [])]
                .join(' ')
                .toLowerCase()
                .includes(term)
        );
    }, [books, searchTerm]);

    return (
        <div className="min-h-screen pt-24 pb-12 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <h1 className="font-outfit text-4xl font-bold text-slate-900 dark:text-white mb-2">Upcoming Books</h1>
                        <p className="text-slate-500 dark:text-slate-400">Announced titles, release dates and pre-order links.</p>
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search title, author, genre..."
                        className="w-full md:w-72 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                    />
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="h-80 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm text-red-500">
                        {error}
                    </div>
                ) : visibleBooks.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-4xl mb-6 mx-auto">📖</div>
                        <h3 className="font-outfit text-xl font-bold text-slate-900 dark:text-white mb-2">No upcoming books</h3>
                        <p className="text-slate-500 dark:text-slate-400">New releases will appear here as publishers announce them.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {visibleBooks.map(book => (
                            <DiscoveryCard
                                key={book._id}
                                title={book.title}
                                subtitle={nameOf(book.authorId) || 'Author to be announced'}
                                description={book.description}
                                image={book.coverImage?.url || FALLBACK_COVER}
                                badge={book.status?.replace('_', ' ') || 'ANNOUNCED'}
                                label={formatDate(book.expectedReleaseDate)}
                                to={`/marketplace?keyword=${encodeURIComponent(book.title)}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UpcomingBooks;
