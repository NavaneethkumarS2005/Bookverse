import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { Book } from '../types';
import { normalizeBook } from '../utils/bookCompatibility';

interface WishlistContextValue {
    wishlist: Book[];
    loading: boolean;
    isWishlisted: (bookId: string | number) => boolean;
    toggleWishlist: (book: Book) => Promise<void>;
    refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);
const getToken = () => localStorage.getItem('token');
const idOf = (book: Book) => String(book._id || book.id);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [wishlist, setWishlist] = useState<Book[]>([]);
    const [loading, setLoading] = useState(false);

    const refreshWishlist = useCallback(async () => {
        const token = getToken();
        if (!token) {
            setWishlist([]);
            return;
        }

        setLoading(true);
        try {
            const { data } = await axios.get(`${API_URL}/api/wishlist`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const books = Array.isArray(data?.books) ? data.books : [];
            setWishlist(books.map((book: unknown, index: number) => normalizeBook(book, index)));
        } catch (error) {
            console.error('Failed to load wishlist', error);
            setWishlist([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refreshWishlist();
        window.addEventListener('storage', refreshWishlist);
        window.addEventListener('bookverse-auth-changed', refreshWishlist);
        return () => {
            window.removeEventListener('storage', refreshWishlist);
            window.removeEventListener('bookverse-auth-changed', refreshWishlist);
        };
    }, [refreshWishlist]);

    const isWishlisted = useCallback((bookId: string | number) => {
        const target = String(bookId);
        return wishlist.some(book => idOf(book) === target);
    }, [wishlist]);

    const toggleWishlist = useCallback(async (book: Book) => {
        const token = getToken();
        if (!token) throw new Error('Please log in to use your wishlist.');

        const bookId = idOf(book);
        const currentlyWishlisted = wishlist.some(item => idOf(item) === bookId);
        const previous = wishlist;
        setWishlist(currentlyWishlisted ? wishlist.filter(item => idOf(item) !== bookId) : [book, ...wishlist]);

        try {
            if (currentlyWishlisted) {
                await axios.delete(`${API_URL}/api/wishlist/${encodeURIComponent(bookId)}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_URL}/api/wishlist`, { bookId }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
        } catch (error) {
            setWishlist(previous);
            throw error;
        }
    }, [wishlist]);

    const value = useMemo(() => ({ wishlist, loading, isWishlisted, toggleWishlist, refreshWishlist }), [wishlist, loading, isWishlisted, toggleWishlist, refreshWishlist]);
    return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = () => {
    const context = useContext(WishlistContext);
    if (!context) throw new Error('useWishlist must be used inside WishlistProvider');
    return context;
};
