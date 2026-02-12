import React, { useEffect, useState } from 'react';
import axios from 'axios';
// @ts-ignore
import { API_URL } from '../config';
import { useCart } from '../context/CartContext';
import { Book } from '../types';

const Categories: React.FC = () => {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const { addToCart } = useCart();

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/books`);
                setBooks(res.data);
            } catch (err) {
                console.error("Error fetching books:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchBooks();
    }, []);

    // Extract Unique Genres dynamically
    const genres = ['All', ...Array.from(new Set(books.map(b => b.genre)))];

    // Filter Books
    const filteredBooks = selectedCategory === 'All'
        ? books
        : books.filter(b => b.genre === selectedCategory);

    const BookCard: React.FC<{ book: Book }> = ({ book }) => (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all group h-full flex flex-col">
            <div className="relative overflow-hidden rounded-xl mb-4 aspect-[2/3]">
                <img
                    src={book.image}
                    alt={book.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                        onClick={() => addToCart(book)}
                        className="px-6 py-2 bg-white text-slate-900 rounded-full font-bold transform translate-y-4 group-hover:translate-y-0 transition-all"
                    >
                        Quick Add
                    </button>
                </div>
            </div>
            <div className="flex-1 flex flex-col">
                <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 w-fit">
                    {book.genre}
                </span>
                <h3 className="font-outfit font-bold text-lg text-slate-900 dark:text-white mb-1 line-clamp-2">
                    {book.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-1">{book.author}</p>
                <div className="mt-auto flex items-center justify-between">
                    <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">₹{book.price}</span>
                    <button
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors"
                        onClick={() => addToCart(book)}
                    >
                        +
                    </button>
                </div>
            </div>
        </div>
    );

    if (loading) return (
        <div className="min-h-screen pt-24 flex items-center justify-center text-slate-500 dark:text-slate-400">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p>Loading Library...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen pt-20 pb-20 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            {/* HERO */}
            <div className="relative h-[40vh] mb-12 flex items-center justify-center bg-slate-900 overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                    <img src="/images/genres.jpeg" alt="Library" className="w-full h-full object-cover opacity-40 blur-sm scale-110" onError={(e) => e.currentTarget.src = 'https://images.unsplash.com/photo-1507842217121-9e96e4769ea0?auto=format&fit=crop&q=80'} />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                </div>
                <div className="relative z-10 text-center px-4 animate-fade-in-up">
                    <h1 className="font-outfit text-4xl md:text-6xl font-bold text-white mb-4">
                        Browse by <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Topic</span>
                    </h1>
                    <p className="text-slate-300 text-lg max-w-xl mx-auto">Explore our extensive collection across various genres and find your next favorite read.</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-5">
                {/* GENRE FILTER BAR */}
                <div className="flex gap-3 overflow-x-auto pb-6 mb-8 scrollbar-hide">
                    {genres.map(genre => (
                        <button
                            key={genre as string}
                            className={`px-6 py-2.5 rounded-full whitespace-nowrap font-medium transition-all ${selectedCategory === genre
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                                }`}
                            onClick={() => setSelectedCategory(genre as string)}
                        >
                            {genre as string}
                        </button>
                    ))}
                </div>

                {/* BOOK GRID */}
                <section>
                    <div className="flex justify-between items-end mb-8">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                                {selectedCategory === 'All' ? 'All Books' : `${selectedCategory} Books`}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400">
                                Showing {filteredBooks.length} titles
                            </p>
                        </div>
                    </div>

                    {filteredBooks.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-20 text-center border border-slate-200 dark:border-slate-800">
                            <div className="text-6xl mb-6 opacity-20 filter grayscale">📚</div>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">No books found.</h3>
                            <p className="text-slate-500 dark:text-slate-400">Try selecting a different category.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {filteredBooks.map((book) => (
                                <BookCard key={book.id || (book as any)._id} book={book} />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div >
    );
};

export default Categories;
