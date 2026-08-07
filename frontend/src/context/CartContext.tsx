import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_URL } from '../config';
import { Book, CartItem } from '../types';

interface CartContextType {
    cart: CartItem[];
    addToCart: (book: Book) => Promise<void>;
    removeFromCart: (bookId: string | number) => void;
    clearCart: () => void;
    getCartTotal: () => number;
    isCartOpen: boolean;
    toggleCart: () => void;
    updateQuantity: (item: CartItem, quantity: number) => void;
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
    const getToken = () => localStorage.getItem('token');

    // Fetch Cart from Backend
    const fetchCart = async () => {
        const token = getToken();
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
    }, []);

    const addToCart = async (book: Book) => {
        const token = getToken();
        // Optimistic Update: increment quantity if item already exists
        setCart(prev => {
            const targetId = String(book._id || (book as any).id);
            const existingIndex = prev.findIndex(item =>
                String(item._id || (item as any).id) === targetId
            );

            if (existingIndex > -1) {
                const updated = [...prev];
                const current = updated[existingIndex];
                updated[existingIndex] = {
                    ...current,
                    quantity: (current.quantity || 1) + 1,
                };
                return updated;
            }

            return [...prev, { ...(book as any), quantity: 1 }];
        });
        setIsCartOpen(true);

        if (token) {
            try {
                // @ts-ignore
                const response = await fetch(`${API_URL}/api/cart/add`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ bookId: (book as any)._id || (book as any).id, quantity: 1 })
                });
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.message || 'Unable to add this book to your cart.');
                }
                await fetchCart(); // Sync with backend
            } catch (err) {
                console.error("Add to cart failed", err);
                throw err;
            }
        }
    };

    const removeFromCart = async (bookId: string | number) => {
        const token = getToken();
        const targetId = String(bookId);
        // Optimistic Update
        setCart(prev => prev.filter(item => {
            const itemMongoId = item._id ? String(item._id) : '';
            const itemCustomId = item.id !== undefined && item.id !== null ? String(item.id) : '';
            return itemMongoId !== targetId && itemCustomId !== targetId;
        }));

        if (token) {
            try {
                // @ts-ignore
                await fetch(`${API_URL}/api/cart/remove/${bookId}`, {
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
        const token = getToken();
        setCart([]);
        if (token) {
            try {
                // @ts-ignore
                await fetch(`${API_URL}/api/cart/clear`, {
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

    const updateQuantity = async (item: CartItem, quantity: number) => {
        const token = getToken();
        const targetId = String(item._id || (item as any).id);

        // Optimistic local update
        setCart(prev =>
            prev
                .map(ci => {
                    const ciId = String(ci._id || (ci as any).id);
                    if (ciId !== targetId) return ci;
                    if (quantity <= 0) return null;
                    return { ...ci, quantity };
                })
                .filter(Boolean) as CartItem[]
        );

        if (!token) return;

        try {
            // Simplest robust approach: remove existing item, then add with new quantity
            // @ts-ignore
            await fetch(`${API_URL}/api/cart/remove/${targetId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (quantity > 0) {
                // @ts-ignore
                await fetch(`${API_URL}/api/cart/add`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        bookId: targetId,
                        quantity
                    })
                });
            }

            await fetchCart(); // Final sync
        } catch (err) {
            console.error("Update quantity failed", err);
        }
    };

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, getCartTotal, isCartOpen, toggleCart, updateQuantity }}>
            {children}
        </CartContext.Provider>
    );
};
