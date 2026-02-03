import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    if (loading) return <div className="container" style={{ paddingTop: '100px', textAlign: 'center' }}>Loading orders...</div>;
    if (error) return <div className="container" style={{ paddingTop: '100px', textAlign: 'center', color: 'red' }}>{error}</div>;

    return (
        <div className="container" style={{ paddingTop: '100px', minHeight: '80vh' }}>
            <h1 className="text-gradient" style={{ marginBottom: '30px', fontSize: '2.5rem' }}>My Orders</h1>

            {orders.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }} className="glass">
                    <h3>No orders found.</h3>
                    <p>Looks like you haven't purchased any books yet.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {orders.map(order => (
                        <div key={order._id} className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '15px' }}>
                                <div style={{ display: 'flex', gap: '20px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ORDER PLACED</div>
                                        <div style={{ fontWeight: '500' }}>{new Date(order.createdAt).toLocaleDateString()}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>TOTAL</div>
                                        <div style={{ fontWeight: '600' }}>₹{order.totalAmount}</div>
                                    </div>
                                </div>
                                <div>
                                    <span className={`badge ${order.status === 'Paid' ? 'success' : 'warning'}`}>
                                        {order.status}
                                    </span>
                                </div>
                            </div>
                            <div>
                                {order.items.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <div style={{ width: '40px', height: '55px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                                                {/* Placeholder for book cover if available, or generic icon */}
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '1.5rem' }}>📖</div>
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '500' }}>{item.title}</div>
                                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Quantity: {item.quantity}</div>
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: '600' }}>₹{item.price * item.quantity}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Orders;
