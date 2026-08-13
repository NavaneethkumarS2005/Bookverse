import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import authorRoutes from './routes/authorRoutes.js';
import publisherRoutes from './routes/publisherRoutes.js';
import upcomingBookRoutes from './routes/upcomingBookRoutes.js';
import bookFairRoutes from './routes/bookFairRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';

 dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://book-vers.netlify.app',
    'https://bookverse-neon.vercel.app',
    process.env.CLIENT_URL
].filter(Boolean).map(url => url?.replace(/\/$/, '')) as string[];

const isVercelOrigin = (origin: string) => origin.endsWith('.vercel.app') && origin.includes('bookverse');

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const cleanedOrigin = origin.replace(/\/$/, '');
        const isAllowed = allowedOrigins.includes(cleanedOrigin) || isVercelOrigin(cleanedOrigin);
        if (isAllowed) return callback(null, true);
        console.error(`❌ CORS BLOCKED: ${origin}`);
        return callback(null, false);
    },
    credentials: true
}));

app.use(express.urlencoded({ extended: true }));
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use('/api/phonepe/callback', express.raw({ type: '*/*', limit: '1mb' }));
app.use((req, res, next) => {
    if (req.originalUrl === '/api/payment/webhook' || req.originalUrl === '/api/phonepe/callback') return next();
    express.json()(req, res, next);
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

import authRoutes from './routes/auth.js';
import bookRoutes from './routes/books.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payment.js';
import contactRoutes from './routes/contact.js';
import reviewRoutes from './routes/reviews.js';
import uploadRoutes from './routes/upload.js';
import phonePeRoutes from './routes/phonepe.js';
import cartRoutes from './routes/cart.js';
import adminRoutes from './routes/admin.js';
import aiRoutes from './routes/ai.js';
import discoveryRoutes from './routes/discoveryRoutes.js';
import adminDiscoveryRoutes from './routes/adminDiscovery.js';
import wishlistRoutes from './routes/wishlist.js';
import { seedDiscovery } from './data/seedDiscovery.js';

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/phonepe', phonePeRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/admin/discovery', adminDiscoveryRoutes);

app.use('/api/authors', authorRoutes);
app.use('/api/publishers', publisherRoutes);
app.use('/api/upcoming-books', upcomingBookRoutes);
app.use('/api/book-fairs', bookFairRoutes);

app.get('/', (_req, res) => res.send('API is running...'));

app.get('/health', (_req, res) => {
    const databaseReady = mongoose.connection.readyState === 1;
    res.status(databaseReady ? 200 : 503).json({
        status: databaseReady ? 'ok' : 'degraded',
        database: databaseReady ? 'connected' : 'unavailable'
    });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

connectDB()
    .then(async () => {
        console.log('✅ Database connected');
        if (process.env.SEED_DISCOVERY_DATA === 'true') {
            await seedDiscovery();
            console.log('🌱 Explicit discovery seed completed.');
        }
    })
    .catch((error) => console.error('❌ Database unavailable:', error.message));

export default app;
