import React, { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../components/CheckoutForm';
import BookCover from '../components/BookCover';
import InlineAlert from '../components/InlineAlert';
import QRCode from 'react-qr-code';
// @ts-ignore
import { API_URL, APP_URL } from '../config';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface ShippingDetails {
    address: string;
    city: string;
    zip: string;
    phone: string;
}

type CheckoutMessageType = 'success' | 'error' | 'info';

interface DemoSession {
    state: 'CREATED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED';
    amount: number;
    expiresAt: string;
    sessionReference: string;
}

const Cart: React.FC = () => {
    const { cart, removeFromCart, getCartTotal, clearCart, updateQuantity } = useCart();
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('demo'); // 'stripe', 'demo', 'cod'
    const [processing, setProcessing] = useState(false);
    const [clientSecret, setClientSecret] = useState('');
    const [orderId, setOrderId] = useState('');
    const [loadingSecret, setLoadingSecret] = useState(false);
    const [checkoutMessage, setCheckoutMessage] = useState<{ type: CheckoutMessageType; text: string } | null>(null);
    const [demoSessionKey, setDemoSessionKey] = useState('');
    const [demoSession, setDemoSession] = useState<DemoSession | null>(null);
    // Persist message even when cart becomes empty
    const [persistedMessage, setPersistedMessage] = useState<{ type: CheckoutMessageType; text: string } | null>(null);
    const [shippingDetails, setShippingDetails] = useState<ShippingDetails>({
        address: '',
        city: '',
        zip: '',
        phone: ''
    });

    const navigate = useNavigate();

    useEffect(() => {
        if (!demoSessionKey) return;
        if (demoSession && ['SUCCEEDED', 'FAILED', 'EXPIRED'].includes(demoSession.state)) return;
        let active = true;
        const poll = async () => {
            try {
                const response = await fetch(`${API_URL}/api/payment/demo-session/${demoSessionKey}`, {
                    credentials: 'include',
                });
                if (!response.ok || !active) return;
                const data = await response.json();
                setDemoSession(data);
                if (data.state === 'SUCCEEDED') {
                    const successMsg = { type: 'success' as CheckoutMessageType, text: 'Demo order completed. No real payment was made.' };
                    setCheckoutMessage(successMsg);
                    setPersistedMessage(successMsg);
                    await clearCart();
                    setIsPaymentOpen(false);
                } else if (data.state === 'FAILED') {
                    setCheckoutMessage({ type: 'error', text: 'Demo payment failed. Your cart was not changed.' });
                } else if (data.state === 'EXPIRED') {
                    setCheckoutMessage({ type: 'error', text: 'Demo payment session expired. Your cart was not changed.' });
                }
            } catch (error) {
                console.error('Demo session status error:', error);
            }
        };
        void poll();
        const timer = window.setInterval(() => void poll(), 2500);
        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, [demoSessionKey, demoSession, clearCart]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setShippingDetails({ ...shippingDetails, [e.target.name]: e.target.value });
    };

    const handleCheckout = () => {
        if (cart.length === 0) return;

        if (!localStorage.getItem('user')) {
            const msg = { type: 'error' as CheckoutMessageType, text: 'You must be logged in to checkout. Redirecting to login...' };
            setCheckoutMessage(msg);
            setPersistedMessage(msg);
            setTimeout(() => {
                navigate('/login');
            }, 800);
            return;
        }

        setIsPaymentOpen(true);
    };

    const fetchPaymentIntent = async () => {
        if (!localStorage.getItem('user')) {
            setCheckoutMessage({ type: 'error', text: 'You must be logged in to checkout. Redirecting to login...' });
            navigate('/login');
            return;
        }

        setLoadingSecret(true);
        try {
            const response = await fetch(`${API_URL}/api/payment/create-payment-intent`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderItems: cart.map(item => ({
                        bookId: item.bookId,
                        quantity: item.quantity
                    })),
                    shippingAddress: shippingDetails
                })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    setCheckoutMessage({ type: 'error', text: 'Session expired. Please log in again.' });
                    navigate('/login');
                    return;
                }
                const err = await response.json();
                throw new Error(err.message || 'Failed to init payment');
            }
            const data = await response.json();
            setClientSecret(data.clientSecret);
            setOrderId(data.orderId);
        } catch (error: any) {
            console.error("Payment Intent Error:", error);
            if (!window.location.href.includes('login')) {
                setCheckoutMessage({ type: 'error', text: "Error initiating checkout: " + error.message });
            }
        } finally {
            setLoadingSecret(false);
        }
    };

    const handleProceedToPayment = () => {
        if (!shippingDetails.address.trim() || !shippingDetails.phone.trim()) {
            console.warn('[Checkout] Validation failed: missing shipping address or phone', shippingDetails);
            setCheckoutMessage({ type: 'error', text: 'Please enter your complete shipping address and phone number.' });
            return;
        }

        console.debug('[Checkout] Proceeding with payment method:', paymentMethod);

        if (paymentMethod === 'stripe') {
            fetchPaymentIntent();
        } else if (paymentMethod === 'demo') {
            handleDemoPayment();
        } else {
            handleCOD();
        }
    };

    const handleStripeSuccess = () => {
        setIsPaymentOpen(false);
        const successMsg = { type: 'success' as CheckoutMessageType, text: 'Payment successful! Your order is placed.' };
        setCheckoutMessage(successMsg);
        setPersistedMessage(successMsg);
        clearCart();
    };

    const handleCOD = async () => {
        if (!localStorage.getItem('user')) {
            const msg = { type: 'error' as CheckoutMessageType, text: 'Your session has expired. Please log in again to place an order.' };
            setCheckoutMessage(msg);
            setPersistedMessage(msg);
            setIsPaymentOpen(false);
            setTimeout(() => {
                navigate('/login');
            }, 800);
            return;
        }

        if (!shippingDetails.address || !shippingDetails.phone) {
            setCheckoutMessage({ type: 'error', text: 'Please enter your address and phone number for delivery.' });
            return;
        }

        setProcessing(true);
        try {
            const res = await fetch(`${API_URL}/api/payment/save-order`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderItems: cart.map(item => ({
                        bookId: item.bookId,
                        quantity: item.quantity
                    })),
                    paymentMethod: 'COD',
                    shippingAddress: shippingDetails
                })
            });

            const data = await res.json();
            if (data.success) {
                const successMsg = { type: 'success' as CheckoutMessageType, text: 'Order placed successfully via Cash on Delivery.' };
                setCheckoutMessage(successMsg);
                setPersistedMessage(successMsg);
                clearCart();
                setIsPaymentOpen(false);
            } else {
                setCheckoutMessage({ type: 'error', text: 'Order failed: ' + data.message });
            }
        } catch (error) {
            console.error("COD Error:", error);
            setCheckoutMessage({ type: 'error', text: 'Order processing failed. Please try again.' });
        } finally {
            setProcessing(false);
        }
    };

    const handleDemoPayment = async () => {
        if (!localStorage.getItem('user')) {
            const msg = { type: 'error' as CheckoutMessageType, text: 'Your session has expired. Please log in again to continue payment.' };
            setCheckoutMessage(msg);
            setPersistedMessage(msg);
            setIsPaymentOpen(false);
            setTimeout(() => {
                navigate('/login');
            }, 800);
            return;
        }

        try {
            setProcessing(true);
            setCheckoutMessage(null);
            const res = await fetch(`${API_URL}/api/payment/demo-session`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderItems: cart.map(item => ({
                        bookId: item.bookId,
                        quantity: item.quantity
                    })),
                    shippingAddress: shippingDetails
                })
            });

            if (!res.ok) {
                if (res.status === 401) {
                    const msg = { type: 'error' as CheckoutMessageType, text: 'Session expired. Please log in again.' };
                    setCheckoutMessage(msg);
                    setPersistedMessage(msg);
                    setIsPaymentOpen(false);
                    setTimeout(() => {
                        navigate('/login');
                    }, 800);
                    return;
                }
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Demo session failed with status ${res.status}`);
            }

            const data = await res.json();
            if (data.success && data.demo === true && data.sessionKey && data.state === 'CREATED') {
                setDemoSessionKey(data.sessionKey);
                setDemoSession(data);
            } else {
                setCheckoutMessage({ type: 'error', text: data.message || 'Demo session was not created.' });
                setProcessing(false);
            }
        } catch (error: any) {
            console.error("Demo Payment Error:", error);
            setCheckoutMessage({ type: 'error', text: 'Demo order failed: ' + error.message });
            setProcessing(false);
        } finally {
            setProcessing(false);
        }
    };

    // Determine which message to show - prefer checkoutMessage, fallback to persistedMessage
    const displayMessage = checkoutMessage || persistedMessage;

    return (
        <div className="min-h-screen pt-28 pb-20 bg-slate-50  transition-colors duration-300 relative">
            <div className="max-w-7xl mx-auto px-5">
                <h1 className="font-outfit text-4xl font-bold bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent mb-10 w-fit">
                    Your Cart
                </h1>

                {displayMessage && (
                    <InlineAlert
                        type={displayMessage.type}
                        message={displayMessage.text}
                        onClose={() => {
                            setCheckoutMessage(null);
                            setPersistedMessage(null);
                        }}
                        className="mb-6"
                    />
                )}

                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="text-8xl mb-6 opacity-20 filter grayscale">🛒</div>
                        <h3 className="text-2xl font-bold text-slate-800  mb-2">Your cart is empty.</h3>
                        <p className="text-slate-500  mb-8">Looks like you haven't added any books yet.</p>
                        <Link to="/marketplace" className="px-8 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/30 transition-all">
                            Browse Books
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Cart Items */}
                        <div className="flex-1 space-y-6">
                            {cart.map((item) => {
                                const quantity = item.quantity;
                                const lineTotal = item.book.price * quantity;
                                const itemId = item.bookId;
                                return (
                                    <div key={item.bookId} className="bg-white  rounded-2xl p-4 flex gap-6 shadow-sm border border-slate-200  items-center">
                                        <BookCover book={item.book} className="h-28 w-20 flex-shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div>
                                                <h3 className="font-outfit font-bold text-lg text-slate-900  mb-1 line-clamp-1">{item.book.title}</h3>
                                                <p className="text-slate-500 text-sm mb-1">{item.book.author}</p>
                                            </div>
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-indigo-600  text-lg">₹{item.book.price}</span>
                                                    <span className="text-xs text-slate-500 ">
                                                        × {quantity} = <span className="font-semibold text-slate-800 ">₹{lineTotal}</span>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="inline-flex items-center rounded-full bg-slate-100  px-2 py-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuantity(item, quantity - 1)}
                                                        className="w-6 h-6 flex items-center justify-center rounded-full text-slate-600  hover:bg-slate-200  text-sm"
                                                        aria-label="Decrease quantity"
                                                    >
                                                        −
                                                    </button>
                                                    <span className="px-3 text-sm font-medium text-slate-800 ">
                                                        {quantity}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuantity(item, quantity + 1)}
                                                        className="w-6 h-6 flex items-center justify-center rounded-full text-slate-600  hover:bg-slate-200  text-sm"
                                                        aria-label="Increase quantity"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(itemId)}
                                                    className="px-4 py-2 rounded-lg text-red-500 hover:bg-red-50  border border-red-200  text-sm font-medium transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Summary */}
                        <div className="lg:w-96 bg-white  rounded-2xl p-8 shadow-lg border border-slate-200  h-fit sticky top-28">
                            <h3 className="font-outfit font-bold text-xl text-slate-900  mb-6 border-b border-slate-200  pb-4">
                                Order Summary
                            </h3>

                            <div className="flex justify-between mb-3 text-slate-500 ">
                                <span>
                                    Items (
                                    {cart.reduce(
                                        (sum, item) => sum + item.quantity,
                                        0
                                    )}
                                    )
                                </span>
                                <span>₹{getCartTotal()}</span>
                            </div>
                            <div className="flex justify-between mb-6 text-slate-500 ">
                                <span>Shipping</span>
                                <span className="text-green-500 font-medium">Free</span>
                            </div>

                            <div className="flex justify-between mb-8 text-xl font-bold text-slate-900  border-t border-slate-200  pt-4">
                                <span>Total</span>
                                <span className="text-indigo-600 ">₹{getCartTotal()}</span>
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
                        <div className="relative bg-white  rounded-3xl p-8 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200 ">
                            <button
                                onClick={() => setIsPaymentOpen(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600  text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100  transition-colors"
                            >
                                &times;
                            </button>

                            <h2 className="font-outfit font-bold text-2xl text-center text-slate-900  mb-8">Checkout</h2>

                            {/* Select Method */}
                            <div className="grid grid-cols-3 gap-3 mb-8">
                                <button
                                    onClick={() => setPaymentMethod('stripe')}
                                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${paymentMethod === 'stripe'
                                        ? 'bg-indigo-50  border-indigo-500 text-indigo-700  ring-1 ring-indigo-500'
                                        : 'bg-white  border-slate-200  text-slate-500 hover:border-indigo-300'
                                        }`}
                                >
                                    <span className="text-2xl">💳</span>
                                    <span className="text-xs font-semibold">Card</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('demo')}
                                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${paymentMethod === 'demo'
                                        ? 'bg-indigo-50  border-indigo-500 text-indigo-700  ring-1 ring-indigo-500'
                                        : 'bg-white  border-slate-200  text-slate-500 hover:border-indigo-300'
                                        }`}
                                >
                                    <span className="text-2xl">▦</span>
                                    <span className="text-xs font-semibold">Demo UPI QR</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('cod')}
                                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${paymentMethod === 'cod'
                                        ? 'bg-indigo-50  border-indigo-500 text-indigo-700  ring-1 ring-indigo-500'
                                        : 'bg-white  border-slate-200  text-slate-500 hover:border-indigo-300'
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
                                    ) : clientSecret ? (
                                            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', labels: 'floating' } }}>
                                                <CheckoutForm
                                                    clientSecret={clientSecret}
                                                    cartItems={cart}
                                                    shippingAddress={shippingDetails}
                                                    orderId={orderId}
                                                    onSuccess={handleStripeSuccess}
                                                    onCancel={() => setClientSecret('')}
                                                />
                                            </Elements>
                                    ) : (
                                        <div>
                                            <p className="mb-4 text-sm text-slate-500 ">
                                                Enter your delivery details before continuing to secure card payment.
                                            </p>
                                            <div className="space-y-4 mb-6">
                                                <input type="text" name="address" placeholder="Street Address *" value={shippingDetails.address} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300  bg-slate-50  focus:ring-2 focus:ring-indigo-500 outline-none" />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <input type="text" name="city" placeholder="City" value={shippingDetails.city} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300  bg-slate-50  focus:ring-2 focus:ring-indigo-500 outline-none" />
                                                    <input type="text" name="zip" placeholder="ZIP Code" value={shippingDetails.zip} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300  bg-slate-50  focus:ring-2 focus:ring-indigo-500 outline-none" />
                                                </div>
                                                <input type="text" name="phone" placeholder="Phone Number *" value={shippingDetails.phone} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300  bg-slate-50  focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <button
                                                type="button"
                                                className="w-full py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                                                onClick={handleProceedToPayment}
                                            >
                                                Continue to Secure Card Payment
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {paymentMethod === 'demo' && (
                                <div>
                                    <div className="mb-6 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-4 text-center  ">
                                        <p className="font-black tracking-widest text-amber-800 ">DEMO MODE</p>
                                        <p className="text-sm font-bold text-amber-700 ">NO REAL PAYMENT</p>
                                    </div>
                                    {demoSession ? (
                                        <>
                                            <div className="mx-auto mb-6 w-56 rounded-xl bg-white p-4">
                                                <QRCode value={`${APP_URL}/demo-payment/${demoSessionKey}`} size={192} />
                                            </div>
                                            <p className="mb-2 text-center text-lg font-bold text-slate-900 ">Demo amount: ₹{demoSession.amount}</p>
                                            <p className="mb-2 text-center text-xs text-slate-500 ">Reference: {demoSession.sessionReference}</p>
                                            <p className="mb-6 text-center text-sm text-slate-500 ">Scan this demo QR with your phone, then choose a simulated result.</p>
                                        </>
                                    ) : (
                                        <p className="mb-6 text-center text-lg font-bold text-slate-900 ">Demo amount: ₹{getCartTotal()}</p>
                                    )}

                                    <div className="space-y-4 mb-6">
                                        <input type="text" name="address" placeholder="Street Address *" value={shippingDetails.address} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300  bg-slate-50  focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="text" name="city" placeholder="City" value={shippingDetails.city} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300  bg-slate-50  focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            <input type="text" name="zip" placeholder="ZIP Code" value={shippingDetails.zip} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300  bg-slate-50  focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        </div>
                                        <input type="text" name="phone" placeholder="Phone Number *" value={shippingDetails.phone} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300  bg-slate-50  focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>

                                    {!demoSession && (
                                        <button
                                            className="w-full py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg"
                                            onClick={handleProceedToPayment}
                                            disabled={processing}
                                        >
                                            {processing ? 'Creating demo session...' : 'Create demo QR session'}
                                        </button>
                                    )}
                                </div>
                            )}

                            {paymentMethod === 'cod' && (
                                <div>
                                    <div className="mb-8 p-4 bg-green-50  rounded-xl border border-green-200  flex items-center gap-4">
                                        <div className="text-3xl bg-white  rounded-full w-12 h-12 flex items-center justify-center shadow-sm">💵</div>
                                        <div>
                                            <h3 className="font-bold text-green-800 ">Cash on Delivery</h3>
                                            <p className="text-sm text-green-700 ">Pay ₹{getCartTotal()} upon delivery.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-6">
                                        <input type="text" name="address" placeholder="Street Address *" value={shippingDetails.address} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300  bg-slate-50  focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="text" name="city" placeholder="City" value={shippingDetails.city} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300  bg-slate-50  focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            <input type="text" name="zip" placeholder="ZIP Code" value={shippingDetails.zip} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300  bg-slate-50  focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        </div>
                                        <input type="text" name="phone" placeholder="Phone Number *" value={shippingDetails.phone} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300  bg-slate-50  focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <button
                                        className="w-full py-3 rounded-xl font-bold text-white bg-slate-900  hover:bg-indigo-600 transition-colors shadow-lg"
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
