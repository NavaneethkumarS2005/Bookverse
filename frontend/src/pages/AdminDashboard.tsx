import React, { useEffect, useState } from 'react';
import axios from 'axios';
// @ts-ignore
import { API_URL } from '../config';
import { useNavigate } from 'react-router-dom';
import { Book } from '../types';

interface Stats {
    revenue: number;
    orders: number;
    users: number;
    books: number;
}

interface Activity {
    id: number;
    message: string;
    time: string;
    icon: string;
}

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, books
    const navigate = useNavigate();

    // Activities
    const [activities, setActivities] = useState<Activity[]>([
        { id: 1, message: "New user registered: Arjun K.", time: "Just now", icon: "👤" },
        { id: 2, message: "Order #1024 placed by Priya", time: "2 mins ago", icon: "📦" },
        { id: 3, message: "Review added for 'Atomic Habits'", time: "5 mins ago", icon: "⭐" },
    ]);

    // Book Form State
    const [showBookModal, setShowBookModal] = useState(false);
    const [newBook, setNewBook] = useState({
        title: '', author: '', price: '', genre: '', image: '', desc: '', buyLink: ''
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

    const handleDeleteBook = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this book?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/books/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBooks(books.filter(b => b.id !== id && (b as any)._id !== id));
            alert("Book deleted");
        } catch (err) {
            console.error(err);
            alert("Failed to delete book");
        }
    };

    const handleAddBook = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/books`, { ...newBook, price: Number(newBook.price) }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBooks([...books, res.data]);
            setShowBookModal(false);
            setNewBook({ title: '', author: '', price: '', genre: '', image: '', desc: '', buyLink: '' });
            alert("Book added successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to add book");
        }
    };

    if (loading) return (
        <div className="min-h-screen pt-24 flex items-center justify-center text-slate-500 dark:text-slate-400">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p>Loading Admin Dashboard...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen pt-28 pb-20 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-5">
                <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                    <h1 className="font-outfit text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                        Admin Dashboard
                    </h1>
                    <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'dashboard'
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            📊 Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('books')}
                            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'books'
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            📚 Manage Books
                        </button>
                    </div>
                </div>

                {activeTab === 'dashboard' && stats && (
                    <div className="space-y-8 animate-fade-in">
                        {/* STATS CARDS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-5">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl text-3xl">💰</div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Revenue</p>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">₹{stats.revenue.toLocaleString()}</h2>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-5">
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-3xl">📦</div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Orders</p>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.orders}</h2>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-5">
                                <div className="p-4 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 rounded-2xl text-3xl">👥</div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Users</p>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.users}</h2>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-5">
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl text-3xl">📚</div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Books</p>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.books}</h2>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* RECENT ORDERS */}
                            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                                <h3 className="font-outfit font-bold text-xl text-slate-900 dark:text-white mb-6">Recent Orders</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b-2 border-slate-100 dark:border-slate-800">
                                                <th className="pb-4 font-semibold text-slate-500 text-sm uppercase tracking-wider">ID</th>
                                                <th className="pb-4 font-semibold text-slate-500 text-sm uppercase tracking-wider">User</th>
                                                <th className="pb-4 font-semibold text-slate-500 text-sm uppercase tracking-wider">Status</th>
                                                <th className="pb-4 font-semibold text-slate-500 text-sm uppercase tracking-wider">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {recentOrders.map(order => (
                                                <tr key={order._id}>
                                                    <td className="py-4 font-mono text-sm text-slate-600 dark:text-slate-400">{order._id.slice(-6).toUpperCase()}</td>
                                                    <td className="py-4 font-medium text-slate-900 dark:text-white">{order.user?.name || 'Guest'}</td>
                                                    <td className="py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${order.status === 'Paid'
                                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                                            }`}>
                                                            {order.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 text-sm text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* LIVE ACTIVITY */}
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 h-fit">
                                <h3 className="font-outfit font-bold text-xl text-slate-900 dark:text-white mb-6">Live Activity</h3>
                                <div className="space-y-4">
                                    {activities.map(act => (
                                        <div key={act.id} className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                            <div className="text-xl">{act.icon}</div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900 dark:text-white">{act.message}</p>
                                                <span className="text-xs text-slate-400">{act.time}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'books' && (
                    <div className="animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-outfit font-bold text-2xl text-slate-900 dark:text-white">Book Inventory</h2>
                            <button
                                onClick={() => setShowBookModal(true)}
                                className="px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
                            >
                                <span>+</span> Add New Book
                            </button>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Image</th>
                                            <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Title</th>
                                            <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Author</th>
                                            <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Price</th>
                                            <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Genre</th>
                                            <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {books.map(book => (
                                            <tr key={book.id || (book as any)._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <img src={book.image} alt="" className="w-10 h-14 object-cover rounded shadow-sm" />
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{book.title}</td>
                                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{book.author}</td>
                                                <td className="px-6 py-4 font-medium">₹{book.price}</td>
                                                <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-600 dark:text-slate-300 font-medium">{book.genre}</span></td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => handleDeleteBook(book.id || (book as any)._id)}
                                                        className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 text-xs font-bold transition-all"
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
                    </div>
                )}

                {/* ADD BOOK MODAL */}
                {showBookModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBookModal(false)}></div>
                        <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => setShowBookModal(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                &times;
                            </button>
                            <h2 className="font-outfit font-bold text-2xl text-center text-slate-900 dark:text-white mb-6">Add New Book</h2>
                            <form onSubmit={handleAddBook} className="space-y-4">
                                <input type="text" placeholder="Title" required className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 focus:ring-2 focus:ring-indigo-500 outline-none" value={newBook.title} onChange={e => setNewBook({ ...newBook, title: e.target.value })} />
                                <input type="text" placeholder="Author" required className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 focus:ring-2 focus:ring-indigo-500 outline-none" value={newBook.author} onChange={e => setNewBook({ ...newBook, author: e.target.value })} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" placeholder="Price (₹)" required className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 focus:ring-2 focus:ring-indigo-500 outline-none" value={newBook.price} onChange={e => setNewBook({ ...newBook, price: e.target.value })} />
                                    <input type="text" placeholder="Genre" required className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 focus:ring-2 focus:ring-indigo-500 outline-none" value={newBook.genre} onChange={e => setNewBook({ ...newBook, genre: e.target.value })} />
                                </div>
                                <input type="url" placeholder="Image URL (e.g. from Unsplash/Placehold)" required className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 focus:ring-2 focus:ring-indigo-500 outline-none" value={newBook.image} onChange={e => setNewBook({ ...newBook, image: e.target.value })} />
                                <input type="text" placeholder="Description (Optional)" className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 focus:ring-2 focus:ring-indigo-500 outline-none" value={newBook.desc || ''} onChange={e => setNewBook({ ...newBook, desc: e.target.value })} />
                                <button type="submit" className="w-full py-4 rounded-xl font-bold text-white bg-slate-900 dark:bg-white text-slate-900 hover:opacity-90 transition-opacity mt-2">Add Book</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
