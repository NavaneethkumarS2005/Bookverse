import express, { Request, Response } from 'express';
import Book from '../models/Book.js';
import { getPersonalizedRecommendations, getSimilarBooks, getTrendingRecommendations, getNewReleases } from './recommendationController.js';

const router = express.Router();

router.get('/personalized', getPersonalizedRecommendations);
router.get('/similar/:bookId', getSimilarBooks);
router.get('/trending', getTrendingRecommendations);
router.get('/new-releases', getNewReleases);

// ─── SSE LIVE STREAM ENDPOINT ──────────────────────────────────────────────
// Streams trending + featured book recommendations to connected clients in real-time.
router.get('/live-stream', async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering if behind proxy
    res.flushHeaders();

    const sendUpdate = async () => {
        try {
            // Fetch a mix of trending and new books for the live feed
            const [trending, newReleases] = await Promise.all([
                Book.find({}).sort({ totalCopiesSold: -1, averageRating: -1 }).limit(4).lean(),
                Book.find({}).sort({ createdAt: -1 }).limit(2).lean()
            ]);

            // Merge, deduplicate, and shuffle for variety
            const seen = new Set<string>();
            const combined = [...trending, ...newReleases].filter(book => {
                const id = String(book._id);
                if (seen.has(id)) return false;
                seen.add(id);
                return true;
            });

            // Send event to the client
            res.write(`data: ${JSON.stringify(combined)}\n\n`);
        } catch (err) {
            console.error('SSE live-stream error:', err);
        }
    };

    // Send initial payload immediately
    await sendUpdate();

    // Send refreshed data every 30 seconds
    const interval = setInterval(sendUpdate, 30000);

    // Cleanup when client disconnects
    req.on('close', () => {
        clearInterval(interval);
        res.end();
    });
});

export default router;
