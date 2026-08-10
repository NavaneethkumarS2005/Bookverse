import express from 'express';
import { auth } from '../middleware/auth';
import { getBookRecommendations, getGeneralRecommendations, getPersonalizedRecommendations } from '../controllers/recommendationController';

const router = express.Router();
router.get('/general', getGeneralRecommendations);
router.get('/personalized', auth, getPersonalizedRecommendations);
router.get('/books/:id', getBookRecommendations);
export default router;
