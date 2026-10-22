import express from 'express';
import {
    getAuthors,
    getAuthorById,
    getPublishers,
    getPublisherById,
    getUpcomingBooks,
    getBookFairs,
    getBookFairById,
    getBooths,
    getBoothById,
    searchDiscovery,
    getDiscoveryOverview
} from '../controllers/discoveryController.js';

const router = express.Router();

// Overview aggregator for Discover landing page
router.get('/overview', getDiscoveryOverview);

// Authors
router.get('/authors', getAuthors);
router.get('/authors/:id', getAuthorById);

// Publishers
router.get('/publishers', getPublishers);
router.get('/publishers/:id', getPublisherById);

// Upcoming Books
router.get('/upcoming-books', getUpcomingBooks);

// Book Fairs
router.get('/book-fairs', getBookFairs);
router.get('/book-fairs/:id', getBookFairById);

// Booths
router.get('/booths', getBooths);
router.get('/booths/:id', getBoothById);

// Search
router.get('/search', searchDiscovery);

export default router;
