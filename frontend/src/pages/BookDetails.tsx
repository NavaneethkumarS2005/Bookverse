import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
// @ts-ignore
import { API_URL } from '../config';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';
import BookCover from '../components/BookCover';
import { Book, IReview } from '../types';
import InlineAlert from '../components/InlineAlert';
import { resolveBookImage } from '../utils/bookCompatibility';

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
    const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBookAndRecommendations = async () => {
            try {
                // 1. Fetch Specific Book
                const res = await axios.get(`${API_URL}/api/books/${id}`);
                const bookData: Book = res.data;

                // Normalize ID: Ensure _id is a string, even if falling back to numeric id
                const typedBook: Book = {
                    ...bookData,
                    _id: (bookData._id || bookData.id || '').toString(),
                    category: bookData.category || bookData.genre,
                    image: resolveBookImage(bookData.image, bookData.title, bookData.author, bookData.category || bookData.genre)
                };

                setBook(typedBook);
                setActiveImage(resolveBookImage(typedBook.image, typedBook.title, typedBook.author, typedBook.category));

                // 2. Fetch Recommendations (from all/random/filtered)
                // For simplicity/performance, we might just query by category if endpoint existed, 
                // but let's stick to the existing approach of fetching a few books for now, or just mock it to be safe.
                // Better approach: Fetch books by category
                try {
                    const recRes = await axios.get(`${API_URL}/api/books`, {
                        params: { category: typedBook.category, limit: 5 }
                    });

                    let recs: any[] = [];
                    if (recRes.data.books) recs = recRes.data.books;
                    else if (Array.isArray(recRes.data)) recs = recRes.data;

                    const filteredRecs = recs
                        .filter(b => (b._id !== typedBook._id && b.id !== typedBook.id))
                        .slice(0, 4)
                        .map(b => ({ ...b, _id: b._id || b.id, category: b.category || b.genre, image: resolveBookImage(b.image, b.title, b.author, b.category || b.genre) }));

                    setSimilarBooks(filteredRecs);

                } catch (e) {
                    console.log("Recs error", e);
                }


                // 3. Fetch Reviews
                const targetId = typedBook._id;
                try {
                    const reviewsRes = await axios.get(`${API_URL}/api/reviews/${targetId}`);
                    setReviews(reviewsRes.data);
                } catch (e) {
                    console.log('No reviews yet or error');
                }

            } catch (err) {
                console.error("Error loading book details:", err);
                setLoadError('We could not load this book right now. It may have been removed or there is a connection issue.');
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
        try {
            await addToCart(book);
            setAlertMessage({ type: 'success', text: 'Book added to cart!' });
            navigate('/cart');
        } catch (error: any) {
            setAlertMessage({ type: 'error', text: error.message || 'Unable to add this book to your cart.' });
        } finally {
            setAddingToCart(false);
        }
    };

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!localStorage.getItem('user')) {
            setAlertMessage({ type: 'error', text: 'Please login to write a review.' });
            navigate('/login');
            return;
        }

        setSubmitting(true);
        try {
            if (!book) return;
            const targetId = book._id;
            const res = await axios.post(`${API_URL}/api/reviews/${targetId}`, newReview, { withCredentials: true });

            setReviews([res.data, ...reviews]);
            setNewReview({ rating: 5, comment: '' });
            setAlertMessage({ type: 'success', text: 'Review submitted!' });
        } catch (err) {
            console.error("Review failed:", err);
            setAlertMessage({ type: 'error', text: 'Failed to submit review. Please try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen pt-24 flex items-center justify-center text-slate-500 ">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p>Loading details...</p>
            </div>
        </div>
    );

    if (!book) return (
        <div className="min-h-screen pt-24 flex flex-col items-center justify-center text-slate-500  px-5 text-center">
            <h2 className="text-2xl font-bold mb-3">
                {loadError ? 'Unable to load book' : 'Book not found'}
            </h2>
            {loadError && (
                <p className="mb-4 max-w-md">{loadError}</p>
            )}
            <Link to="/marketplace" className="text-indigo-600 hover:text-indigo-500 hover:underline">Return to Marketplace</Link>
        </div>
    );

    return (
        <div className="min-h-screen pt-[72px] bg-slate-50  transition-colors duration-300">
            {/* Inline Alert */}
            {alertMessage && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
                    <InlineAlert
                        type={alertMessage.type}
                        message={alertMessage.text}
                        onClose={() => setAlertMessage(null)}
                    />
                </div>
            )}

            {/* STICKY NAV HEADER */}
            <div className="sticky top-[72px] z-40 bg-white/80  backdrop-blur-md border-b border-slate-200  py-3 px-5 md:hidden flex justify-between items-center transition-all">
                <span className="font-bold text-slate-900  truncate max-w-[200px]">{book.title}</span>
                <span className="font-bold text-indigo-600 ">₹{book.price}</span>
            </div>

            <div className="max-w-7xl mx-auto px-5 py-8 md:py-12">
                <Link to="/marketplace" className="inline-flex items-center text-slate-500 hover:text-indigo-600   mb-8 transition-colors group">
                    <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> Back to Marketplace
                </Link>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-16">

                    {/* LEFT COLUMN: IMAGE GALLERY */}
                    <div className="md:col-span-5 lg:col-span-5 space-y-4">
                        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-200  shadow-xl border border-slate-200  group">
                            <BookCover
                                image={activeImage}
                                title={book.title}
                                author={book.author}
                                category={book.category}
                                className="h-full w-full"
                                imageClassName="transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                        </div>
                        {/* Thumbnail Strip */}
                        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                            {[resolveBookImage(book.image, book.title, book.author, book.category), ...similarBooks.slice(0, 3).map(b => resolveBookImage(b.image, b.title, b.author, b.category))].map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveImage(img)}
                                    className={`relative w-20 h-24 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${activeImage === img ? 'border-indigo-600 ring-2 ring-indigo-600/20' : 'border-transparent hover:border-slate-300 '}`}
                                >
                                    <BookCover
                                        image={img}
                                        title={book.title}
                                        author={book.author}
                                        category={book.category}
                                        className="h-full w-full"
                                        alt="Thumbnail"
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: PRODUCT DETAILS */}
                    <div className="md:col-span-7 lg:col-span-7 flex flex-col">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-100  text-indigo-700  text-xs font-bold uppercase tracking-wider">
                                {book.category}
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold   ">
                                Verified quality
                            </span>
                        </div>

                        <h1 className="mb-4 leading-tight">{book.title}</h1>

                        <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
                            <div className="flex items-center gap-1 text-amber-400">{'★'.repeat(5)}</div>
                            <span className="text-slate-500 ">4.8 rating</span>
                            <span className="text-slate-400 border-l border-slate-300  pl-4">{reviews.length} Reviews</span>
                            <span className="text-slate-400 border-l border-slate-300  pl-4">In Stock</span>
                        </div>

                        <div className="text-3xl font-extrabold text-slate-900  mb-8">
                            ₹{book.price} <span className="text-lg font-normal text-slate-500 line-through ml-2">₹{book.price + 150}</span>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm   mb-8">
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400 ">Book summary</p>
                            <div className="prose  max-w-none text-slate-600  mt-3">
                                <p>{book.description || "Immerse yourself in this captivating story. A masterpiece of storytelling that weaves together complex characters and thrilling plot twists."}</p>
                            </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="flex flex-col sm:flex-row gap-4 mt-auto mb-12">
                            {book.buyLink && (
                                <button
                                    onClick={() => window.open(book.buyLink, '_blank')}
                                    className="btn btn-secondary flex-1 px-8 py-4 text-lg active:scale-95 z-10"
                                >
                                    <span aria-hidden="true">🔗</span> Buy on {
                                        book.buyLink?.includes('amazon') ? 'Amazon' :
                                            book.buyLink?.includes('flipkart') ? 'Flipkart' :
                                                'External Store'
                                    }
                                </button>
                            )}
                            {book.fulfillment !== 'external' && (
                                <button
                                    onClick={handleAddToCart}
                                    disabled={addingToCart}
                                    className="btn btn-primary flex-1 px-8 py-4 text-lg active:scale-95"
                                >
                                    {addingToCart ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true"></div>
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <span aria-hidden="true">🛒</span> Add to Cart
                                        </>
                                    )}
                                </button>
                            )}
                            <button className="btn btn-secondary px-8 py-4 text-lg">
                                <span aria-hidden="true">❤</span> Save
                            </button>
                        </div>

                        {/* FEATURES / META */}
                        <div className="grid grid-cols-2 gap-6 border-t border-slate-200  pt-8">
                            <div>
                                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Author</span>
                                <span className="font-medium text-slate-900 ">{book.author}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Language</span>
                                <span className="font-medium text-slate-900 ">English</span>
                            </div>
                            <div>
                                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pages</span>
                                <span className="font-medium text-slate-900 ">324</span>
                            </div>
                            <div>
                                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Publisher</span>
                                <span className="font-medium text-slate-900 ">Penguin Books</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* REVIEWS & RECOMMENDATIONS */}
                <div className="mt-20">
                    <h2 className="mb-8">Customer Reviews</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Review writing form */}
                        <div className="bg-white  p-8 rounded-2xl border border-slate-200 ">
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
                                    className="w-full mb-4 p-3 rounded-lg bg-slate-50  border border-slate-200  focus:ring-2 ring-indigo-500 outline-none"
                                    rows={3}
                                    placeholder="Share your thoughts..."
                                    value={newReview.comment}
                                    onChange={e => setNewReview({ ...newReview, comment: e.target.value })}
                                    required
                                ></textarea>
                                <button type="submit" disabled={submitting} className="w-full py-3 bg-slate-900 text-white   font-bold rounded-lg hover:opacity-90 transition-opacity">
                                    {submitting ? 'Posting...' : 'Post Review'}
                                </button>
                            </form>
                        </div>

                        {/* Reviews List */}
                        <div className="bg-slate-50  p-8 rounded-2xl border border-dashed border-slate-300  max-h-[500px] overflow-y-auto">
                            {reviews.length === 0 ? (
                                <p className="text-slate-500 text-center italic">No reviews yet.</p>
                            ) : (
                                <div className="space-y-6">
                                    {reviews.map((rev, i) => (
                                        <div key={i} className="border-b border-slate-200  pb-4 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold">
                                                        {typeof rev.user === 'object' && rev.user !== null ? rev.user.name : 'Anonymous User'}
                                                    </span>
                                                    {rev.isVerified && (
                                                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium border border-green-200    flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                            Verified Purchase
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-amber-400 text-sm">{'★'.repeat(rev.rating)}</span>
                                            </div>
                                            <p className="text-slate-600  text-sm">{rev.comment}</p>
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
