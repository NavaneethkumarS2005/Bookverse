import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env';
import { AuthRequest } from '../types';

export const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.token;

        if (!token || typeof token !== 'string') {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, getJwtSecret()) as { id: string; email: string; name: string; role?: string };
        if (!decoded.id || !decoded.email || !decoded.name) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        req.user = decoded;
        next();
    } catch (_err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};
