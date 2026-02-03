import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const Profile = () => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
    const [activeTab, setActiveTab] = useState('profile'); // profile, orders
    const [orders, setOrders] = useState([]);
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

        fetchUserData();
    }, [location, user]);

    const fetchUserData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ordersRes = await axios.get(`${API_URL}/api/orders`, { headers: { Authorization: `Bearer ${token}` } });
            setOrders(ordersRes.data);
        } catch (error) {
            console.error("Error fetching user data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/');
        window.location.reload();
    };

    if (!user) return null;

    return (
        <div className="container" style={{ paddingTop: '100px', minHeight: '80vh' }}>
            <div className="profile-layout" style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '40px' }}>

                {/* SIDEBAR */}
                <div className="glass" style={{ padding: '30px', borderRadius: '16px', height: 'fit-content' }}>
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <div style={{ width: '80px', height: '80px', background: 'var(--accent-gradient)', borderRadius: '50%', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: 'white' }}>
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <h3 style={{ marginBottom: '5px' }}>{user.name}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{user.email}</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`btn-tab ${activeTab === 'profile' ? 'active' : ''}`}
                            style={tabStyle(activeTab === 'profile')}
                        >
                            👤 My Profile
                        </button>
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`btn-tab ${activeTab === 'orders' ? 'active' : ''}`}
                            style={tabStyle(activeTab === 'orders')}
                        >
                            📦 My Orders
                        </button>
                        {user.role === 'admin' && (
                            <Link to="/admin" className="btn-tab" style={{ ...tabStyle(false), color: 'var(--primary)' }}>
                                🛡️ Admin Dashboard
                            </Link>
                        )}
                        <div style={{ height: '1px', background: 'var(--border)', margin: '15px 0' }}></div>
                        <button onClick={handleLogout} style={{ ...tabStyle(false), color: 'var(--error)' }}>
                            🚪 Logout
                        </button>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div>
                    {loading ? (
                        <div className="glass" style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
                    ) : (
                        <>
                            {activeTab === 'profile' && (
                                <div className="glass fade-in" style={{ padding: '40px', borderRadius: '16px' }}>
                                    <h2 className="text-gradient" style={{ marginBottom: '30px' }}>Profile Details</h2>
                                    <div style={{ display: 'grid', gap: '20px', maxWidth: '500px' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Full Name</label>
                                            <div className="form-input" style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>{user.name}</div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Email Address</label>
                                            <div className="form-input" style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>{user.email}</div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Account Type</label>
                                            <div className="badge" style={{ display: 'inline-block' }}>{user.role.toUpperCase()}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'orders' && (
                                <div className="fade-in">
                                    <h2 className="text-gradient" style={{ marginBottom: '30px' }}>Order History</h2>
                                    {orders.length === 0 ? (
                                        <div className="glass" style={{ padding: '40px', textAlign: 'center', borderRadius: '16px' }}>
                                            <p>No orders found.</p>
                                            <Link to="/marketplace" className="btn btn-primary" style={{ marginTop: '20px', display: 'inline-block' }}>Start Shopping</Link>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            {orders.map(order => (
                                                <div key={order._id} className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '1px solid var(--border)', paddingBottom: '15px' }}>
                                                        <div>
                                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Order ID</div>
                                                            <div style={{ fontFamily: 'monospace' }}>#{order._id.slice(-6).toUpperCase()}</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Date</div>
                                                            <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total</div>
                                                            <div style={{ fontWeight: 'bold' }}>₹{order.totalAmount}</div>
                                                        </div>
                                                        <span className={`badge ${order.status === 'Paid' ? 'success' : 'warning'}`}>{order.status}</span>
                                                    </div>
                                                    <div>
                                                        {order.items.map((item, idx) => (
                                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' }}>
                                                                <span>{item.title} <span style={{ color: 'var(--text-muted)' }}>x{item.quantity}</span></span>
                                                                <span>₹{item.price * item.quantity}</span>
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
    );
};

const tabStyle = (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 20px',
    background: active ? 'var(--bg-secondary)' : 'transparent',
    color: active ? 'var(--primary)' : 'var(--text-main)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    fontSize: '1rem',
    fontWeight: active ? '600' : '400',
    transition: 'all 0.2s ease'
});

export default Profile;
