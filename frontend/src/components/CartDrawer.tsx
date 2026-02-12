import React, { useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';

const CartDrawer: React.FC = () => {
    const { isCartOpen, toggleCart, cart, removeFromCart, getCartTotal } = useCart();
    const drawerRef = useRef<HTMLDivElement>(null);

    // Close on Escape key for accessibility
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (isCartOpen && e.key === 'Escape') {
                toggleCart();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isCartOpen, toggleCart]);

    // Trap focus helper (simplified) or manage focus return could be added here

    if (!isCartOpen) {
        // We keep it in DOM but hidden/translated for animation availability, 
        // OR conditionally render. For slide-in, conditional + CSS animation or 
        // keeping it in DOM with translate is better. 
        // Let's use the "translate" approach for smooth CSS transitions.
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[1003] transition-opacity duration-300 ${isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={toggleCart}
                aria-hidden="true"
            />

            {/* Drawer Panel */}
            <div
                ref={drawerRef}
                className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-[1004] transform transition-transform duration-300 ease-in-out flex flex-col ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}
                role="dialog"
                aria-modal="true"
                aria-label="Shopping Cart"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-xl font-bold font-outfit text-slate-900 dark:text-white flex items-center gap-2">
                        <span>🛒</span> Your Cart ({cart.length})
                    </h2>
                    <button
                        onClick={toggleCart}
                        className="p-2 text-slate-500 hover:text-red-500 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label="Close cart"
                    >
                        ✕
                    </button>
                </div>

                {/* Body - Scrollable Items */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-70">
                            <span className="text-6xl">🛍️</span>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Your cart is empty</h3>
                            <p className="text-sm text-slate-500">Looks like you haven't added any books yet.</p>
                            <button onClick={toggleCart} className="text-indigo-600 font-medium hover:underline">
                                Continue Browsing
                            </button>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.id} className="flex gap-4 animate-fadeIn">
                                <div className="w-20 h-28 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">{item.title}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{item.author}</p>
                                        <div className="text-indigo-600 dark:text-indigo-400 font-bold">₹{item.price}</div>
                                    </div>

                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1">
                                            <span className="text-xs font-medium px-2">Qty: {item.quantity}</span>
                                            {/* In a real app, adding +/- buttons would go here. 
                                                For now we rely on 'addToCart' logic which increments. 
                                                Ideally we'd expose a specific updateQuantity method. */
                                            }
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.id ? String(item.id) : item._id)}
                                            className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer - Subtotal & Checkout */}
                {cart.length > 0 && (
                    <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                            <span className="text-2xl font-bold text-slate-900 dark:text-white font-outfit">₹{getCartTotal().toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-4 text-center">Shipping and taxes calculated at checkout.</p>
                        <Link
                            to="/cart" // Or /checkout directly
                            onClick={toggleCart} // Close drawer on navigation
                            className="block w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-lg hover:-translate-y-1 transition-all text-center shadow-indigo-500/25"
                        >
                            Proceed to Checkout
                        </Link>
                    </div>
                )}
            </div>
        </>
    );
};

export default CartDrawer;
