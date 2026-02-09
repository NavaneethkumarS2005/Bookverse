
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import ProductCard from '../components/ProductCard';

const Marketplace = () => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');


    const { addToCart } = useCart();
    const navigate = useNavigate();

    const categories = ['All', 'Fiction', 'Non-Fiction', 'Sci-Fi', 'Mystery', 'Biography'];

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

    if (loading) return <div className="container" style={{ paddingTop: '120px', textAlign: 'center' }}>Loading books...</div>;
    if (error) return <div className="container" style={{ paddingTop: '120px', textAlign: 'center', color: 'var(--error)' }}>{error}</div>;

    return (
        <div className="container" style={{ paddingTop: '100px', minHeight: '100vh', paddingBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
                <h1 className="text-gradient" style={{ fontSize: '2.5rem' }}>Marketplace</h1>
                <Link to="/sell" className="btn btn-primary">+ Sell a Book</Link>
            </div>

            <div className="marketplace-layout">
                {/* Sidebar Filters */}
                <aside className="sidebar glass">
                    <div style={{ marginBottom: '30px' }}>
                        <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            Refine Search
                        </h3>
                        <div className="search-container">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="Search title, author..."
                                style={{ paddingLeft: '40px' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <h4 style={{ marginBottom: '12px', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Categories</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 style={{ marginBottom: '12px', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Max Price</h4>
                        <input
                            type="range"
                            min="0"
                            max="5000"
                            step="100"
                            value={priceRange}
                            onChange={(e) => setPriceRange(Number(e.target.value))}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            <span>₹0</span>
                            <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>₹{priceRange}</span>
                        </div>
                    </div>
                </aside>

                {/* Product Grid */}
                <main style={{ flex: 1 }}>
                    {filteredBooks.length === 0 ? (
                        <div className="glass" style={{ textAlign: 'center', padding: '60px', borderRadius: '16px' }}>
                            <h3>No books found matching your criteria.</h3>
                            <button
                                onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setPriceRange(5000); }}
                                className="btn btn-secondary"
                                style={{ marginTop: '16px' }}
                            >
                                Clear Filters
                            </button>
                        </div>
                    ) : (
                        <div className="cards-grid">
                            {filteredBooks.map(book => (
                                <ProductCard key={book.id || book._id} book={book} />
                            ))}
                        </div>
                    )}
                </main>
            </div >
        </div >
    );
};

export default Marketplace;
