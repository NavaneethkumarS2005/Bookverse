import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';

// Avoid Mongoose buffering queries while the connection is unavailable.
// Health and unmatched routes are intentionally handled outside this middleware.
export const requireDatabase = (_req: Request, res: Response, next: NextFunction): void => {
    if (mongoose.connection.readyState === 1) {
        next();
        return;
    }

    res.status(503).json({
        success: false,
        message: 'Database is temporarily unavailable. Please try again shortly.',
        code: 'DATABASE_UNAVAILABLE'
    });
};
