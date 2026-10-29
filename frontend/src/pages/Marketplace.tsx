import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
// @ts-ignore
import { API_URL } from '../config';
import ProductCard from '../components/ProductCard';
import { Book } from '../types';
import { normalizeBookCollection } from '../utils/bookCompatibility';

const Marketplace: React.FC = () => {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [priceRange, setPriceRange] = useState(5000);
    const [sortOption, setSortOption] = useState('newest');
    
    // Custom Sort Dropdown State & Ref
    const [isSortOpen, setIsSortOpen] = useState(false);
    const sortRef = useRef<HTMLDivElement>(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const location = useLocation();

    const categories = ['All', 'Fiction', 'Non-Fiction', 'Sci-Fi', 'Mystery', 'Biography', 'History', 'Technology', 'Romance'];

    // Sync search term with URL ?keyword=... (e.g. from Navbar search)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const keyword = params.get('keyword') || '';
        if (keyword && keyword !== searchTerm) {
            setSearchTerm(keyword);
            setDebouncedSearch(keyword);
            setPage(1);
        }
    }, [location.search]);

    // Debounce Search Term
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1); // Reset to page 1 on new search
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Handle click outside custom sort dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
                setIsSortOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const sortOptions = [
        { value: 'newest', label: 'Newest Arrivals' },
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'price_desc', label: 'Price: High to Low' },
        { value: 'rating', label: 'Best Rated' }
    ];
    const currentSortLabel = sortOptions.find(opt => opt.value === sortOption)?.label || 'Newest Arrivals';

    const isExternalPlatformBook = (book: Book) => book.fulfillment === 'external';

    const websiteBooks = books.filter((book) => !isExternalPlatformBook(book));
    const platformBooks = books.filter((book) => isExternalPlatformBook(book));

    useEffect(() => {
        const fetchBooks = async () => {
            setLoading(true);
            setError(null);
            try {
                const params: any = {
                    page,
                    limit: 9, // Grid 3x3
                    sort: sortOption
                };

                if (debouncedSearch) params.keyword = debouncedSearch;
                if (selectedCategory !== 'All') params.category = selectedCategory;
                if (priceRange < 5000) params.maxPrice = priceRange;

                const response = await axios.get(`${API_URL}/api/books`, { params });
                const normalized = normalizeBookCollection(response.data);

                setBooks(normalized.books);
                setTotalPages(normalized.pages);
            } catch (err) {
                console.error('Error fetching books:', err);
                setError('Failed to load books. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, [debouncedSearch, selectedCategory, priceRange, sortOption, page]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [selectedCategory, priceRange, sortOption]);

    return (
        <div className="min-h-screen pt-24 pb-12 bg-slate-50  transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-5">
                <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-900 p-6 shadow-2xl shadow-slate-200/40   sm:p-8 lg:p-10">
                    <div className="absolute inset-0">
                        <img
                            src="/images/future library.jpeg"
                            alt="Marketplace banner"
                            className="h-full w-full object-cover opacity-30"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#171713] via-[#171713]/90 to-[#3a3a30]/80" />
                    </div>

                    <div className="relative z-10 grid gap-6 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#cec5b7]">Curated market</p>
                            <h1 className="mb-3 text-4xl font-black tracking-tight text-white md:text-5xl">Find your next beloved read.</h1>
                            <p className="max-w-xl text-base text-slate-300 md:text-lg">
                                Browse in-house LuminaBook titles and trusted external storefront listings in one premium, easy-to-shop marketplace.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                            {[
                                { label: 'Titles', value: `${books.length}+` },
                                { label: 'Verified', value: '4.9/5' },
                                { label: 'Sellers', value: '1.2k+' }
                            ].map((stat) => (
                                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                                    <div className="text-2xl font-black text-white">{stat.value}</div>
                                    <div className="mt-1 text-sm text-slate-300">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <div className="mt-8 flex flex-col md:flex-row justify-between items-end md:items-center mb-10 gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#78806a]">Browse shelves</p>
                        <h2 className="font-outfit text-3xl font-bold text-slate-900  mb-2">Marketplace</h2>
                    </div>
                    <Link to="/sell" className="px-6 py-2.5 rounded-[2px] font-semibold text-[#fffdf8] bg-[#171713] hover:bg-[#7d2428] transition-colors text-sm flex items-center gap-2">
                        <span>+</span> Sell a Book
                    </Link>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Filters */}
                    <aside className="w-full lg:w-72 flex-shrink-0 space-y-8">
                        {/* Search */}
                        <div className="bg-white  rounded-2xl p-6 shadow-sm border border-slate-200 ">
                            <h3 className="font-outfit font-bold text-lg text-slate-900  mb-4 flex items-center gap-2">
                                <span className="text-indigo-500">🔍</span> Search
                            </h3>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Title, author..."
                                    className="w-full px-4 py-2.5 pl-10 rounded-xl border border-slate-300  bg-slate-50  text-slate-900  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <span className="absolute left-3 top-2.5 text-slate-400">🔎</span>
                            </div>
                        </div>

                        {/* Sort By */}
                        <div className="bg-white  rounded-2xl p-6 shadow-sm border border-slate-200 ">
                            <h3 className="font-outfit font-bold text-lg text-slate-900  mb-4">Sort By</h3>
                            <div className="relative" ref={sortRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsSortOpen(!isSortOpen)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300  bg-slate-50  text-slate-900  hover:bg-slate-100  transition-all flex items-center justify-between text-sm font-medium focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                >
                                    <span>{currentSortLabel}</span>
                                    <svg
                                        className={`w-4 h-4 transition-transform duration-200 text-slate-400  ${isSortOpen ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                
                                {isSortOpen && (
                                    <div className="absolute left-0 right-0 mt-2 z-30 bg-white  rounded-xl border border-slate-200  shadow-xl shadow-slate-100  overflow-hidden py-1 transition-all duration-200">
                                        {sortOptions.map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => {
                                                    setSortOption(opt.value);
                                                    setIsSortOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                                                    sortOption === opt.value
                                                        ? 'bg-indigo-50  text-indigo-600  font-semibold'
                                                        : 'text-slate-700  hover:bg-slate-50  hover:text-slate-900 '
                                                }`}
                                            >
                                                <span>{opt.label}</span>
                                                {sortOption === opt.value && (
                                                    <span className="text-indigo-500 font-bold">✓</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Categories */}
                        <div className="bg-white  rounded-2xl p-6 shadow-sm border border-slate-200 ">
                            <h3 className="font-outfit font-bold text-lg text-slate-900  mb-4">Categories</h3>
                            <div className="flex flex-wrap gap-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${selectedCategory === cat
                                            ? 'bg-indigo-500 border-indigo-500 text-white shadow-md'
                                            : 'bg-slate-50  border-slate-200  text-slate-600  hover:border-indigo-300 '
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Price Filter */}
                        <div className="bg-white  rounded-2xl p-6 shadow-sm border border-slate-200 ">
                            <h3 className="font-outfit font-bold text-lg text-slate-900  mb-4">Max Price: <span className="text-indigo-600 ">₹{priceRange}</span></h3>
                            <input
                                type="range"
                                min="0"
                                max="5000"
                                step="100"
                                value={priceRange}
                                onChange={(e) => setPriceRange(Number(e.target.value))}
                                className="w-full h-2 bg-slate-200  rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between mt-2 text-xs text-slate-500 font-medium">
                                <span>₹0</span>
                                <span>₹5000</span>
                            </div>
                        </div>
                    </aside>

                    {/* Product Grid */}
                    <main className="flex-1">
                        {loading ? (
                            <div className="min-h-[400px] flex items-center justify-center text-slate-500 ">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p>Updating results...</p>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="min-h-[400px] flex items-center justify-center text-red-500">
                                <p>{error}</p>
                            </div>
                        ) : books.length === 0 ? (
                            <div className="bg-white  rounded-3xl p-16 text-center border border-slate-200  shadow-sm flex flex-col items-center">
                                <div className="w-20 h-20 bg-slate-100  rounded-full flex items-center justify-center text-4xl mb-6">📚</div>
                                <h3 className="font-outfit text-xl font-bold text-slate-900  mb-2">No books found</h3>
                                <p className="text-slate-500  mb-8 max-w-xs mx-auto">It seems we couldn't find any books matching your current filters.</p>
                                <button
                                    onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setPriceRange(5000); setSortOption('newest'); }}
                                    className="px-6 py-2.5 rounded-full font-semibold text-slate-700  border border-slate-300  hover:bg-slate-100  transition-all text-sm"
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        ) : (
                            <>
                                {websiteBooks.length > 0 && (
                                    <section className="mb-12">
                                        <div className="mb-5 flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-500">In-house collection</p>
                                                <h2 className="mt-2 font-outfit text-2xl font-bold text-slate-900 ">Website Books</h2>
                                            </div>
                                            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600   ">{websiteBooks.length} curated titles</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mb-10">
                                            {websiteBooks.map((book, index) => (
                                                <ProductCard key={book._id || book.id || `${book.title}-${index}`} book={book} />
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {platformBooks.length > 0 && (
                                    <section>
                                        <div className="mb-5 flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-500">External marketplace</p>
                                                <h2 className="mt-2 font-outfit text-2xl font-bold text-slate-900 ">Amazon, Flipkart & Online Platform Books</h2>
                                            </div>
                                            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600   ">{platformBooks.length} partner links</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mb-10">
                                            {platformBooks.map((book, index) => (
                                                <ProductCard key={book._id || book.id || `${book.title}-${index}`} book={book} />
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex justify-center items-center gap-4">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className={`px-4 py-2 rounded-lg border ${page === 1 ? 'border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-300 text-slate-700 hover:bg-slate-50   '}`}
                                        >
                                            Previous
                                        </button>
                                        <span className="text-slate-600  font-medium">Page {page} of {totalPages}</span>
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className={`px-4 py-2 rounded-lg border ${page === totalPages ? 'border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-300 text-slate-700 hover:bg-slate-50   '}`}
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Marketplace;
