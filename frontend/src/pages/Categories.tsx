import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
// @ts-ignore
import { API_URL } from '../config';
import ProductCard from '../components/ProductCard';
import { Book } from '../types';
import { normalizeBookCollection } from '../utils/bookCompatibility';

const collectionCards = [
    {
        title: 'Bestsellers',
        description: 'Readers keep returning to these celebrated favorites for a reason.',
        accent: 'from-indigo-600 to-blue-500',
        image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80',
    },
    {
        title: 'New Arrivals',
        description: 'Fresh voices, bold debuts, and titles the community is reading now.',
        accent: 'from-pink-500 to-rose-500',
        image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&q=80',
    },
    {
        title: 'Staff Picks',
        description: 'A carefully chosen list for readers who want atmosphere and depth.',
        accent: 'from-amber-500 to-orange-500',
        image: 'https://images.unsplash.com/photo-1524578271613-d550eacf6090?auto=format&fit=crop&q=80',
    },
    {
        title: 'Slow Reads',
        description: 'Thoughtful, atmospheric books designed for deep evenings and long weekends.',
        accent: 'from-emerald-500 to-teal-500',
        image: 'https://images.unsplash.com/photo-1507842217121-9e96e4769ea0?auto=format&fit=crop&q=80',
    },
];

const Categories: React.FC = () => {
    const location = useLocation();
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const genreFromUrl = params.get('genre');
        if (genreFromUrl && genreFromUrl.trim()) {
            setSelectedCategory(genreFromUrl.trim());
        }
    }, [location.search]);

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/books`);
                const normalized = normalizeBookCollection(res.data);
                setBooks(normalized.books);
            } catch (err) {
                console.error('Error fetching books:', err);
                setBooks([]);
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, []);

    const genres = ['All', ...Array.from(new Set(
        books
            .map((book) => book.genre)
            .filter((genre): genre is string => typeof genre === 'string' && genre.trim().length > 0)
    ))];
    const filteredBooks = selectedCategory === 'All' ? books : books.filter((book) => book.genre === selectedCategory);
    const featuredBooks = filteredBooks.slice(0, 4);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center pt-24 text-slate-500 dark:text-slate-400">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                    <p>Loading bookstore collection...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20 pt-20 text-slate-900 dark:bg-slate-950 dark:text-white">
            <div className="mx-auto max-w-7xl px-5">
                <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-900 px-6 py-8 shadow-2xl shadow-slate-200/50 dark:border-slate-800 dark:shadow-none sm:px-8 lg:px-10">
                    <div className="absolute inset-0">
                        <img
                            src="https://images.unsplash.com/photo-1507842217121-9e96e4769ea0?auto=format&fit=crop&q=80"
                            alt="Bookstore banner"
                            className="h-full w-full object-cover opacity-30"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-indigo-950/80" />
                    </div>

                    <div className="relative z-10 grid gap-8 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
                        <div>
                            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-indigo-300">LuminaBook AI shelves</p>
                            <h1 className="max-w-xl text-4xl font-black tracking-tight text-white md:text-5xl">
                                Pick books by story, mood, and meaning.
                            </h1>
                            <p className="mt-4 max-w-xl text-base text-slate-300 md:text-lg">
                                Curated collections for readers who want atmosphere, depth, discovery, and a bookstore feel that goes beyond a list of titles.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                            {[
                                { label: 'Titles', value: `${books.length}+` },
                                { label: 'Readers', value: '8k+' },
                                { label: 'Rating', value: '4.9/5' },
                            ].map((stat) => (
                                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                                    <div className="text-2xl font-black text-white">{stat.value}</div>
                                    <div className="mt-1 text-sm text-slate-300">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <div className="mt-10 grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
                    <aside className="h-fit rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:sticky xl:top-24">
                        <div className="mb-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-500">Browse</p>
                            <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Categories</h2>
                        </div>

                        <div className="space-y-2">
                            {genres.map((genre) => (
                                <button
                                    key={genre}
                                    type="button"
                                    onClick={() => setSelectedCategory(genre)}
                                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                                        selectedCategory === genre
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-400 dark:bg-indigo-950/30 dark:text-indigo-300'
                                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <span>{genre}</span>
                                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs dark:bg-slate-800">
                                        {genre === 'All' ? books.length : books.filter((book) => book.genre === genre).length}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="mt-8 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 p-4 text-white shadow-lg shadow-indigo-500/20">
                            <p className="text-xs uppercase tracking-[0.2em] text-indigo-100">Curator’s note</p>
                            <h3 className="mt-2 text-xl font-bold">Weekend reading picks</h3>
                            <p className="mt-2 text-sm text-indigo-100">A hand-picked stack of atmospheric, thoughtful stories for slower evenings and deep reads.</p>
                        </div>
                    </aside>

                    <main className="space-y-8">
                        <section>
                            <div className="mb-5 flex items-end justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500">Collections</p>
                                    <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Curated shelves</h2>
                                </div>
                                <Link to="/marketplace" className="hidden text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300 sm:inline-block">
                                    Explore marketplace →
                                </Link>
                            </div>

                            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                                {collectionCards.map((card) => (
                                    <div key={card.title} className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
                                        <div className={`h-40 bg-gradient-to-r ${card.accent}`}>
                                            <img
                                                src={card.image}
                                                alt={card.title}
                                                className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
                                            />
                                        </div>
                                        <div className="p-5">
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{card.title}</h3>
                                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{card.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                            <div className="mb-6 flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500">Featured</p>
                                    <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                                        {selectedCategory === 'All' ? 'All books' : `${selectedCategory} books`}
                                    </h2>
                                </div>
                                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                    {filteredBooks.length} titles
                                </div>
                            </div>

                            {filteredBooks.length === 0 ? (
                                <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 py-16 text-center dark:border-slate-700 dark:bg-slate-950/40">
                                    <div className="text-5xl opacity-30">📚</div>
                                    <h3 className="mt-4 text-2xl font-bold text-slate-800 dark:text-slate-200">No books found</h3>
                                    <p className="mt-2 text-slate-500 dark:text-slate-400">Try selecting a different category.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                                        {featuredBooks.map((book) => (
                                            <ProductCard key={book._id || book.id} book={book} />
                                        ))}
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                        {filteredBooks.slice(4).map((book) => (
                                            <ProductCard key={book._id || book.id} book={book} />
                                        ))}
                                    </div>
                                </>
                            )}
                        </section>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Categories;
