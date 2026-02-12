import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { Link, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../components/CheckoutForm';
// @ts-ignore
import { API_URL } from '../config';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_51SuDX02UpQ2jp5vRwVDAnoecRVA8WsNteEtprKOzrkjUjiLHIme2TyErwI4N4icMlwVkwHpsZFqalBIVYzh9YJLD00S6cm8qSM');

interface ShippingDetails {
    address: string;
    city: string;
    zip: string;
    phone: string;
}

const Cart: React.FC = () => {
    const { cart, removeFromCart, getCartTotal, clearCart } = useCart();
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('phonepe'); // 'stripe', 'phonepe', 'cod'
    const [processing, setProcessing] = useState(false);
    const [clientSecret, setClientSecret] = useState('');
    const [loadingSecret, setLoadingSecret] = useState(false);
    const [shippingDetails, setShippingDetails] = useState<ShippingDetails>({
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
    }, [location, clearCart]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                        quantity: (item as any).quantity || 1
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
        } catch (error: any) {
            console.error("Payment Intent Error:", error);
            if (error.message !== "Failed to fetch") {
                // handled?
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

    const handleStripeSuccess = () => {
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
                    items: cart.map(item => ({
                        bookId: item.id,
                        title: item.title,
                        price: item.price,
                        quantity: (item as any).quantity || 1
                    })),
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
                        quantity: (item as any).quantity || 1
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
        } catch (error: any) {
            console.error("Payment Error:", error);
            alert("Payment Initiation Failed: " + error.message);
            setProcessing(false);
        }
    };

    return (
        <div className="min-h-screen pt-28 pb-20 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative">
            <div className="max-w-7xl mx-auto px-5">
                <h1 className="font-outfit text-4xl font-bold bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent mb-10 w-fit">
                    Your Cart
                </h1>

                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="text-8xl mb-6 opacity-20 filter grayscale">🛒</div>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Your cart is empty.</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-8">Looks like you haven't added any books yet.</p>
                        <Link to="/marketplace" className="px-8 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/30 transition-all">
                            Browse Books
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Cart Items */}
                        <div className="flex-1 space-y-6">
                            {cart.map((item) => (
                                <div key={item.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 flex gap-6 shadow-sm border border-slate-200 dark:border-slate-800 items-center">
                                    <img
                                        src={item.image}
                                        alt={item.title}
                                        className="w-20 h-28 object-cover rounded-xl shadow-md"
                                    />
                                    <div className="flex-1">
                                        <h3 className="font-outfit font-bold text-lg text-slate-900 dark:text-white mb-1 line-clamp-1">{item.title}</h3>
                                        <p className="text-slate-500 text-sm mb-2">{item.author}</p>
                                        <div className="font-bold text-indigo-600 dark:text-indigo-400">₹{item.price}</div>
                                    </div>
                                    <button
                                        onClick={() => removeFromCart(item.id ? String(item.id) : item._id)}
                                        className="px-4 py-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-sm font-medium transition-colors"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Summary */}
                        <div className="lg:w-96 bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 h-fit sticky top-28">
                            <h3 className="font-outfit font-bold text-xl text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
                                Order Summary
                            </h3>

                            <div className="flex justify-between mb-3 text-slate-500 dark:text-slate-400">
                                <span>Items ({cart.length})</span>
                                <span>₹{getCartTotal()}</span>
                            </div>
                            <div className="flex justify-between mb-6 text-slate-500 dark:text-slate-400">
                                <span>Shipping</span>
                                <span className="text-green-500 font-medium">Free</span>
                            </div>

                            <div className="flex justify-between mb-8 text-xl font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800 pt-4">
                                <span>Total</span>
                                <span className="text-indigo-600 dark:text-indigo-400">₹{getCartTotal()}</span>
                            </div>

                            <button
                                className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-pink-600 hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-[0.98]"
                                onClick={handleCheckout}
                            >
                                Proceed to Checkout
                            </button>
                        </div>
                    </div>
                )}

                {/* PAYMENT MODAL */}
                {isPaymentOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsPaymentOpen(false)}></div>
                        <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => setIsPaymentOpen(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                &times;
                            </button>

                            <h2 className="font-outfit font-bold text-2xl text-center text-slate-900 dark:text-white mb-8">Checkout</h2>

                            {/* Select Method */}
                            <div className="grid grid-cols-3 gap-3 mb-8">
                                <button
                                    onClick={() => setPaymentMethod('stripe')}
                                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${paymentMethod === 'stripe'
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'
                                        }`}
                                >
                                    <span className="text-2xl">💳</span>
                                    <span className="text-xs font-semibold">Card</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('phonepe')}
                                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${paymentMethod === 'phonepe'
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'
                                        }`}
                                >
                                    <span className="text-2xl">🟣</span>
                                    <span className="text-xs font-semibold">PhonePe</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('cod')}
                                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${paymentMethod === 'cod'
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'
                                        }`}
                                >
                                    <span className="text-2xl">💵</span>
                                    <span className="text-xs font-semibold">COD</span>
                                </button>
                            </div>

                            {paymentMethod === 'stripe' && (
                                <div className="mt-4">
                                    {loadingSecret ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                            Loading Secure Payment...
                                        </div>
                                    ) : (
                                        clientSecret && (
                                            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', labels: 'floating' } }}>
                                                <CheckoutForm
                                                    clientSecret={clientSecret}
                                                    cartItems={cart.map(item => ({
                                                        bookId: item.id,
                                                        title: item.title,
                                                        price: item.price,
                                                        quantity: (item as any).quantity || 1
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
                                <div className="text-center">
                                    <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                                        <p className="text-slate-900 dark:text-white font-medium mb-2">Secure payment via PhonePe</p>
                                        <p className="text-sm text-slate-500">Supports UPI, Credit/Debit Cards, Wallet, NetBanking</p>
                                    </div>
                                    <button
                                        className="w-full py-3 rounded-xl font-bold text-white bg-[#6739b7] hover:bg-[#5a32a3] transition-colors shadow-lg shadow-purple-500/20"
                                        onClick={handleProceedToPayment}
                                        disabled={processing}
                                    >
                                        {processing ? 'Processing...' : 'Pay with PhonePe'}
                                    </button>
                                </div>
                            )}

                            {paymentMethod === 'cod' && (
                                <div>
                                    <div className="mb-8 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-900/50 flex items-center gap-4">
                                        <div className="text-3xl bg-white dark:bg-green-900 rounded-full w-12 h-12 flex items-center justify-center shadow-sm">💵</div>
                                        <div>
                                            <h3 className="font-bold text-green-800 dark:text-green-300">Cash on Delivery</h3>
                                            <p className="text-sm text-green-700 dark:text-green-400">Pay ₹{getCartTotal()} upon delivery.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-6">
                                        <input type="text" name="address" placeholder="Street Address *" value={shippingDetails.address} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="text" name="city" placeholder="City" value={shippingDetails.city} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            <input type="text" name="zip" placeholder="ZIP Code" value={shippingDetails.zip} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        </div>
                                        <input type="text" name="phone" placeholder="Phone Number *" value={shippingDetails.phone} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <button
                                        className="w-full py-3 rounded-xl font-bold text-white bg-slate-900 dark:bg-slate-700 hover:bg-indigo-600 transition-colors shadow-lg"
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
        </div>
    );
};

export default Cart;
