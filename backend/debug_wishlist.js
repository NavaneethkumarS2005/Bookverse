const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bookverse';
const TEST_EMAIL = "navaneethkumar981@gmail.com";

async function debugWishlist() {
    try {
        console.log("1. Connecting to DB...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected.");

        console.log(`2. Finding user: ${TEST_EMAIL}`);
        const user = await User.findOne({ email: TEST_EMAIL });

        if (!user) {
            console.error("❌ User not found!");
            process.exit(1);
        }
        console.log("✅ User found:", user._id);
        console.log("Current Wishlist:", user.wishlist);

        console.log("3. Attempting to Add ID 1 to wishlist...");
        if (!user.wishlist) user.wishlist = [];

        // Simulate the logic
        const bookId = 1;
        const index = user.wishlist.indexOf(bookId);
        if (index === -1) {
            user.wishlist.push(bookId);
            console.log("   -> Pushed ID 1");
        } else {
            console.log("   -> ID 1 already exists");
        }

        console.log("4. Saving user...");
        await user.save();
        console.log("✅ User saved successfully!");
        console.log("New Wishlist:", user.wishlist);

    } catch (err) {
        console.error("❌ ERROR FAILED:", err);
    } finally {
        await mongoose.disconnect();
    }
}

debugWishlist();
