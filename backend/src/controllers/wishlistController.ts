import { Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Book from '../models/Book';
import { AuthRequest } from '../types';

const getUserId = (req: AuthRequest): string | null => {
    const id = req.user?.id;
    return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
};

export const getWishlist = async (req: AuthRequest, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId || !mongoose.isValidObjectId(userId)) {
            return res.status(401).json({ message: 'Invalid authentication session' });
        }

        const user = await User.findById(userId).populate('wishlist');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const books = (user.wishlist || []).filter(Boolean);
        res.json({ books });
    } catch (error: any) {
        console.error('Get wishlist error:', error);
        res.status(500).json({ message: 'Unable to load wishlist' });
    }
};

export const addToWishlist = async (req: AuthRequest, res: Response) => {
    try {
        const userId = getUserId(req);
        const { bookId } = req.body;
        if (!userId || !mongoose.isValidObjectId(userId)) {
            return res.status(401).json({ message: 'Invalid authentication session' });
        }
        if (!bookId || !mongoose.isValidObjectId(String(bookId))) {
            return res.status(400).json({ message: 'A valid bookId is required' });
        }

        const book = await Book.findById(bookId).select('_id');
        if (!book) return res.status(404).json({ message: 'Book not found' });

        const user = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { wishlist: book._id } },
            { new: true }
        );
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ message: 'Book added to wishlist', bookId: String(book._id), count: user.wishlist.length });
    } catch (error: any) {
        console.error('Add wishlist error:', error);
        res.status(500).json({ message: 'Unable to add book to wishlist' });
    }
};

export const removeFromWishlist = async (req: AuthRequest, res: Response) => {
    try {
        const userId = getUserId(req);
        const { bookId } = req.params;
        if (!userId || !mongoose.isValidObjectId(userId)) {
            return res.status(401).json({ message: 'Invalid authentication session' });
        }
        if (!mongoose.isValidObjectId(String(bookId))) {
            return res.status(400).json({ message: 'Invalid bookId' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $pull: { wishlist: new mongoose.Types.ObjectId(String(bookId)) } },
            { new: true }
        );
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ message: 'Book removed from wishlist', bookId: String(bookId), count: user.wishlist.length });
    } catch (error: any) {
        console.error('Remove wishlist error:', error);
        res.status(500).json({ message: 'Unable to remove book from wishlist' });
    }
};
