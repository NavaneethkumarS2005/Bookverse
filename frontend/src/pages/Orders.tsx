import React, { useEffect, useState } from 'react';
import axios from 'axios';
// @ts-ignore
import { API_URL } from '../config';

interface OrderItem {
    title: string;
    quantity: number;
    price: number;
}

interface Order {
    _id: string;
    items: OrderItem[];
    totalAmount: number;
    status: string;
    createdAt: string;
}

const Orders: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('Please login to view orders.');
                    setLoading(false);
                    return;
                }

                const response = await axios.get(`${API_URL}/api/orders`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setOrders(response.data);
            } catch (err) {
                setError('Failed to fetch orders.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    if (loading) return (
        <div className="min-h-screen pt-24 flex items-center justify-center text-slate-500 dark:text-slate-400">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p>Loading your orders...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen pt-24 flex items-center justify-center text-red-500">
            <p>{error}</p>
        </div>
    );

    return (
        <div className="min-h-screen pt-28 pb-20 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="max-w-4xl mx-auto px-5">
                <h1 className="font-outfit text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-8">My Orders</h1>

                {orders.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="text-6xl mb-6 opacity-20 filter grayscale">📦</div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">No orders found.</h3>
                        <p className="text-slate-500 dark:text-slate-400">Looks like you haven't purchased any books yet.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map(order => (
                            <div key={order._id} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
                                    <div className="flex gap-8">
                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ORDER PLACED</div>
                                            <div className="font-medium text-slate-900 dark:text-white">{new Date(order.createdAt).toLocaleDateString()}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">TOTAL</div>
                                            <div className="font-bold text-indigo-600 dark:text-indigo-400">₹{order.totalAmount}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${order.status === 'Paid'
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 text-xl border border-slate-200 dark:border-slate-700">
                                                    📖
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.title}</div>
                                                    <div className="text-sm text-slate-500">Qty: {item.quantity} × ₹{item.price}</div>
                                                </div>
                                            </div>
                                            <div className="font-bold text-slate-900 dark:text-white">₹{item.price * item.quantity}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Orders;
