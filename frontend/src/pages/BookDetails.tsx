import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
// @ts-ignore
import { API_URL } from '../config';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';
import { Book, IReview } from '../types';

const BookDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [book, setBook] = useState<Book | null>(null);
    const [similarBooks, setSimilarBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [addingToCart, setAddingToCart] = useState(false);
    const { addToCart } = useCart();

    const [reviews, setReviews] = useState<IReview[]>([]);
    const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
    const [submitting, setSubmitting] = useState(false);
    const [activeImage, setActiveImage] = useState<string>('');

    useEffect(() => {
        const fetchBookAndRecommendations = async () => {
            try {
                // 1. Fetch All Books (Simulated single fetch)
                const res = await axios.get(`${API_URL}/api/books`);
                const allBooks: any[] = res.data;

                // 2. Find Current Book
                const currentBook = allBooks.find(b => b._id === id || b.id === id);

                if (currentBook) {
                    const typedBook: Book = {
                        ...currentBook,
                        _id: currentBook._id || currentBook.id, // Ensure _id is present
                        category: currentBook.category || currentBook.genre // Ensure category is present
                    };
                    setBook(typedBook);
                    setActiveImage(typedBook.image);

                    // 3. Recommendation Logic
                    const recommendations = allBooks.filter(b =>
                        (b.category === typedBook.category || b.genre === typedBook.category) &&
                        (b._id !== typedBook._id && b.id !== typedBook._id)
                    ).slice(0, 4).map(b => ({
                        ...b,
                        _id: b._id || b.id,
                        category: b.category || b.genre
                    }));

                    setSimilarBooks(recommendations);

                    // 4. Fetch Reviews
                    const targetId = typedBook._id;
                    try {
                        const reviewsRes = await axios.get(`${API_URL}/api/reviews/${targetId}`);
                        setReviews(reviewsRes.data);
                    } catch (e) { console.log('No reviews yet or error'); }
                }
            } catch (err) {
                console.error("Error loading book details:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchBookAndRecommendations();
        window.scrollTo(0, 0);
    }, [id]);

    const handleAddToCart = async () => {
        if (!book) return;
        setAddingToCart(true);
        // Simulate network delay for "Loading State" UX
        await new Promise(resolve => setTimeout(resolve, 600));
        addToCart(book);
        setAddingToCart(false);
    };

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) {
            alert("Please login to write a review.");
            navigate('/login');
            return;
        }

        setSubmitting(true);
        try {
            if (!book) return;
            const targetId = book._id;
            const res = await axios.post(`${API_URL}/api/reviews/${targetId}`, newReview, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setReviews([res.data, ...reviews]);
            setNewReview({ rating: 5, comment: '' });
            alert("Review submitted!");
        } catch (err) {
            console.error("Review failed:", err);
            alert("Failed to submit review. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen pt-24 flex items-center justify-center text-slate-500 dark:text-slate-400">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p>Loading details...</p>
            </div>
        </div>
    );

    if (!book) return (
        <div className="min-h-screen pt-24 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
            <h2 className="text-2xl font-bold mb-4">Book not found</h2>
            <Link to="/marketplace" className="text-indigo-600 hover:text-indigo-500 hover:underline">Return to Marketplace</Link>
        </div>
    );

    return (
        <div className="min-h-screen pt-[72px] bg-slate-50 dark:bg-slate-950 transition-colors duration-300">

            {/* STICKY NAV HEADER */}
            <div className="sticky top-[72px] z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 py-3 px-5 md:hidden flex justify-between items-center transition-all">
                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{book.title}</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">₹{book.price}</span>
            </div>

            <div className="max-w-7xl mx-auto px-5 py-8 md:py-12">
                <Link to="/marketplace" className="inline-flex items-center text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 mb-8 transition-colors group">
                    <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> Back to Marketplace
                </Link>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-16">

                    {/* LEFT COLUMN: IMAGE GALLERY */}
                    <div className="md:col-span-5 lg:col-span-5 space-y-4">
                        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 group">
                            <img
                                src={activeImage}
                                alt={book.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                        </div>
                        {/* Thumbnail Strip */}
                        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                            {[book.image, ...similarBooks.slice(0, 3).map(b => b.image)].map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveImage(img)}
                                    className={`relative w-20 h-24 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${activeImage === img ? 'border-indigo-600 ring-2 ring-indigo-600/20' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}
                                >
                                    <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: PRODUCT DETAILS */}
                    <div className="md:col-span-7 lg:col-span-7 flex flex-col">
                        <div className="mb-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider">
                                {book.category}
                            </span>
                        </div>

                        <h1 className="mb-4 leading-tight">{book.title}</h1>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="flex text-amber-400 text-sm">{'★'.repeat(5)}</div>
                            <span className="text-slate-400 text-sm border-l border-slate-300 dark:border-slate-700 pl-4">{reviews.length} Reviews</span>
                            <span className="text-slate-400 text-sm border-l border-slate-300 dark:border-slate-700 pl-4">In Stock</span>
                        </div>

                        <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-8">
                            ₹{book.price} <span className="text-lg font-normal text-slate-500 line-through ml-2">₹{book.price + 150}</span>
                        </div>

                        <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 mb-10">
                            <p>{book.description || "Immerse yourself in this captivating story. A masterpiece of storytelling that weaves together complex characters and thrilling plot twists."}</p>
                        </div>

                        {/* ACTIONS */}
                        <div className="flex flex-col sm:flex-row gap-4 mt-auto mb-12">
                            <button
                                onClick={handleAddToCart}
                                disabled={addingToCart}
                                className={`flex-1 px-8 py-4 rounded-xl font-bold text-white text-lg transition-all transform active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/25 ${addingToCart ? 'bg-indigo-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-xl hover:-translate-y-1'}`}
                            >
                                {addingToCart ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <span>🛒</span> Add to Cart
                                    </>
                                )}
                            </button>
                            <button className="px-8 py-4 rounded-xl font-bold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-lg">
                                ❤ Save
                            </button>
                        </div>

                        {/* FEATURES / META */}
                        <div className="grid grid-cols-2 gap-6 border-t border-slate-200 dark:border-slate-800 pt-8">
                            <div>
                                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Author</span>
                                <span className="font-medium text-slate-900 dark:text-white">{book.author}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Language</span>
                                <span className="font-medium text-slate-900 dark:text-white">English</span>
                            </div>
                            <div>
                                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pages</span>
                                <span className="font-medium text-slate-900 dark:text-white">324</span>
                            </div>
                            <div>
                                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Publisher</span>
                                <span className="font-medium text-slate-900 dark:text-white">Penguin Books</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* REVIEWS & RECOMMENDATIONS */}
                <div className="mt-20">
                    <h2 className="mb-8">Customer Reviews</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Review writing form */}
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <h3 className="mb-6">Write a Review</h3>
                            <form onSubmit={handleReviewSubmit}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2">Rating</label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button type="button" key={star} onClick={() => setNewReview({ ...newReview, rating: star })} className={`text-2xl ${star <= newReview.rating ? 'text-amber-400' : 'text-slate-300'}`}>★</button>
                                        ))}
                                    </div>
                                </div>
                                <textarea
                                    className="w-full mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:ring-2 ring-indigo-500 outline-none"
                                    rows={3}
                                    placeholder="Share your thoughts..."
                                    value={newReview.comment}
                                    onChange={e => setNewReview({ ...newReview, comment: e.target.value })}
                                    required
                                ></textarea>
                                <button type="submit" disabled={submitting} className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg hover:opacity-90 transition-opacity">
                                    {submitting ? 'Posting...' : 'Post Review'}
                                </button>
                            </form>
                        </div>

                        {/* Reviews List */}
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 max-h-[500px] overflow-y-auto">
                            {reviews.length === 0 ? (
                                <p className="text-slate-500 text-center italic">No reviews yet.</p>
                            ) : (
                                <div className="space-y-6">
                                    {reviews.map((rev, i) => (
                                        <div key={i} className="border-b border-slate-200 dark:border-slate-700 pb-4 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold">
                                                    {typeof rev.user === 'object' && rev.user !== null ? rev.user.name : 'Anonymous User'}
                                                </span>
                                                <span className="text-amber-400 text-sm">{'★'.repeat(rev.rating)}</span>
                                            </div>
                                            <p className="text-slate-600 dark:text-slate-400 text-sm">{rev.comment}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RECOMMENDATIONS */}
                {similarBooks.length > 0 && (
                    <div className="mt-20">
                        <h2 className="mb-8">You Might Also Like</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {similarBooks.map(rec => (
                                <ProductCard key={rec._id} book={rec} />
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default BookDetails;
