console.log("\n\n✅ SERVER RESTARTED WITH MODULAR ARCHITECTURE\n\n");
console.log("Starting server.js...");
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Controller Imports (for seeding)
const bookController = require('./controllers/bookController');

// Route Imports
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payment');
const contactRoutes = require('./routes/contact');
const reviewRoutes = require('./routes/reviews');
const uploadRoutes = require('./routes/upload');
const phonePeRoutes = require('./routes/phonepe');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
console.log(`🔌 CORS Configured for: ${CLIENT_URL}`);

app.use(cors({
    origin: CLIENT_URL,
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve images

// --- DATABASE & SEEDING ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bookverse';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ MongoDB Connected');
        await bookController.seedDatabase();
        await bookController.ensureCorrectData();
        await bookController.seedAdmin();
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
    });

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes); // Handles create-payment-intent and save-order
app.use('/api/contact', contactRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload', uploadRoutes); // Replaces inline /api/upload
app.use('/api/phonepe', phonePeRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api/wishlist', wishlistRoutes); // (Already deleted in previous steps, but just ensuring context matches, actually I should place it before app.listen)

// --- TEMPORARY DEBUG ROUTE ---
app.get('/api/test-email', async (req, res) => {
    try {
        console.log("Attempting to send test email...");
        const sendEmail = require('./utils/emailService');
        const info = await sendEmail(
            process.env.EMAIL_USER || "navaneethkumar981@gmail.com",
            "Render Live Test",
            "<h1>It Works!</h1><p>Render is successfully talking to Gmail.</p>"
        );
        if (info) {
            res.json({ message: "Email Sent Successfully!", info });
        } else {
            res.status(500).json({ message: "Email Function returned null (Check logs)", envUser: process.env.EMAIL_USER });
        }
    } catch (err) {
        res.status(500).json({ message: "Email Failed", error: err.toString(), stack: err.stack });
    }
});
// -----------------------------

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
