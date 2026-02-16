import { Response } from 'express';
import User from '../models/User';
import Book from '../models/Book';
import { AuthRequest } from '../types';

// Get Cart
export const getCart = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user.id).populate('cart.bookId');
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Transform to cleaner format & Filter out nulls (defensive)
        const cartItems = user.cart
            .filter((item: any) => item.bookId) // Remove stale/deleted books
            .map((item: any) => ({
                _id: item.bookId._id,
                title: item.bookId.title,
                author: item.bookId.author,
                price: item.bookId.price,
                image: item.bookId.image,
                quantity: item.quantity,
                // Add id for frontend logic compatibility
                id: item.bookId.id || item.bookId._id
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

        // 1. Try to find the book first to get its real _id
        let book;

        // Is it a valid ObjectId?
        if (bookId.match(/^[0-9a-fA-F]{24}$/)) {
            book = await Book.findById(bookId);
        }

        // If not found or not ObjectId, try numeric custom ID
        if (!book) {
            book = await Book.findOne({ id: bookId });
        }

        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
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
        // @ts-ignore
        const updatedCart = populatedUser.cart
            .filter((item: any) => item.bookId)
            .map((item: any) => ({
                _id: item.bookId._id,
                title: item.bookId.title,
                price: item.bookId.price,
                image: item.bookId.image,
                quantity: item.quantity
            }));

        res.status(200).json({ message: 'Added to cart', cart: updatedCart });
    } catch (err: any) {
        console.error("Add to cart error:", err);
        res.status(500).json({ message: 'Error adding to cart', error: err.message });
    }
};

export const removeFromCart = async (req: AuthRequest, res: Response) => {
    try {
        const { bookId } = req.params;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Find the book to get its real _id (handles both ObjectId and numeric id)
        let book;
        if (bookId.match(/^[0-9a-fA-F]{24}$/)) {
            book = await Book.findById(bookId);
        }
        if (!book) {
            book = await Book.findOne({ id: bookId });
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
