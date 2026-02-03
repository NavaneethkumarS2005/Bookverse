import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [recentOrders, setRecentOrders] = useState([]);
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, books
    const navigate = useNavigate();

    // Activities
    const [activities, setActivities] = useState([
        { id: 1, message: "New user registered: Arjun K.", time: "Just now", icon: "👤" },
        { id: 2, message: "Order #1024 placed by Priya", time: "2 mins ago", icon: "📦" },
        { id: 3, message: "Review added for 'Atomic Habits'", time: "5 mins ago", icon: "⭐" },
    ]);

    // Book Form State
    const [showBookModal, setShowBookModal] = useState(false);
    const [newBook, setNewBook] = useState({
        title: '', author: '', price: '', genre: '', image: '', desc: ''
    });

    useEffect(() => {
        fetchAdminData();
        // Simulate Live Activity
        const interval = setInterval(() => {
            const events = [
                { message: "New sale: 'The Alchemist'", icon: "💰" },
                { message: "User 'Rahul' logged in", icon: "🟢" },
                { message: "New comment on Community", icon: "💬" },
                { message: "Stock alert: '1984' low", icon: "⚠️" }
            ];
            const randomEvent = events[Math.floor(Math.random() * events.length)];
            const newActivity = {
                id: Date.now(),
                message: randomEvent.message,
                time: "Just now",
                icon: randomEvent.icon
            };
            setActivities(prev => [newActivity, ...prev.slice(0, 4)]);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchAdminData = async () => {
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');

            if (!user || user.role !== 'admin') {
                navigate('/');
                return;
            }

            const [statsRes, booksRes] = await Promise.all([
                axios.get(`${API_URL}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
                // Assuming we can fetch all books publicly or via admin
                axios.get(`${API_URL}/api/books`)
            ]);

            setStats(statsRes.data.stats);
            setRecentOrders(statsRes.data.recentOrders);
            setBooks(booksRes.data);
        } catch (err) {
            console.error("Admin Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBook = async (id) => {
        if (!window.confirm("Are you sure you want to delete this book?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/books/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBooks(books.filter(b => b.id !== id && b._id !== id));
            alert("Book deleted");
        } catch (err) {
            console.error(err);
            alert("Failed to delete book");
        }
    };

    const handleAddBook = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/books`, newBook, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBooks([...books, res.data]);
            setShowBookModal(false);
            setNewBook({ title: '', author: '', price: '', genre: '', image: '', desc: '' });
            alert("Book added successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to add book");
        }
    };

    if (loading) return <div className="container" style={{ paddingTop: '100px', textAlign: 'center' }}>Loading Admin Panel...</div>;

    return (
        <div className="container" style={{ paddingTop: '100px', paddingBottom: '40px', minHeight: '80vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 className="text-gradient">Admin Dashboard</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        📊 Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('books')}
                        className={`btn ${activeTab === 'books' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        📚 Manage Books
                    </button>
                </div>
            </div>

            {activeTab === 'dashboard' && stats && (
                <div className="fade-in">
                    {/* STATS CARDS */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                        <div className="card" style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ fontSize: '2.5rem', background: 'rgba(59, 130, 246, 0.1)', padding: '15px', borderRadius: '12px' }}>💰</div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Revenue</p>
                                <h2 style={{ fontSize: '2rem' }}>₹{stats.revenue.toLocaleString()}</h2>
                            </div>
                        </div>
                        <div className="card" style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ fontSize: '2.5rem', background: 'rgba(16, 185, 129, 0.1)', padding: '15px', borderRadius: '12px' }}>📦</div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Orders</p>
                                <h2 style={{ fontSize: '2rem' }}>{stats.orders}</h2>
                            </div>
                        </div>
                        <div className="card" style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ fontSize: '2.5rem', background: 'rgba(236, 72, 153, 0.1)', padding: '15px', borderRadius: '12px' }}>👥</div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Users</p>
                                <h2 style={{ fontSize: '2rem' }}>{stats.users}</h2>
                            </div>
                        </div>
                        <div className="card" style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ fontSize: '2.5rem', background: 'rgba(245, 158, 11, 0.1)', padding: '15px', borderRadius: '12px' }}>📚</div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Books</p>
                                <h2 style={{ fontSize: '2rem' }}>{stats.books}</h2>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', alignItems: 'start' }} className="admin-grid">
                        {/* RECENT ORDERS */}
                        <div className="glass" style={{ padding: '30px', borderRadius: '16px' }}>
                            <h3 style={{ marginBottom: '20px' }}>Recent Orders</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                                            <th style={{ padding: '15px' }}>ID</th>
                                            <th style={{ padding: '15px' }}>User</th>
                                            <th style={{ padding: '15px' }}>Status</th>
                                            <th style={{ padding: '15px' }}>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentOrders.map(order => (
                                            <tr key={order._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '15px', fontFamily: 'monospace' }}>{order._id.slice(-6)}</td>
                                                <td style={{ padding: '15px' }}>{order.user?.name || 'Guest'}</td>
                                                <td style={{ padding: '15px' }}><span className={`badge ${order.status === 'Paid' ? 'success' : 'warning'}`}>{order.status}</span></td>
                                                <td style={{ padding: '15px', color: 'var(--text-muted)' }}>{new Date(order.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* LIVE ACTIVITY */}
                        <div className="glass" style={{ padding: '30px', borderRadius: '16px' }}>
                            <h3 style={{ marginBottom: '20px' }}>Live Activity</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {activities.map(act => (
                                    <div key={act.id} className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                        <div style={{ fontSize: '1.2rem' }}>{act.icon}</div>
                                        <div>
                                            <p style={{ fontSize: '0.9rem', marginBottom: '2px' }}>{act.message}</p>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{act.time}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'books' && (
                <div className="fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2>Book Inventory</h2>
                        <button onClick={() => setShowBookModal(true)} className="btn btn-primary">+ Add New Book</button>
                    </div>

                    <div className="glass" style={{ padding: '20px', borderRadius: '16px', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                                    <th style={{ padding: '15px' }}>Image</th>
                                    <th style={{ padding: '15px' }}>Title</th>
                                    <th style={{ padding: '15px' }}>Author</th>
                                    <th style={{ padding: '15px' }}>Price</th>
                                    <th style={{ padding: '15px' }}>Genre</th>
                                    <th style={{ padding: '15px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {books.map(book => (
                                    <tr key={book.id || book._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '10px' }}>
                                            <img src={book.image} alt="" style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                                        </td>
                                        <td style={{ padding: '15px', fontWeight: '500' }}>{book.title}</td>
                                        <td style={{ padding: '15px', color: 'var(--text-muted)' }}>{book.author}</td>
                                        <td style={{ padding: '15px' }}>₹{book.price}</td>
                                        <td style={{ padding: '15px' }}><span className="badge">{book.genre}</span></td>
                                        <td style={{ padding: '15px' }}>
                                            <button
                                                onClick={() => handleDeleteBook(book.id || book._id)}
                                                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ADD BOOK MODAL */}
            {showBookModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass" style={{ maxWidth: '600px' }}>
                        <button onClick={() => setShowBookModal(false)} className="close-modal">&times;</button>
                        <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>Add New Book</h2>
                        <form onSubmit={handleAddBook} style={{ display: 'grid', gap: '15px' }}>
                            <input type="text" placeholder="Title" required className="form-input" value={newBook.title} onChange={e => setNewBook({ ...newBook, title: e.target.value })} />
                            <input type="text" placeholder="Author" required className="form-input" value={newBook.author} onChange={e => setNewBook({ ...newBook, author: e.target.value })} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <input type="number" placeholder="Price (₹)" required className="form-input" value={newBook.price} onChange={e => setNewBook({ ...newBook, price: e.target.value })} />
                                <input type="text" placeholder="Genre" required className="form-input" value={newBook.genre} onChange={e => setNewBook({ ...newBook, genre: e.target.value })} />
                            </div>
                            <input type="url" placeholder="Image URL (e.g. from Unsplash/Placehold)" required className="form-input" value={newBook.image} onChange={e => setNewBook({ ...newBook, image: e.target.value })} />
                            <input type="url" placeholder="Buy Link (Optional)" className="form-input" value={newBook.buyLink || ''} onChange={e => setNewBook({ ...newBook, buyLink: e.target.value })} />
                            <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>Add Book</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
