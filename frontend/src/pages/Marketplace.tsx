import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
// @ts-ignore
import { API_URL } from '../config';
import ProductCard from '../components/ProductCard';
import { Book } from '../types';

const Marketplace: React.FC = () => {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [priceRange, setPriceRange] = useState(5000);

    const categories = ['All', 'Fiction', 'Non-Fiction', 'Sci-Fi', 'Mystery', 'Biography', 'History', 'Technology', 'Romance'];

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const response = await axios.get(`${API_URL}/api/books`);
                setBooks(response.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching books:', err);
                setError('Failed to load books. Please try again later.');
                setLoading(false);
            }
        };

        fetchBooks();
    }, []);

    const filteredBooks = books.filter(book => {
        const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.author.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || book.genre === selectedCategory;
        const matchesPrice = book.price <= priceRange;

        return matchesSearch && matchesCategory && matchesPrice;
    });

    if (loading) return (
        <div className="min-h-screen pt-24 flex items-center justify-center text-slate-500 dark:text-slate-400">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p>Loading books...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen pt-24 flex items-center justify-center text-red-500">
            <p>{error}</p>
        </div>
    );

    return (
        <div className="min-h-screen pt-24 pb-12 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-5">

                <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-10 gap-4">
                    <div>
                        <h1 className="font-outfit text-4xl font-bold text-slate-900 dark:text-white mb-2">Marketplace</h1>
                        <p className="text-slate-500 dark:text-slate-400">Discover rare finds and popular bestsellers.</p>
                    </div>
                    <Link to="/sell" className="px-6 py-2.5 rounded-full font-semibold text-white bg-gradient-to-r from-pink-500 to-indigo-600 hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm shadow-md flex items-center gap-2">
                        <span>+</span> Sell a Book
                    </Link>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Filters */}
                    <aside className="w-full lg:w-72 flex-shrink-0 space-y-8">
                        {/* Search */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                            <h3 className="font-outfit font-bold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <span className="text-indigo-500">🔍</span> Search
                            </h3>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Title, author..."
                                    className="w-full px-4 py-2.5 pl-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <span className="absolute left-3 top-2.5 text-slate-400">🔎</span>
                            </div>
                        </div>

                        {/* Categories */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                            <h3 className="font-outfit font-bold text-lg text-slate-900 dark:text-white mb-4">Categories</h3>
                            <div className="flex flex-wrap gap-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${selectedCategory === cat
                                                ? 'bg-indigo-500 border-indigo-500 text-white shadow-md'
                                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Price Filter */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                            <h3 className="font-outfit font-bold text-lg text-slate-900 dark:text-white mb-4">Max Price: <span className="text-indigo-600 dark:text-indigo-400">₹{priceRange}</span></h3>
                            <input
                                type="range"
                                min="0"
                                max="5000"
                                step="100"
                                value={priceRange}
                                onChange={(e) => setPriceRange(Number(e.target.value))}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between mt-2 text-xs text-slate-500 font-medium">
                                <span>₹0</span>
                                <span>₹5000</span>
                            </div>
                        </div>
                    </aside>

                    {/* Product Grid */}
                    <main className="flex-1">
                        {filteredBooks.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center">
                                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-4xl mb-6">📚</div>
                                <h3 className="font-outfit text-xl font-bold text-slate-900 dark:text-white mb-2">No books found</h3>
                                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs mx-auto">It seems we couldn't find any books matching your current filters.</p>
                                <button
                                    onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setPriceRange(5000); }}
                                    className="px-6 py-2.5 rounded-full font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm"
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                                {filteredBooks.map(book => (
                                    <ProductCard key={book.id || (book as any)._id} book={book} />
                                ))}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Marketplace;
