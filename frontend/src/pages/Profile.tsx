import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
// @ts-ignore
import { API_URL } from '../config';

interface User {
    name: string;
    email: string;
    role: string;
}

interface OrderItem {
    title: string;
    quantity: number;
    price: number;
}

interface Order {
    _id: string;
    orderItems: OrderItem[];
    totalPrice: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
}

const Profile: React.FC = () => {
    const [user] = useState<User | null>(JSON.parse(localStorage.getItem('user') || 'null'));
    const [activeTab, setActiveTab] = useState('profile'); // profile, orders
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        const query = new URLSearchParams(location.search);
        const tab = query.get('tab');
        if (tab) setActiveTab(tab);

        if (activeTab === 'orders') {
            fetchUserData();
        }
    }, [location, user, activeTab, navigate]);

    const fetchUserData = async () => {
        setLoading(true);
        try {
            const ordersRes = await axios.get(`${API_URL}/api/orders`, { withCredentials: true });
            setOrders(ordersRes.data);
        } catch (error) {
            console.error("Error fetching user data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
        } finally {
            localStorage.removeItem('user');
            navigate('/');
            window.location.reload();
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen pt-28 pb-20 bg-slate-50  transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-5">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* SIDEBAR */}
                    <div className="lg:col-span-1">
                        <div className="bg-white  rounded-2xl p-6 shadow-sm border border-slate-200  sticky top-28">
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 bg-[#171713] rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-[#fffdf8] shadow-sm">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <h3 className="font-bold text-xl text-slate-900  mb-1">{user.name}</h3>
                                <p className="text-slate-500  text-sm truncate">{user.email}</p>
                            </div>

                            <div className="space-y-2">
                                <button
                                    onClick={() => setActiveTab('profile')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'profile'
                                        ? 'bg-indigo-50  text-indigo-600  font-semibold'
                                        : 'text-slate-600  hover:bg-slate-50 '
                                        }`}
                                >
                                    <span>👤</span> My Profile
                                </button>
                                <button
                                    onClick={() => setActiveTab('orders')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'orders'
                                        ? 'bg-indigo-50  text-indigo-600  font-semibold'
                                        : 'text-slate-600  hover:bg-slate-50 '
                                        }`}
                                >
                                    <span>📦</span> My Orders
                                </button>
                                {user.role === 'admin' && (
                                    <Link to="/admin" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-amber-600  hover:bg-amber-50  transition-all font-medium">
                                        <span>🛡️</span> Admin Dashboard
                                    </Link>
                                )}
                                <div className="h-px bg-slate-200  my-4"></div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50  transition-all font-medium"
                                >
                                    <span>🚪</span> Logout
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* CONTENT AREA */}
                    <div className="lg:col-span-3">
                        {loading ? (
                            <div className="bg-white  rounded-2xl p-12 text-center shadow-sm border border-slate-200 ">
                                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-slate-500">Loading...</p>
                            </div>
                        ) : (
                            <>
                                {activeTab === 'profile' && (
                                    <div className="bg-white  rounded-2xl p-8 shadow-sm border border-slate-200  animate-fade-in">
                                        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent mb-8">Profile Details</h2>
                                        <div className="grid gap-6 max-w-lg">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-500  mb-2">Full Name</label>
                                                <div className="px-4 py-3 bg-slate-50  rounded-xl text-slate-900  border border-slate-200 ">{user.name}</div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-500  mb-2">Email Address</label>
                                                <div className="px-4 py-3 bg-slate-50  rounded-xl text-slate-900  border border-slate-200 ">{user.email}</div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-500  mb-2">Account Type</label>
                                                <div className="inline-block px-3 py-1 bg-indigo-100  text-indigo-700  rounded-lg text-sm font-bold uppercase tracking-wide border border-indigo-200 ">{user.role}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'orders' && (
                                    <div className="animate-fade-in">
                                        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent mb-6">Order History</h2>
                                        {orders.length === 0 ? (
                                            <div className="bg-white  rounded-2xl p-12 text-center border border-slate-200  shadow-sm">
                                                <p className="text-slate-500 mb-6">No orders found.</p>
                                                <Link to="/marketplace" className="btn btn-primary px-6 py-2.5">Start Shopping</Link>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {orders.map(order => (
                                                    <div key={order._id} className="bg-white  rounded-2xl p-6 shadow-sm border border-slate-200 ">
                                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b border-slate-100  pb-4 gap-4">
                                                            <div className="flex gap-6">
                                                                <div>
                                                                    <div className="text-xs text-slate-400 uppercase font-bold">Order ID</div>
                                                                    <div className="font-mono text-sm text-slate-700 ">#{order._id.slice(-6).toUpperCase()}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-slate-400 uppercase font-bold">Date</div>
                                                                    <div className="text-sm text-slate-700 ">{new Date(order.createdAt).toLocaleDateString()}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-slate-400 uppercase font-bold">Total</div>
                                                                    <div className="font-bold text-indigo-600 ">₹{order.totalPrice}</div>
                                                                </div>
                                                            </div>
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${order.status === 'Paid'
                                                                ? 'bg-green-100  text-green-700 '
                                                                : 'bg-amber-100  text-amber-700 '
                                                                }`}>
                                                                {order.status}
                                                            </span>
                                                            {order.paymentMethod === 'UPI_QR_DEMO' && (
                                                                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-yellow-100 text-yellow-800  ">
                                                                    Demo UPI
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="space-y-3">
                                                            {order.orderItems.map((item, idx) => (
                                                                <div key={idx} className="flex justify-between items-center text-sm">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-slate-400">📖</span>
                                                                        <span className="font-medium text-slate-800 ">{item.title}</span>
                                                                        <span className="text-slate-500 text-xs">x{item.quantity}</span>
                                                                    </div>
                                                                    <span className="font-medium text-slate-700 ">₹{item.price * item.quantity}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
