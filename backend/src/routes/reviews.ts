import express, { Request, Response } from 'express';
import Review from '../models/Review';
import Book from '../models/Book';
import Order from '../models/Order';
// @ts-ignore
// @ts-ignore
import { auth } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = express.Router();

// GET reviews for a book
router.get('/:bookId', async (req: Request, res: Response) => {
    try {
        const reviews = await Review.find({ bookId: parseInt(req.params.bookId as string) }).sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: "Error fetching reviews" });
    }
});

// POST a review
// POST a review
router.post('/:bookId', auth, async (req: AuthRequest, res: Response) => {
    try {
        const { rating, comment } = req.body;
        const bookId = parseInt(req.params.bookId as string);

        // Input validation: rating must be an integer 1-5, comment bounded text.
        const ratingValue = Number(rating);
        if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
            return res.status(400).json({ message: 'Rating must be an integer between 1 and 5.' });
        }
        const commentValue = typeof comment === 'string' ? comment.trim() : '';
        if (!commentValue || commentValue.length > 2000) {
            return res.status(400).json({ message: 'Review text is required and must be 2000 characters or fewer.' });
        }

        // Review spam prevention: one review per user per book.
        const existingReview = await Review.findOne({ user: req.user.id, bookId });
        if (existingReview) {
            return res.status(409).json({ message: 'You have already reviewed this book.' });
        }

        // Check if user has bought this book (Paid order)
        const hasPurchased = await Order.findOne({
            user: req.user.id,
            status: 'Paid',
            'items.bookId': bookId
        });

        // 1. Create Review
        const newReview = new Review({
            user: req.user.id,
            userName: req.user.name || "Anonymous", // Ideally fetch user name or store it in token
            bookId: bookId,
            rating: ratingValue,
            comment: commentValue,
            isVerified: !!hasPurchased
        });
        await newReview.save();

        // 2. Recalculate Book Stats
        const reviews = await Review.find({ bookId: bookId });
        const totalRating = reviews.reduce((acc, curr) => acc + curr.rating, 0);
        const avgRating = totalRating / reviews.length;

        // 3. Update Book
        // Assuming Book model uses 'id' (number) for identification in this context
        await Book.updateOne(
            { id: bookId },
            {
                rating: avgRating, // Mongoose handles rounding/casting usually, but fix in frontend if needed
                reviews: reviews.length
            }
        );

        res.status(201).json(newReview);
    } catch (err) {
        console.error("Review Error:", err);
        res.status(500).json({ message: "Error saving review" });
    }
});

export default router;
