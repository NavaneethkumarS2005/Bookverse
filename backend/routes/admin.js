const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Order = require('../models/Order');
const User = require('../models/User');
const Book = require('../models/Book');

// GET /api/admin/stats
router.get('/stats', auth, admin, async (req, res) => {
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

module.exports = router;
