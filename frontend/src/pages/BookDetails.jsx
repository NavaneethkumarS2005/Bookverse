import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';

const BookDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [book, setBook] = useState(null);
    const [similarBooks, setSimilarBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCart();

    const [reviews, setReviews] = useState([]);
    const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchBookAndRecommendations = async () => {
            try {
                // 1. Fetch All Books (In a real app, you'd fetch just one, but our API is simple)
                const res = await axios.get(`${API_URL}/api/books`);
                const allBooks = res.data;

                // 2. Find Current Book
                const currentBook = allBooks.find(b => b.id == id || b._id == id);

                if (currentBook) {
                    setBook(currentBook);

                    // 3. Recommendation Logic
                    const recommendations = allBooks.filter(b =>
                        b.genre === currentBook.genre &&
                        b.id !== currentBook.id
                    ).slice(0, 4);
                    setSimilarBooks(recommendations);

                    // 4. Fetch Reviews
                    // Use the custom numerical ID if available, else _id
                    const targetId = currentBook.id || currentBook._id;
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

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) {
            alert("Please login to write a review.");
            navigate('/login');
            return;
        }

        setSubmitting(true);
        try {
            const targetId = book.id || book._id;
            const res = await axios.post(`${API_URL}/api/reviews/${targetId}`, newReview, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Add new review to top of list
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

    if (loading) return <div className="container" style={{ paddingTop: '100px', textAlign: 'center' }}>Loading Book Details...</div>;
    if (!book) return <div className="container" style={{ paddingTop: '100px', textAlign: 'center' }}>Book not found.</div>;

    return (
        <div className="container" style={{ paddingTop: '100px', paddingBottom: '40px' }}>
            <Link to="/marketplace" className="btn-secondary" style={{ display: 'inline-block', marginBottom: '20px', padding: '8px 16px', borderRadius: '8px' }}>← Back to Marketplace</Link>

            {/* BOOK DETAILS SECTION */}
            <div className="glass" style={{ padding: '40px', borderRadius: '20px', display: 'flex', flexWrap: 'wrap', gap: '40px', marginBottom: '60px' }}>
                <div style={{ flex: '1 1 300px', maxWidth: '400px' }}>
                    <img
                        src={book.image}
                        alt={book.title}
                        style={{ width: '100%', borderRadius: '16px', boxShadow: 'var(--shadow-xl)' }}
                    />
                </div>
                <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span className="badge" style={{ alignSelf: 'flex-start', marginBottom: '16px', background: 'var(--primary-glow)', color: 'var(--primary)' }}>{book.genre}</span>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', lineHeight: '1.2' }}>{book.title}</h1>
                    <h3 style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '1.2rem' }}>by {book.author}</h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                        <span style={{ color: '#F59E0B', fontSize: '1.2rem' }}>{'★'.repeat(Math.round(book.rating || 0))}</span>
                        <span style={{ color: 'var(--text-muted)' }}>({book.reviews || 0} ratings)</span>
                    </div>

                    <p style={{ lineHeight: '1.8', marginBottom: '32px', color: 'var(--text-muted)' }}>
                        {book.description || "A captivating read that draws you into its world. Discover the characters, the plot twists, and the underlying themes that make this book a masterpiece of its genre."}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        {book.buyLink ? (
                            <a
                                href={book.buyLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary"
                                style={{ padding: '12px 30px', fontSize: '1.1rem', textDecoration: 'none' }}
                            >
                                Buy on Site ↗
                            </a>
                        ) : (
                            <>
                                <h2 className="text-gradient" style={{ fontSize: '2.5rem', marginRight: '10px' }}>₹{book.price}</h2>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => addToCart(book)}
                                >
                                    Add to Cart
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* REVIEWS SECTION */}
            <div className="reviews-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px', marginBottom: '60px' }}>
                {/* Write a Review */}
                <div className="glass" style={{ padding: '30px', borderRadius: '16px', height: 'fit-content' }}>
                    <h3 style={{ marginBottom: '20px' }}>Write a Review</h3>
                    <form onSubmit={handleReviewSubmit}>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Rating</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <span
                                        key={star}
                                        style={{ fontSize: '1.8rem', cursor: 'pointer', color: star <= newReview.rating ? '#F59E0B' : 'var(--border)' }}
                                        onClick={() => setNewReview({ ...newReview, rating: star })}
                                    >
                                        ★
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <textarea
                                className="form-input"
                                rows="4"
                                placeholder="Share your thoughts..."
                                value={newReview.comment}
                                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Post Review'}
                        </button>
                    </form>
                </div>

                {/* Reviews List */}
                <div>
                    <h3 style={{ marginBottom: '20px' }}>Customer Reviews ({reviews.length})</h3>
                    {reviews.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No reviews yet. Be the first!</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {reviews.map((rev, i) => (
                                <div key={i} className="glass" style={{ padding: '20px', borderRadius: '12px', background: 'var(--input-bg)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <div style={{ fontWeight: 'bold' }}>{rev.userName}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(rev.createdAt).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{ color: '#F59E0B', marginBottom: '8px' }}>{'★'.repeat(rev.rating)}</div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{rev.comment}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* PRODUCT RECOMMENDATIONS */}
            {similarBooks.length > 0 && (
                <section>
                    <h2 style={{ marginBottom: '30px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                        <span className="text-gradient">Recommended For You</span>
                    </h2>
                    <div className="cards-grid">
                        {similarBooks.map(rec => (
                            <ProductCard key={rec.id} book={rec} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default BookDetails;
