import { Response } from 'express';
import User from '../models/User';
import Book from '../models/Book';
import { AuthRequest } from '../types';
import { normalizeCartItem } from '../utils/contracts';
import { isCheckoutEligibleBook } from '../utils/catalogFulfillment';

// Get Cart
export const getCart = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user.id).populate('cart.bookId');
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Normalize the database-backed cart at the API boundary so the
        // frontend receives one stable shape regardless of legacy book fields.
        const cartItems = user.cart
            .filter((item: any) => item.bookId)
            .map((item: any) => normalizeCartItem({
                bookId: item.bookId._id,
                quantity: item.quantity,
                book: item.bookId,
            }));

        res.json(cartItems);
    } catch (err: any) {
        console.error("Get Cart Error:", err);
        res.status(500).json({ message: 'Error fetching cart', error: err.message });
    }
};

// Add to Cart
export const addToCart = async (req: AuthRequest, res: Response) => {
    try {
        let { bookId, quantity = 1 } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const normalizedBookId = typeof bookId === 'string' ? bookId.trim() : String(bookId ?? '').trim();
        if (!normalizedBookId) {
            return res.status(400).json({ message: 'bookId is required' });
        }

        // 1. Try to find the book first to get its real _id
        let book;

        // Is it a valid ObjectId?
        if (/^[0-9a-fA-F]{24}$/.test(normalizedBookId)) {
            book = await Book.findById(normalizedBookId);
        }

        // If not found or not ObjectId, try numeric custom ID
        if (!book) {
            const numericId = Number(normalizedBookId);
            if (!Number.isNaN(numericId)) {
                book = await Book.findOne({ id: numericId });
            }
        }

        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        if (!isCheckoutEligibleBook(book)) {
            return res.status(400).json({ message: 'This book is available through an external seller and cannot be added to the BookVerse checkout cart.' });
        }

        // Use the MongoDB _id for consistency in the cart array
        const realBookId = book._id;

        // Check if item exists using the REAL _id
        // @ts-ignore
        const existingItemIndex = user.cart.findIndex(item => item.bookId.toString() === realBookId.toString());

        if (existingItemIndex > -1) {
            // @ts-ignore
            user.cart[existingItemIndex].quantity += quantity;
        } else {
            // @ts-ignore
            user.cart.push({ bookId: realBookId, quantity });
        }

        await user.save();

        // Return updated cart (populate for immediate UI update)
        const populatedUser = await user.populate('cart.bookId');
        const updatedCart = populatedUser.cart
            .filter((item: any) => item.bookId)
            .map((item: any) => normalizeCartItem({
                bookId: item.bookId._id,
                quantity: item.quantity,
                book: item.bookId,
            }));

        res.status(200).json({ message: 'Added to cart', cart: updatedCart });
    } catch (err: any) {
        console.error("Add to cart error:", err);
        res.status(500).json({ message: 'Error adding to cart', error: err.message });
    }
};

export const removeFromCart = async (req: AuthRequest, res: Response) => {
    try {
        const bookId = req.params.bookId as string;
        const normalizedBookId = typeof bookId === 'string' ? bookId.trim() : String(bookId ?? '').trim();
        if (!normalizedBookId) {
            return res.status(400).json({ message: 'bookId is required' });
        }
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Find the book to get its real _id (handles both ObjectId and numeric id)
        let book;
        if (/^[0-9a-fA-F]{24}$/.test(normalizedBookId)) {
            book = await Book.findById(normalizedBookId);
        }
        if (!book) {
            const numericId = Number(normalizedBookId);
            if (!Number.isNaN(numericId)) {
                book = await Book.findOne({ id: numericId });
            }
        }

        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        // Remove using the real MongoDB _id
        await User.findByIdAndUpdate(req.user.id, {
            $pull: { cart: { bookId: book._id } }
        });

        res.json({ message: 'Item removed from cart' });
    } catch (err: any) {
        console.error("Remove from cart error:", err);
        res.status(500).json({ message: 'Error removing item', error: err.message });
    }
};

// Clear Cart
export const clearCart = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user.id);
        if (user) {
            // @ts-ignore
            user.cart = [];
            await user.save();
        }
        res.json({ message: 'Cart cleared' });
    } catch (err: any) {
        res.status(500).json({ message: 'Error clearing cart' });
    }
};
