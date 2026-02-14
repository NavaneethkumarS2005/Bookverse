import { Response } from 'express';
import User from '../models/User';
import Book from '../models/Book';
import { AuthRequest } from '../types';

// Get Cart
export const getCart = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user.id).populate('cart.bookId');
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Transform to cleaner format
        const cartItems = user.cart.map((item: any) => ({
            _id: item.bookId._id,
            title: item.bookId.title,
            author: item.bookId.author,
            price: item.bookId.price,
            image: item.bookId.image,
            quantity: item.quantity
        }));

        res.json(cartItems);
    } catch (err: any) {
        res.status(500).json({ message: 'Error fetching cart', error: err.message });
    }
};

// Add to Cart
export const addToCart = async (req: AuthRequest, res: Response) => {
    try {
        const { bookId, quantity = 1 } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check if item exists
        // @ts-ignore
        const existingItemIndex = user.cart.findIndex(item => item.bookId.toString() === bookId);

        if (existingItemIndex > -1) {
            // @ts-ignore
            user.cart[existingItemIndex].quantity += quantity;
        } else {
            // @ts-ignore
            user.cart.push({ bookId, quantity });
        }

        await user.save();

        // Return updated cart
        // @ts-ignore
        res.status(200).json({ message: 'Added to cart', cart: user.cart });
    } catch (err: any) {
        res.status(500).json({ message: 'Error adding to cart', error: err.message });
    }
};

// Remove from Cart
export const removeFromCart = async (req: AuthRequest, res: Response) => {
    try {
        const { bookId } = req.params;

        await User.findByIdAndUpdate(req.user.id, {
            $pull: { cart: { bookId: bookId } }
        });

        res.json({ message: 'Item removed from cart' });
    } catch (err: any) {
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
