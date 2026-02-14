import { Response, NextFunction } from 'express';
import User from '../models/User';
import { AuthRequest } from '../types';

const admin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // req.user is already populated by auth middleware
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Handle case where req.user might be an object with an ID or just the ID depending on how JWT was signed
        // Assuming req.user has an 'id' property from JWT payload
        const userId = (req.user as any).id || (req.user as any)._id;

        const user = await User.findById(userId);

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }

        next();
    } catch (err) {
        res.status(500).json({ message: 'Server error checking admin status' });
    }
};

export default admin;
