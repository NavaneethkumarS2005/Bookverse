import React, { useEffect, useState } from 'react';
import axios from 'axios';
// @ts-ignore
import { API_URL } from '../config';
import BookCover from '../components/BookCover';
import { useNavigate } from 'react-router-dom';
import { Book } from '../types';
import InlineAlert from '../components/InlineAlert';
import AdminPublisherManagement from '../components/AdminPublisherManagement';
import AdminBoothBookingManagement from '../components/AdminBoothBookingManagement';

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
    const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

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
            const user = JSON.parse(localStorage.getItem('user') || '{}');

            if (!user || user.role !== 'admin') {
                navigate('/');
                return;
            }

            const [statsRes, booksRes] = await Promise.all([
                axios.get(`${API_URL}/api/admin/stats`, { withCredentials: true }),
                axios.get(`${API_URL}/api/books`)
            ]);

            setStats(statsRes.data.stats);
            setRecentOrders(statsRes.data.recentOrders);

            // Support paginated { books: [], ... } or legacy array
            const bookData = booksRes.data.books || booksRes.data;
            setBooks(Array.isArray(bookData) ? bookData : []);
            setLoadError(null);
        } catch (err) {
            console.error("Admin Error:", err);
            setLoadError('Failed to load admin data. Please check your connection or try refreshing the page.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBook = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this book?")) return;
        try {
            await axios.delete(`${API_URL}/api/books/${id}`, { withCredentials: true });
            setBooks(books.filter(b => b.id !== id && (b as any)._id !== id));
            setAlertMessage({ type: 'success', text: 'Book deleted successfully!' });
        } catch (err) {
            console.error(err);
            setAlertMessage({ type: 'error', text: 'Failed to delete book. Please try again.' });
        }
    };

    const handleAddBook = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_URL}/api/books`, { ...newBook, price: Number(newBook.price) }, { withCredentials: true });
            setBooks([...books, res.data]);
            setShowBookModal(false);
            setNewBook({ title: '', author: '', price: '', genre: '', image: '', desc: '', buyLink: '' });
            setAlertMessage({ type: 'success', text: 'Book added successfully!' });
        } catch (err) {
            console.error(err);
            setAlertMessage({ type: 'error', text: 'Failed to add book. Please try again.' });
        }
    };

    if (loading) return (
        <div className="min-h-screen pt-24 flex items-center justify-center text-slate-500 ">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p>Loading Admin Dashboard...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen pt-28 pb-20 bg-slate-50  transition-colors duration-300">
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

            <div className="max-w-7xl mx-auto px-5">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h1 className="font-outfit text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                        Admin Dashboard
                    </h1>
                    <div className="flex bg-white  p-1.5 rounded-xl border border-slate-200  shadow-sm">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'dashboard'
                                ? 'bg-slate-900  text-white  shadow-md'
                                : 'text-slate-500  hover:text-slate-900 '
                                }`}
                        >
                            📊 Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('books')}
                            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'books'
                                ? 'bg-slate-900  text-white  shadow-md'
                                : 'text-slate-500  hover:text-slate-900 '
                                }`}
                        >
                            📚 Manage Books
                        </button>
                        <button
                            onClick={() => setActiveTab('publishers')}
                            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'publishers'
                                ? 'bg-slate-900  text-white  shadow-md'
                                : 'text-slate-500  hover:text-slate-900 '
                                }`}
                        >
                            Publishers
                        </button>
                        <button
                            onClick={() => setActiveTab('expo-bookings')}
                            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'expo-bookings'
                                ? 'bg-slate-900  text-white  shadow-md'
                                : 'text-slate-500  hover:text-slate-900 '
                                }`}
                        >
                            Expo stalls
                        </button>
                    </div>
                </div>

                {loadError && (
                    <div className="mb-6">
                        <InlineAlert
                            type="error"
                            message={loadError}
                            onClose={() => setLoadError(null)}
                        />
                    </div>
                )}

                {activeTab === 'dashboard' && stats && (
                    <div className="space-y-8 animate-fade-in">
                        {/* STATS CARDS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white  p-6 rounded-2xl shadow-sm border border-slate-200  flex items-center gap-5">
                                <div className="p-4 bg-blue-50  text-blue-600  rounded-2xl text-3xl">💰</div>
                                <div>
                                    <p className="text-sm text-slate-500  font-medium">Revenue</p>
                                    <h2 className="text-2xl font-bold text-slate-900 ">₹{stats.revenue.toLocaleString()}</h2>
                                </div>
                            </div>
                            <div className="bg-white  p-6 rounded-2xl shadow-sm border border-slate-200  flex items-center gap-5">
                                <div className="p-4 bg-emerald-50  text-emerald-600  rounded-2xl text-3xl">📦</div>
                                <div>
                                    <p className="text-sm text-slate-500  font-medium">Orders</p>
                                    <h2 className="text-2xl font-bold text-slate-900 ">{stats.orders}</h2>
                                </div>
                            </div>
                            <div className="bg-white  p-6 rounded-2xl shadow-sm border border-slate-200  flex items-center gap-5">
                                <div className="p-4 bg-pink-50  text-pink-600  rounded-2xl text-3xl">👥</div>
                                <div>
                                    <p className="text-sm text-slate-500  font-medium">Users</p>
                                    <h2 className="text-2xl font-bold text-slate-900 ">{stats.users}</h2>
                                </div>
                            </div>
                            <div className="bg-white  p-6 rounded-2xl shadow-sm border border-slate-200  flex items-center gap-5">
                                <div className="p-4 bg-amber-50  text-amber-600  rounded-2xl text-3xl">📚</div>
                                <div>
                                    <p className="text-sm text-slate-500  font-medium">Books</p>
                                    <h2 className="text-2xl font-bold text-slate-900 ">{stats.books}</h2>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* RECENT ORDERS */}
                            <div className="lg:col-span-2 bg-white  p-8 rounded-2xl shadow-sm border border-slate-200 ">
                                <h3 className="font-outfit font-bold text-xl text-slate-900  mb-6">Recent Orders</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b-2 border-slate-100 ">
                                                <th className="pb-4 font-semibold text-slate-500 text-sm uppercase tracking-wider">ID</th>
                                                <th className="pb-4 font-semibold text-slate-500 text-sm uppercase tracking-wider">User</th>
                                                <th className="pb-4 font-semibold text-slate-500 text-sm uppercase tracking-wider">Status</th>
                                                <th className="pb-4 font-semibold text-slate-500 text-sm uppercase tracking-wider">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 ">
                                            {recentOrders.map(order => (
                                                <tr key={order._id}>
                                                    <td className="py-4 font-mono text-sm text-slate-600 ">{order._id.slice(-6).toUpperCase()}</td>
                                                    <td className="py-4 font-medium text-slate-900 ">{order.user?.name || 'Guest'}</td>
                                                    <td className="py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${order.status === 'Paid'
                                                            ? 'bg-green-100  text-green-700 '
                                                            : 'bg-amber-100  text-amber-700 '
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
                            <div className="bg-white  p-8 rounded-2xl shadow-sm border border-slate-200  h-fit">
                                <h3 className="font-outfit font-bold text-xl text-slate-900  mb-6">Live Activity</h3>
                                <div className="space-y-4">
                                    {activities.map(act => (
                                        <div key={act.id} className="flex gap-4 p-3 bg-slate-50  rounded-xl">
                                            <div className="text-xl">{act.icon}</div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900 ">{act.message}</p>
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
                            <h2 className="font-outfit font-bold text-2xl text-slate-900 ">Book Inventory</h2>
                            <button
                                onClick={() => setShowBookModal(true)}
                                className="btn btn-primary px-6 py-2.5"
                            >
                                <span>+</span> Add New Book
                            </button>
                        </div>

                        <div className="bg-white  rounded-2xl border border-slate-200  overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 ">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Image</th>
                                            <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Title</th>
                                            <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Author</th>
                                            <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Price</th>
                                            <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Genre</th>
                                            <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 ">
                                        {books.map(book => (
                                            <tr key={book.id || (book as any)._id} className="hover:bg-slate-50  transition-colors">
                                                <td className="px-6 py-4">
                                                    <BookCover book={book} className="h-14 w-10" alt="" />
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-900 ">{book.title}</td>
                                                <td className="px-6 py-4 text-slate-500 ">{book.author}</td>
                                                <td className="px-6 py-4 font-medium">₹{book.price}</td>
                                                <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100  rounded text-xs text-slate-600  font-medium">{book.genre}</span></td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => handleDeleteBook(book.id || (book as any)._id)}
                                                        className="px-3 py-1.5 rounded-lg bg-red-50  text-red-600  hover:bg-red-100  text-xs font-bold transition-all"
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

                {activeTab === 'publishers' && <AdminPublisherManagement />}
                {activeTab === 'expo-bookings' && <AdminBoothBookingManagement />}

                {/* ADD BOOK MODAL */}
                {showBookModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBookModal(false)}></div>
                        <div className="relative bg-white  rounded-3xl p-8 shadow-2xl w-full max-w-lg border border-slate-200 ">
                            <button
                                onClick={() => setShowBookModal(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600  text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100  transition-colors"
                            >
                                &times;
                            </button>
                            <h2 className="font-outfit font-bold text-2xl text-center text-slate-900  mb-6">Add New Book</h2>
                            <form onSubmit={handleAddBook} className="space-y-4">
                                <input type="text" placeholder="Title" required className="w-full px-4 py-3 rounded-xl border border-slate-300  bg-slate-50  focus:ring-2 focus:ring-indigo-500 outline-none" value={newBook.title} onChange={e => setNewBook({ ...newBook, title: e.target.value })} />
                                <input type="text" placeholder="Author" required className="w-full px-4 py-3 rounded-xl border border-slate-300  bg-slate-50  focus:ring-2 focus:ring-indigo-500 outline-none" value={newBook.author} onChange={e => setNewBook({ ...newBook, author: e.target.value })} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" placeholder="Price (₹)" required className="w-full px-4 py-3 rounded-xl border border-slate-300  bg-slate-50  focus:ring-2 focus:ring-indigo-500 outline-none" value={newBook.price} onChange={e => setNewBook({ ...newBook, price: e.target.value })} />
                                    <input type="text" placeholder="Genre" required className="w-full px-4 py-3 rounded-xl border border-slate-300  bg-slate-50  focus:ring-2 focus:ring-indigo-500 outline-none" value={newBook.genre} onChange={e => setNewBook({ ...newBook, genre: e.target.value })} />
                                </div>
                                <input type="url" placeholder="Image URL (e.g. from Unsplash/Placehold)" required className="w-full px-4 py-3 rounded-xl border border-slate-300  bg-slate-50  focus:ring-2 focus:ring-indigo-500 outline-none" value={newBook.image} onChange={e => setNewBook({ ...newBook, image: e.target.value })} />
                                <input type="text" placeholder="Description (Optional)" className="w-full px-4 py-3 rounded-xl border border-slate-300  bg-slate-50  focus:ring-2 focus:ring-indigo-500 outline-none" value={newBook.desc || ''} onChange={e => setNewBook({ ...newBook, desc: e.target.value })} />
                                <button type="submit" className="w-full py-4 rounded-xl font-bold bg-slate-900 text-white   hover:opacity-90 transition-opacity mt-2">Add Book</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
