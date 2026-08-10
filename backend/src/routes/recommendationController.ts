import { Request, Response } from 'express';
import Book from '../models/Book.js';
import UserInteraction from '../models/UserInteraction.js';

export const getPersonalizedRecommendations = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        
        if (!userId) {
            const generalBooks = await Book.find({ isFeatured: true }).limit(6).lean();
            return res.status(200).json({
                success: true,
                message: 'General recommendations',
                data: generalBooks,
                isPersonalized: false
            });
        }

        const interactions = await UserInteraction.find({ userId })
            .sort({ timestamp: -1 })
            .limit(50)
            .lean();

        if (interactions.length < 5) {
            const generalBooks = await Book.find({ isFeatured: true }).limit(6).lean();
            return res.status(200).json({
                success: true,
                message: 'General recommendations',
                data: generalBooks,
                isPersonalized: false
            });
        }

        const bookIds = interactions
            .filter((i: any) => i.targetType === 'BOOK')
            .map((i: any) => i.targetId);

        const interactedBooks = await Book.find({ _id: { $in: bookIds } }).lean();
        
        const preferredGenres = interactedBooks
            .flatMap((b: any) => b.genres || [])
            .filter(Boolean);

        const recommendations = await Book.find({
            _id: { $nin: bookIds },
            genres: { $in: preferredGenres }
        })
        .limit(10)
        .lean();

        res.status(200).json({
            success: true,
            message: 'Personalized recommendations',
            data: recommendations,
            isPersonalized: true
        });
    } catch (error) {
        console.error('Error in personalized recommendations:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating recommendations'
        });
    }
};

export const getSimilarBooks = async (req: Request, res: Response) => {
    try {
        const { bookId } = req.params;
        
        const book = await Book.findById(bookId).lean();
        
        if (!book) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }

        const similarBooks = await Book.find({
            _id: { $ne: bookId },
            genres: { $in: book.genres || [] }
        })
        .limit(6)
        .lean();

        res.status(200).json({
            success: true,
            data: similarBooks
        });
    } catch (error) {
        console.error('Error in similar books:', error);
        res.status(500).json({
            success: false,
            message: 'Error finding similar books'
        });
    }
};

export const getTrendingRecommendations = async (req: Request, res: Response) => {
    try {
        const trending = await Book.find({})
            .sort({ totalCopiesSold: -1, averageRating: -1 })
            .limit(10)
            .lean();

        res.status(200).json({
            success: true,
            data: trending
        });
    } catch (error) {
        console.error('Error fetching trending books:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching trending books'
        });
    }
};

export const getNewReleases = async (req: Request, res: Response) => {
    try {
        const newReleases = await Book.find({})
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        res.status(200).json({
            success: true,
            data: newReleases
        });
    } catch (error) {
        console.error('Error fetching new releases:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching new releases'
        });
    }
};