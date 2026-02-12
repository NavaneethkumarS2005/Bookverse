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
// --- MIDDLEWARE ---
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.CLIENT_URL
].filter(Boolean);

console.log(`🔌 CORS Configured for: ${allowedOrigins.join(', ')}`);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies (for PhonePe callback)
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



// --- TEMPORARY DEBUG ROUTE ---


// Export app for serverless
module.exports = app;

// Only start server if running directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}
