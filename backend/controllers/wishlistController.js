const User = require('../models/User');
const Book = require('../models/Book');

exports.getWishlist = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Find books whose 'id' (custom numeric ID) is in the user's wishlist
        const books = await Book.find({ id: { $in: user.wishlist } });
        res.json(books);
    } catch (err) {
        console.error("Get Wishlist Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.addToWishlist = async (req, res) => {
    try {
        const bookId = parseInt(req.params.id);
        const user = await User.findById(req.user.id);

        if (!user.wishlist.includes(bookId)) {
            user.wishlist.push(bookId);
            await user.save();
        }

        res.json(user.wishlist);
    } catch (err) {
        console.error("Add Wishlist Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.removeFromWishlist = async (req, res) => {
    try {
        const bookId = parseInt(req.params.id);
        const user = await User.findById(req.user.id);

        user.wishlist = user.wishlist.filter(id => id !== bookId);
        await user.save();

        res.json(user.wishlist);
    } catch (err) {
        console.error("Remove Wishlist Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
