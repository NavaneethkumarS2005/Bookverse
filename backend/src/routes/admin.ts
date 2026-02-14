import express, { Response } from 'express';
// @ts-ignore
import { auth } from '../middleware/auth';
// @ts-ignore
import { admin } from '../middleware/admin';
import Order from '../models/Order';
import User from '../models/User';
import Book from '../models/Book';
import { AuthRequest } from '../types';

const router = express.Router();

// GET /api/admin/stats
router.get('/stats', auth, admin, async (req: AuthRequest, res: Response) => {
    try {
        const totalOrders = await Order.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalBooks = await Book.countDocuments();

        // Calculate Total Revenue
        const orders = await Order.find({ status: { $ne: 'Cancelled' } });
        const totalRevenue = orders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);

        // Recent Orders
        const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name email');

        res.json({
            success: true,
            stats: {
                revenue: totalRevenue,
                orders: totalOrders,
                users: totalUsers,
                books: totalBooks
            },
            recentOrders
        });
    } catch (err) {
        console.error("Admin Stats Error:", err);
        res.status(500).json({ message: "Error fetching admin stats" });
    }
});

export default router;
