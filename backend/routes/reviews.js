const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Book = require('../models/Book');
const authMiddleware = require('../middleware/auth');

// GET reviews for a book
router.get('/:bookId', async (req, res) => {
    try {
        const reviews = await Review.find({ bookId: req.params.bookId }).sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: "Error fetching reviews" });
    }
});

// POST a review
router.post('/:bookId', authMiddleware, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const bookId = req.params.bookId;

        // 1. Create Review
        const newReview = new Review({
            user: req.user.id,
            userName: req.user.name || "Anonymous", // Ideally fetch user name or store it in token
            bookId: bookId,
            rating,
            comment
        });
        await newReview.save();

        // 2. Recalculate Book Stats
        const reviews = await Review.find({ bookId: bookId });
        const totalRating = reviews.reduce((acc, curr) => acc + curr.rating, 0);
        const avgRating = totalRating / reviews.length;

        // 3. Update Book
        await Book.updateOne(
            { id: bookId },
            {
                rating: avgRating.toFixed(1),
                reviews: reviews.length
            }
        );

        res.status(201).json(newReview);
    } catch (err) {
        console.error("Review Error:", err);
        res.status(500).json({ message: "Error saving review" });
    }
});

module.exports = router;
