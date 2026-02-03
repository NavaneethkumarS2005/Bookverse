import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ProductCard from '../components/ProductCard';

const Home = () => {
    const [featuredBooks, setFeaturedBooks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/books');
                // Display top 4 books as featured
                setFeaturedBooks(res.data.slice(0, 4));
            } catch (err) {
                console.error("Failed to load books", err);
            } finally {
                setLoading(false);
            }
        };
        fetchBooks();
    }, []);

    return (
        <>
            {/* HERO SECTION */}
            <header className="hero">
                <div className="container hero-inner">

                    <div className="hero-text fade-in">
                        <h1>
                            Discover Your Next <span className="text-gradient">Literary Adventure</span>
                        </h1>

                        <p>
                            The premier marketplace to buy and sell books. From rare collectibles to
                            modern bestsellers, connect with a community of readers.
                        </p>

                        <div className="hero-actions">
                            <Link to="/marketplace" className="btn btn-primary">Browse Books</Link>
                            <Link to="/sell" className="btn btn-secondary">Sell a Book</Link>
                        </div>
                    </div>

                    <div className="hero-image fade-in" style={{ animationDelay: '0.2s', display: 'flex', justifyContent: 'center' }}>
                        <img
                            src="/images/hero-book.png"
                            alt="Magical Book"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '500px',
                                filter: 'drop-shadow(0 0 40px rgba(139, 92, 246, 0.3))',
                                animation: 'float 6s ease-in-out infinite'
                            }}
                        />
                    </div>

                </div>
            </header>

            {/* FEATURED BOOKS */}
            <section className="section">
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '50px' }}>
                        <h2>Featured Titles</h2>
                        <p className="text-muted">Top picks from our community</p>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading bestsellers...</div>
                    ) : (
                        <div className="cards-grid">
                            {featuredBooks.map(book => (
                                <ProductCard key={book.id} book={book} />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* CATEGORIES */}
            <section className="section alt">
                <div className="container section-inner">

                    <div className="section-text">
                        <h2>Explore Genres</h2>
                        <p>
                            Dive into our extensive catalog organized by genre and interest.
                        </p>
                        <ul className="category-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '30px' }}>
                            {['Fiction', 'Sci-Fi', 'History', 'Technology', 'Romance', 'Mystery'].map(genre => (
                                <li key={genre}>
                                    <Link to={`/categories?genre=${genre}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontWeight: '500' }}>
                                        <span style={{ color: 'var(--primary)' }}>•</span> {genre}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <Link to="/categories" className="btn btn-secondary">View All Categories</Link>
                    </div>

                    <div className="section-image" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <img
                            src="/images/genre-collection.png"
                            alt="Genre Collection"
                            style={{
                                maxWidth: '100%',
                                height: 'auto',
                                maxHeight: '400px',
                                filter: 'drop-shadow(0 10px 30px rgba(124, 58, 237, 0.2))',
                                borderRadius: '24px',
                                animation: 'float 8s ease-in-out infinite reverse'
                            }}
                        />
                    </div>

                </div>
            </section>

            {/* CTA */}
            <section className="cta" style={{ background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-main))' }}>
                <div className="container">
                    <h2>Join the BookVerse</h2>
                    <p style={{ maxWidth: '400px', margin: '16px auto 32px' }}>
                        Sign up today to start your collection or declutter your shelf.
                    </p>
                    <Link to="/login" className="btn btn-primary">Get Started</Link>
                </div>
            </section>
        </>
    );
};

export default Home;
