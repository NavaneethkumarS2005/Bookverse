import { Request, Response } from 'express';
import Book from '../models/Book';
import Order from '../models/Order';
import { AuthRequest } from '../types';

const serialize = (books: any[]) => books.map(book => ({ ...(typeof book.toObject === 'function' ? book.toObject() : book), recommendationActions: ['view', 'add_to_cart', 'add_to_wishlist'] }));

export const getGeneralRecommendations = async (req: Request, res: Response) => {
    try {
        const filter = { availability: { $ne: 'Out of Stock' } };
        const refresh = req.query.refresh === 'true';
        const books = refresh
            ? await Book.aggregate([{ $match: filter }, { $sample: { size: 12 } }])
            : await Book.find(filter).sort({ 'featuredMetadata.featured': -1, rating: -1, reviews: -1, createdAt: -1 }).limit(12);
        res.json({ basis: 'general', label: refresh ? 'Fresh picks from BookVerse' : 'Popular picks for you', books: serialize(books) });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const getPersonalizedRecommendations = async (req: AuthRequest, res: Response) => {
    try {
        const orders = await Order.find({ user: req.user?.id }).sort({ createdAt: -1 }).limit(10);
        const purchasedIds = orders.flatMap(order => order.items.map(item => String(item.bookId)));
        // Do not imply personalization unless at least two prior purchases exist.
        if (purchasedIds.length < 2) return getGeneralRecommendations(req, res);

        const history = await Book.find({ $or: [{ _id: { $in: purchasedIds.filter(id => /^[0-9a-fA-F]{24}$/.test(id)) } }, { id: { $in: purchasedIds } }] });
        const genres = [...new Set(history.map(book => book.genre).filter(Boolean))];
        const authors = [...new Set(history.map(book => book.author).filter(Boolean))];
        const books = await Book.find({
            _id: { $nin: history.map(book => book._id) },
            $or: [{ genre: { $in: genres } }, { author: { $in: authors } }]
        }).sort({ rating: -1, reviews: -1 }).limit(12);
        res.json({ basis: 'history', label: 'Because you like…', books: serialize(books), signals: { genres, authors } });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const getBookRecommendations = async (req: Request, res: Response) => {
    try {
        const source = await Book.findById(req.params.id).catch(() => null) || await Book.findOne({ id: req.params.id });
        if (!source) return res.status(404).json({ message: 'Book not found' });
        const books = await Book.find({ _id: { $ne: source._id }, $or: [{ genre: source.genre }, { author: source.author }, { publisher: source.publisher }] })
            .sort({ rating: -1, reviews: -1 }).limit(8);
        res.json({ basis: 'similar_book', label: `Because you like ${source.title}`, sourceBook: source._id, books: serialize(books) });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
};
