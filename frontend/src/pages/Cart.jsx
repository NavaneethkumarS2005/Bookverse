import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { Link, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../components/CheckoutForm';
import { API_URL } from '../config';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_51SuDX02UpQ2jp5vRwVDAnoecRVA8WsNteEtprKOzrkjUjiLHIme2TyErwI4N4icMlwVkwHpsZFqalBIVYzh9YJLD00S6cm8qSM');

const Cart = () => {
    const { cart, removeFromCart, getCartTotal, clearCart } = useCart();
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('phonepe'); // 'stripe', 'phonepe', 'cod'
    const [processing, setProcessing] = useState(false);
    const [clientSecret, setClientSecret] = useState('');
    const [loadingSecret, setLoadingSecret] = useState(false);
    const [shippingDetails, setShippingDetails] = useState({
        address: '',
        city: '',
        zip: '',
        phone: ''
    });

    const location = useLocation();

    // Handle Payment Redirect Status (PhonePe)
    useEffect(() => {
        const query = new URLSearchParams(location.search);
        const status = query.get('status');
        if (status === 'failure') {
            alert("Payment Failed! Please try again.");
        } else if (status === 'success') {
            alert("Payment Successful!");
            clearCart();
        }
    }, [location]);

    const handleInputChange = (e) => {
        setShippingDetails({ ...shippingDetails, [e.target.name]: e.target.value });
    };

    const handleCheckout = () => {
        if (cart.length === 0) return;
        setIsPaymentOpen(true);
    };

    const fetchPaymentIntent = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert("You must be logged in to checkout.");
            window.location.href = "/login";
            return;
        }

        setLoadingSecret(true);
        try {
            const response = await fetch(`${API_URL}/api/payment/create-payment-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    items: cart.map(item => ({
                        bookId: item.id,
                        title: item.title,
                        price: item.price,
                        quantity: item.quantity || 1
                    }))
                })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    alert("Session expired. Please log in again.");
                    localStorage.removeItem('token');
                    window.location.href = "/login";
                    return;
                }
                const err = await response.json();
                throw new Error(err.message || 'Failed to init payment');
            }
            const data = await response.json();
            setClientSecret(data.clientSecret);
        } catch (error) {
            console.error("Payment Intent Error:", error);
            // Don't alert if we already redirected
            if (error.message !== "Failed to fetch") { // ambiguous check but safe
                // if handled above, return
            }
            if (!window.location.href.includes('login')) {
                alert("Error initiating checkout: " + error.message);
            }
        } finally {
            setLoadingSecret(false);
        }
    };

    useEffect(() => {
        if (isPaymentOpen && paymentMethod === 'stripe' && !clientSecret) {
            fetchPaymentIntent();
        }
    }, [isPaymentOpen, paymentMethod]);

    const handleProceedToPayment = () => {
        if (paymentMethod === 'stripe') {
            // Logic handled by CheckoutForm inside Elements
        } else if (paymentMethod === 'phonepe') {
            handlePhonePe();
        } else {
            handleCOD();
        }
    };

    const handleStripeSuccess = (paymentId) => {
        setIsPaymentOpen(false);
        clearCart();
        alert("Payment Successful!");
    };

    const handleCOD = async () => {
        if (!shippingDetails.address || !shippingDetails.phone) {
            alert("Please enter your Address and Phone Number for delivery.");
            return;
        }

        setProcessing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/payment/save-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    items: cart.map(item => ({ id: item.id, quantity: item.quantity || 1 })),
                    paymentMethod: 'COD',
                    shippingDetails: shippingDetails
                })
            });

            const data = await res.json();
            if (data.success) {
                alert("Order Placed Successfully via COD!");
                clearCart();
                setIsPaymentOpen(false);
            } else {
                alert("Order Failed: " + data.message);
            }
        } catch (error) {
            console.error("COD Error:", error);
            alert("Order Processing Failed");
        } finally {
            setProcessing(false);
        }
    };

    const handlePhonePe = async () => {
        try {
            setProcessing(true);
            const token = localStorage.getItem('token');

            const res = await fetch(`${API_URL}/api/phonepe/pay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: getCartTotal(),
                    userId: "USER_" + Date.now(),
                    items: cart.map(item => ({
                        bookId: item.id,
                        title: item.title,
                        price: item.price,
                        quantity: item.quantity || 1
                    })),
                    shippingDetails: shippingDetails
                })
            });

            const data = await res.json();
            if (data.success) {
                window.location.href = data.url; // Redirect to PhonePe
            } else {
                alert("PhonePe Error: " + data.message);
                setProcessing(false);
            }
        } catch (error) {
            console.error("Payment Error:", error);
            alert("Payment Initiation Failed: " + error.message);
            setProcessing(false);
        }
    };

    return (
        <div className="container" style={{ paddingTop: '100px', minHeight: '80vh', position: 'relative' }}>
            <h1 className="text-gradient" style={{ marginBottom: '40px', fontSize: '2.5rem' }}>Your Cart</h1>

            {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '4rem', opacity: '0.3', marginBottom: '20px' }}>🛒</div>
                    <h3>Your cart is empty.</h3>
                    <p style={{ marginBottom: '20px' }}>Looks like you haven't added any books yet.</p>
                    <Link to="/marketplace" className="btn btn-primary">Browse Books</Link>
                </div>
            ) : (
                <div className="cart-layout">
                    {/* Cart Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {cart.map((item) => (
                            <div key={item.id} className="cart-item glass">
                                <img
                                    src={item.image}
                                    alt={item.title}
                                    style={{ width: '80px', height: '120px', objectFit: 'cover', borderRadius: '8px' }}
                                />
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{item.title}</h3>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>{item.author}</p>
                                    <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>₹{item.price}</div>
                                </div>
                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="btn btn-secondary"
                                    style={{
                                        color: '#ef4444',
                                        borderColor: 'rgba(239, 68, 68, 0.3)',
                                        padding: '8px 12px',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    <div className="cart-summary glass">
                        <h3 style={{ marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>Order Summary</h3>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: 'var(--text-muted)' }}>
                            <span>Items ({cart.length})</span>
                            <span>₹{getCartTotal()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', color: 'var(--text-muted)' }}>
                            <span>Shipping</span>
                            <span>Free</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                            <span>Total</span>
                            <span className="text-gradient">₹{getCartTotal()}</span>
                        </div>

                        <button
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                            onClick={handleCheckout}
                        >
                            Proceed to Checkout
                        </button>
                    </div>
                </div>
            )}

            {/* PAYMENT MODAL */}
            {isPaymentOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass">
                        <button onClick={() => setIsPaymentOpen(false)} className="close-modal">&times;</button>

                        <h2 style={{ marginBottom: '30px', textAlign: 'center' }}>Checkout</h2>

                        {/* Select Method */}
                        <div className="payment-methods">
                            <button
                                onClick={() => setPaymentMethod('stripe')}
                                className={`payment-btn ${paymentMethod === 'stripe' ? 'active' : ''}`}
                            >
                                <span>💳</span> Card (Stripe)
                            </button>
                            <button
                                onClick={() => setPaymentMethod('phonepe')}
                                className={`payment-btn ${paymentMethod === 'phonepe' ? 'active' : ''}`}
                            >
                                <span>🟣</span> PhonePe
                            </button>
                            <button
                                onClick={() => setPaymentMethod('cod')}
                                className={`payment-btn ${paymentMethod === 'cod' ? 'active' : ''}`}
                            >
                                <span>💵</span> COD
                            </button>
                        </div>

                        {paymentMethod === 'stripe' && (
                            <div style={{ marginTop: '10px' }}>
                                {loadingSecret ? (
                                    <div style={{ textAlign: 'center', padding: '20px' }}>Loading Secure Payment...</div>
                                ) : (
                                    clientSecret && (
                                        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', labels: 'floating' } }}>
                                            <CheckoutForm
                                                clientSecret={clientSecret}
                                                cartItems={cart.map(item => ({
                                                    bookId: item.id,
                                                    title: item.title,
                                                    price: item.price,
                                                    quantity: item.quantity || 1
                                                }))}
                                                onSuccess={handleStripeSuccess}
                                                onCancel={() => setClientSecret('')}
                                            />
                                        </Elements>
                                    )
                                )}
                            </div>
                        )}

                        {paymentMethod === 'phonepe' && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ marginBottom: '30px' }}>
                                    <p style={{ color: 'var(--text-muted)' }}>Secure payment via PhonePe Gateway.</p>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Supports UPI, Credit/Debit Cards, Wallet, NetBanking</p>
                                </div>
                                <button
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                    onClick={handleProceedToPayment}
                                    disabled={processing}
                                >
                                    {processing ? 'Processing...' : 'Pay with PhonePe'}
                                </button>
                            </div>
                        )}

                        {paymentMethod === 'cod' && (
                            <div>
                                <div style={{ marginBottom: '30px', padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>💵</div>
                                    <h3>Cash on Delivery</h3>
                                    <p style={{ color: 'var(--text-muted)' }}>Pay ₹{getCartTotal()} upon delivery.</p>
                                </div>

                                <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                                    <input type="text" name="address" placeholder="Street Address *" value={shippingDetails.address} onChange={handleInputChange} className="form-input" />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <input type="text" name="city" placeholder="City" value={shippingDetails.city} onChange={handleInputChange} className="form-input" />
                                        <input type="text" name="zip" placeholder="ZIP Code" value={shippingDetails.zip} onChange={handleInputChange} className="form-input" />
                                    </div>
                                    <input type="text" name="phone" placeholder="Phone Number *" value={shippingDetails.phone} onChange={handleInputChange} className="form-input" />
                                </div>
                                <button
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                    onClick={handleProceedToPayment}
                                    disabled={processing}
                                >
                                    {processing ? 'Processing...' : 'Place Order via COD'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cart;
