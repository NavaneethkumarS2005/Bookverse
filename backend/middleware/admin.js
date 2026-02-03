const User = require('../models/User');

const admin = async (req, res, next) => {
    try {
        // req.user is already populated by auth middleware
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const user = await User.findById(req.user.id);

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }

        next();
    } catch (err) {
        res.status(500).json({ message: 'Server error checking admin status' });
    }
};

module.exports = admin;
