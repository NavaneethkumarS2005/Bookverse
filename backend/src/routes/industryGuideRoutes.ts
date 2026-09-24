import express from 'express';
import { query } from 'express-validator';
import { getIndustryGuide } from '../controllers/industryGuideController.js';

const router = express.Router();
router.get('/', [
  query('focus').optional().isString().trim().isLength({ max: 160 }),
  query('language').optional().isString().trim().isLength({ max: 60 }),
  query('genre').optional().isString().trim().isLength({ max: 60 }),
  query('region').optional().isString().trim().isLength({ max: 80 }),
  query('year').optional().isInt({ min: 2000, max: 2100 })
], getIndustryGuide);
export default router;
