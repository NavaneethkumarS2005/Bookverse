import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState(() => {
        const savedCart = localStorage.getItem('bookVerse_cart');
        return savedCart ? JSON.parse(savedCart) : [];
    });

    useEffect(() => {
        localStorage.setItem('bookVerse_cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (book) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === book.id);
            if (existingItem) {
                return prevCart.map(item =>
                    item.id === book.id ? { ...item, quantity: (item.quantity || 1) + 1 } : item
                );
            }
            return [...prevCart, { ...book, quantity: 1 }];
        });
    };

    const removeFromCart = (bookId) => {
        setCart(prevCart => prevCart.filter(item => item.id !== bookId));
    };

    const clearCart = () => {
        setCart([]);
    };

    const getCartTotal = () => {
        return cart.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0);
    };

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, getCartTotal }}>
            {children}
        </CartContext.Provider>
    );
};
