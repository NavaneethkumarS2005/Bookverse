import express from 'express';
import {
    getGeneralRecommendations,
    getPersonalizedRecommendations,
    getBookRecommendations
} from '../controllers/recommendationController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Public, rotating catalog picks. ?refresh=true returns a fresh sample.
router.get('/general', getGeneralRecommendations);
// Personal data is only used for an authenticated request.
router.get('/personalized', auth, getPersonalizedRecommendations);
router.get('/books/:id', getBookRecommendations);

// Backwards-compatible aliases for previously planned route names.
router.get('/trending', getGeneralRecommendations);
router.get('/new-releases', getGeneralRecommendations);
router.get('/similar/:bookId', (req, res) => {
    (req.params as any).id = req.params.bookId as string;
    return getBookRecommendations(req, res);
});

export default router;
