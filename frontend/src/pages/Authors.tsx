import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import DiscoveryCard from '../components/DiscoveryCard';
import { IAuthor } from '../types';

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=400&q=80';

const Authors: React.FC = () => {
    const [authors, setAuthors] = useState<IAuthor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGenre, setSelectedGenre] = useState('All');

    useEffect(() => {
        let active = true;

        const fetchAuthors = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data } = await axios.get(`${API_URL}/api/discovery/authors`);
                if (!active) return;
                setAuthors(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error fetching authors:', err);
                if (active) setError('Failed to load authors. Please try again later.');
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchAuthors();
        return () => {
            active = false;
        };
    }, []);

    const genres = useMemo(() => {
        const unique = new Set<string>();
        authors.forEach(author => (author.genres || []).forEach(genre => unique.add(genre)));
        return ['All', ...Array.from(unique).sort()];
    }, [authors]);

    const visibleAuthors = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return authors.filter(author => {
            const matchesGenre = selectedGenre === 'All' || (author.genres || []).includes(selectedGenre);
            const matchesTerm =
                !term ||
                [author.name, author.bio, author.nationality, ...(author.genres || [])]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                    .includes(term);
            return matchesGenre && matchesTerm;
        });
    }, [authors, searchTerm, selectedGenre]);

    return (
        <div className="min-h-screen pt-24 pb-12 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="font-outfit text-4xl font-bold text-slate-900 dark:text-white mb-2">Authors</h1>
                        <p className="text-slate-500 dark:text-slate-400">Meet the writers behind the shelves.</p>
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search authors..."
                        className="w-full md:w-72 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                    />
                </div>

                {genres.length > 1 && (
                    <div className="flex flex-wrap gap-2 mb-10">
                        {genres.map(genre => (
                            <button
                                key={genre}
                                type="button"
                                onClick={() => setSelectedGenre(genre)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${selectedGenre === genre
                                    ? 'bg-indigo-500 border-indigo-500 text-white shadow-md'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700'
                                    }`}
                            >
                                {genre}
                            </button>
                        ))}
                    </div>
                )}

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
                ) : visibleAuthors.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-4xl mb-6 mx-auto">✍️</div>
                        <h3 className="font-outfit text-xl font-bold text-slate-900 dark:text-white mb-2">No authors found</h3>
                        <p className="text-slate-500 dark:text-slate-400">Try a different search term or genre filter.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {visibleAuthors.map(author => (
                            <DiscoveryCard
                                key={author._id}
                                title={author.name}
                                subtitle={author.nationality || 'Region not listed'}
                                description={author.bio}
                                image={author.photo?.url || author.avatarUrl || FALLBACK_AVATAR}
                                badge={author.isFeatured ? 'Featured' : author.genres?.[0] || 'Author'}
                                label={author.language?.join(', ') || undefined}
                                to={`/authors/${author._id}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Authors;
