import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_URL } from '../config';
import { Book, CartItem } from '../types';

interface CartContextType {
    cart: CartItem[];
    addToCart: (book: Book) => void;
    removeFromCart: (bookId: string | number) => void;
    clearCart: () => void;
    getCartTotal: () => number;
    isCartOpen: boolean;
    toggleCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};

interface CartProviderProps {
    children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const token = localStorage.getItem('token');

    // Fetch Cart from Backend
    const fetchCart = async () => {
        if (!token) return;
        try {
            // @ts-ignore
            const res = await fetch(`${API_URL}/api/cart`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCart(data);
            }
        } catch (err) {
            console.error("Failed to fetch cart", err);
        }
    };

    useEffect(() => {
        fetchCart();
    }, [token]);

    const addToCart = async (book: Book) => {
        // Optimistic Update
        setCart(prev => [...prev, { ...book, quantity: 1 }]);
        setIsCartOpen(true);

        if (token) {
            try {
                // @ts-ignore
                await fetch(`${import.meta.env.VITE_API_URL}/api/cart/add`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ bookId: book._id || book.id, quantity: 1 })
                });
                await fetchCart(); // Sync with backend
            } catch (err) {
                console.error("Add to cart failed", err);
            }
        }
    };

    const removeFromCart = async (bookId: string | number) => {
        // Optimistic Update
        setCart(prev => prev.filter(item => (item._id !== bookId && item.id !== bookId)));

        if (token) {
            try {
                // @ts-ignore
                await fetch(`${import.meta.env.VITE_API_URL}/api/cart/remove/${bookId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });
                await fetchCart(); // Sync
            } catch (err) {
                console.error("Remove from cart failed", err);
            }
        }
    };

    const clearCart = async () => {
        setCart([]);
        if (token) {
            try {
                // @ts-ignore
                await fetch(`${import.meta.env.VITE_API_URL}/api/cart/clear`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (err) {
                console.error("Clear cart failed", err);
            }
        }
    };

    const getCartTotal = () => {
        return cart.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0);
    };

    const toggleCart = () => setIsCartOpen(!isCartOpen);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, getCartTotal, isCartOpen, toggleCart }}>
            {children}
        </CartContext.Provider>
    );
};
