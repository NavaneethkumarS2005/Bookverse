require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const fixAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("🔌 Connected to Database...");

        const admin = await User.findOne({ email: 'admin@bookverse.com' });
        if (admin) {
            console.log("👤 Found Admin User.");
            console.log("❌ Old (Bad) Hash:", admin.password);

            // Set to plain text, save() will trigger the hashing hook
            admin.password = "admin123";
            await admin.save();

            console.log("✅ Admin password successfully reset to: admin123");
            console.log("ℹ️ (It is now securely hashed in the database)");
        } else {
            console.log("❌ Admin user not found! Please check the email.");
        }
    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        mongoose.disconnect();
    }
};

fixAdmin();
