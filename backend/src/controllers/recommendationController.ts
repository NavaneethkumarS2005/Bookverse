import { Request, Response } from 'express';
import Book from '../models/Book';
import Order from '../models/Order';
import { AuthRequest } from '../types';

const serialize = (books: any[]) => books.map(book => ({ ...(typeof book.toObject === 'function' ? book.toObject() : book), recommendationActions: ['view', 'add_to_cart', 'add_to_wishlist'] }));

const getEligibleRecommendationFilter = () => ({
    availability: { $ne: 'Out of Stock' },
    stock: { $gt: 0 },
    $or: [
        { fulfillment: { $exists: false } },
        { fulfillment: { $in: [null, 'internal'] } },
    ],
});

export const getGeneralRecommendations = async (req: Request, res: Response) => {
    try {
        const filter = getEligibleRecommendationFilter();
        const books = await Book.aggregate([
            { $match: filter },
            { $sample: { size: 12 } },
        ]);

        res.json({
            basis: 'general',
            label: req.query.refresh === 'true' ? 'Fresh picks from BookVerse' : 'Popular picks for you',
            books: serialize(books),
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPersonalizedRecommendations = async (req: AuthRequest, res: Response) => {
    try {
        const orders = await Order.find({ user: req.user?.id }).sort({ createdAt: -1 }).limit(10);
        const purchasedIds = orders.flatMap(order => (order.orderItems ?? order.items ?? []).map(item => String(item.bookId)));
        if (purchasedIds.length < 2) return getGeneralRecommendations(req, res);

        const validObjectIds = purchasedIds.filter(id => /^[0-9a-fA-F]{24}$/.test(id));
        const history = await Book.find({
            $or: [
                ...(validObjectIds.length ? [{ _id: { $in: validObjectIds } }] : []),
                { id: { $in: purchasedIds } }
            ]
        });

        const genres = [...new Set(history.map(book => book.genre).filter(Boolean))];
        const authors = [...new Set(history.map(book => book.author).filter(Boolean))];
        if (!history.length || (!genres.length && !authors.length)) return getGeneralRecommendations(req, res);

        const excludedIds = history.map(book => book._id);
        const match = {
            _id: { $nin: excludedIds },
            ...getEligibleRecommendationFilter(),
            $or: [{ genre: { $in: genres } }, { author: { $in: authors } }],
        };

        const books = await Book.aggregate([
            { $match: match },
            { $sample: { size: 12 } },
        ]);

        if (!books.length) return getGeneralRecommendations(req, res);
        res.json({
            basis: 'history',
            label: req.query.refresh === 'true' ? 'More picks based on your reading' : 'Because you like…',
            books: serialize(books),
            signals: { genres, authors },
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
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

export const getSimilarBooks = async (req: Request, res: Response) => {
    try {
        const { bookId } = req.params;
        req.params.id = bookId;
        return getBookRecommendations(req, res);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTrendingRecommendations = async (req: Request, res: Response) => {
    try {
        const books = await Book.find(getEligibleRecommendationFilter())
            .sort({ rating: -1, reviews: -1, totalCopiesSold: -1 })
            .limit(12);

        res.json({
            basis: 'trending',
            label: 'Trending now',
            books: serialize(books),
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getNewReleases = async (req: Request, res: Response) => {
    try {
        const books = await Book.find(getEligibleRecommendationFilter())
            .sort({ createdAt: -1, id: -1 })
            .limit(12);

        res.json({
            basis: 'new_releases',
            label: 'New releases',
            books: serialize(books),
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
