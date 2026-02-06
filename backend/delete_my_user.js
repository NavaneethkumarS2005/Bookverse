const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const User = require('./models/User');

const emailToDelete = "navaneethkumar981@gmail.com";

const deleteUser = async () => {
    try {
        console.log("⏳ Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected.");

        console.log(`🔍 Searching for user: ${emailToDelete}`);
        const user = await User.findOne({ email: emailToDelete });

        if (!user) {
            console.log("⚠️ User not found! (Maybe it was already deleted?)");
        } else {
            await User.deleteOne({ email: emailToDelete });
            console.log("🗑️  User DELETED successfully!");
            console.log("✨ You can now Sign Up again freshly on the website.");
        }

        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
};

deleteUser();
