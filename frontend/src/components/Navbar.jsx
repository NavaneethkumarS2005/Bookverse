import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();
    const { cart } = useCart();
    const { theme, toggleTheme } = useTheme();
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const isActive = (path) => location.pathname === path ? 'active' : '';

    return (
        <nav className="navbar glass">
            <div className="container navbar-inner">
                <Link to="/" className="logo text-gradient">BookVerse</Link>

                <button
                    type="button"
                    className="hamburger"
                    onClick={toggleMenu}
                    aria-expanded={isMenuOpen}
                    aria-label="Toggle menu"
                >
                    <span className="bar"></span>
                    <span className="bar"></span>
                    <span className="bar"></span>
                </button>

                <div className={`nav-center ${isMenuOpen ? 'open' : ''}`}>
                    <ul className="nav-links">
                        <li><Link to="/" className={isActive('/')}>Home</Link></li>
                        <li><Link to="/marketplace" className={isActive('/marketplace')}>Marketplace</Link></li>
                        <li><Link to="/categories" className={isActive('/categories')}>Categories</Link></li>
                        <li><Link to="/community" className={isActive('/community')}>Community</Link></li>
                        <li><Link to="/contact" className={isActive('/contact')}>Contact</Link></li>

                        {user && (
                            <>
                                <li><Link to="/orders" className={isActive('/orders')}>My Orders</Link></li>
                                {user.role === 'admin' && (
                                    <li><Link to="/admin" className={isActive('/admin')}>Dashboard</Link></li>
                                )}
                            </>
                        )}
                    </ul>
                </div>

                <div className="nav-actions">
                    <Link to="/cart" className={`cart-link ${isActive('/cart')}`}>
                        <span className="cart-icon">🛒</span>
                        {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
                    </Link>

                    <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>

                    {user ? (
                        <div className="user-menu" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <Link to="/profile" className="user-name" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'var(--text-main)', fontWeight: '500' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.9rem' }}>
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <span style={{ display: 'none', '@media (min-width: 768px)': { display: 'inline' } }}>{user.name.split(' ')[0]}</span>
                            </Link>
                            <button
                                onClick={() => {
                                    localStorage.removeItem('user');
                                    localStorage.removeItem('token');
                                    window.location.href = '/login';
                                }}
                                className="btn-logout"
                                style={{
                                    background: 'transparent',
                                    border: '1px solid var(--error)',
                                    color: 'var(--error)',
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: '600'
                                }}
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <Link to="/login" className="btn-nav">Login</Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
