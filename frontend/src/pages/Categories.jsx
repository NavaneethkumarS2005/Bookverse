import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { useCart } from '../context/CartContext';

const Categories = () => {
    const [books, setBooks] = useState([]);
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
    const genres = ['All', ...new Set(books.map(b => b.genre))];

    // Filter Books
    const filteredBooks = selectedCategory === 'All'
        ? books
        : books.filter(b => b.genre === selectedCategory);

    const BookCard = ({ book }) => (
        <div className="card" style={{ textAlign: 'center', padding: '15px' }}>
            <img
                src={book.image}
                alt={book.title}
                style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '8px', marginBottom: '15px' }}
            />
            <h3 style={{ fontSize: '1.1rem', marginBottom: '5px', height: '44px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {book.title}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '5px' }}>{book.author}</p>
            <span style={{
                display: 'inline-block', padding: '4px 10px', borderRadius: '20px',
                background: 'var(--bg-secondary)', fontSize: '0.8rem', marginBottom: '10px', border: '1px solid var(--border)'
            }}>
                {book.genre}
            </span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '1.2rem' }}>₹{book.price}</span>
            </div>
            <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '10px' }}
                onClick={() => addToCart(book)}
            >
                Add to Cart
            </button>
        </div>
    );

    if (loading) return <div className="container" style={{ paddingTop: '100px', textAlign: 'center' }}>Loading Library...</div>;

    return (
        <div className="container" style={{ paddingTop: '80px', paddingBottom: '40px' }}>
            {/* HERO */}
            <header className="hero"
                style={{
                    minHeight: '30vh',
                    marginBottom: '40px',
                    borderRadius: '20px',
                    background: "linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url('/images/genres.jpeg')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                }}>
                <div className="hero-text animate-fade-in visible" style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '3rem', marginBottom: '10px', color: 'white' }}>Browse by <span className="text-gradient">Topic</span></h1>
                    <p style={{ opacity: 0.8 }}>Select a category below to explore</p>
                </div>
            </header>

            {/* GENRE FILTER BAR */}
            <div style={{
                display: 'flex',
                gap: '15px',
                overflowX: 'auto',
                paddingBottom: '20px',
                marginBottom: '20px',
                justifyContent: 'center',
                flexWrap: 'wrap'
            }} className="no-scrollbar">
                {genres.map(genre => (
                    <button
                        key={genre}
                        className={`category-btn ${selectedCategory === genre ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(genre)}
                    >
                        {genre}
                    </button>
                ))}
            </div>

            {/* BOOK GRID */}
            <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '1.8rem' }}>{selectedCategory === 'All' ? 'All Books' : `${selectedCategory} Books`}</h2>
                    <span style={{ color: 'var(--text-muted)' }}>{filteredBooks.length} titles</span>
                </div>

                {filteredBooks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '100px', opacity: 0.5 }}>
                        <h3>No books found in this category.</h3>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '30px' }}>
                        {filteredBooks.map((book) => (
                            <BookCard key={book.id} book={book} />
                        ))}
                    </div>
                )}
            </section>
        </div >
    );
};

export default Categories;
