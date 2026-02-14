import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
// Load env vars immediately
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import cors from 'cors';
import connectDB from './config/db';

// Controller Imports (for seeding)
import * as bookController from './controllers/bookController';

// Route Imports
import authRoutes from './routes/auth';
import bookRoutes from './routes/books';
import orderRoutes from './routes/orders';
import paymentRoutes from './routes/payment';
import contactRoutes from './routes/contact';
import reviewRoutes from './routes/reviews';
import uploadRoutes from './routes/upload';
import phonePeRoutes from './routes/phonepe';
import cartRoutes from './routes/cart';
import adminRoutes from './routes/admin';

const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://book-vers.netlify.app', // Production Frontend
    'https://book-vers.netlify.app',
    process.env.CLIENT_URL
].filter(Boolean) as string[];

console.log(`🔌 CORS allowed origins: ${allowedOrigins.join(', ')}`);
console.log(`🌐 CLIENT_URL env: ${process.env.CLIENT_URL || '(not set)'}`);
console.log(`🌐 NODE_ENV: ${process.env.NODE_ENV || '(not set)'}`);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        console.warn(`⚠️ CORS blocked request from: ${origin}`);
        return callback(new Error(`CORS: origin ${origin} not allowed`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.urlencoded({ extended: true }));

// Stripe Webhook needs raw body
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

// Global JSON parser for other routes
app.use((req, res, next) => {
    if (req.originalUrl === '/api/payment/webhook') {
        next();
    } else {
        express.json()(req, res, next);
    }
});
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- DATABASE & SEEDING ---
connectDB().then(async () => {
    await bookController.seedDatabase();
    await bookController.ensureCorrectData();
    await bookController.seedAdmin();
});

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/phonepe', phonePeRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

// Only start server if running directly (not imported)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

export default app;
// Restart trigger: 1
