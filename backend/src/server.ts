import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
// @ts-ignore
import helmet from 'helmet';
// @ts-ignore
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import authorRoutes from './routes/authorRoutes.js';
import publisherRoutes from './routes/publisherRoutes.js';
import upcomingBookRoutes from './routes/upcomingBookRoutes.js';
import bookFairRoutes from './routes/bookFairRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
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
import industryGuideRoutes from './routes/industryGuideRoutes.js';
import { seedDiscovery } from './data/seedDiscovery.js';
import { enrichBookCovers } from './utils/enrichBookCovers.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);

const startServer = (port: number) => {
    const server = app.listen(port, () => console.log(`🚀 Server running on port ${port}`));

    server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
            const fallbackPort = port + 1;
            console.warn(`⚠️ Port ${port} is already in use. Retrying on port ${fallbackPort}...`);
            startServer(fallbackPort);
            return;
        }

        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    });
};

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://book-vers.netlify.app',
    'https://bookverse-neon.vercel.app',
    process.env.CLIENT_URL
].filter(Boolean).map(url => url?.replace(/\/$/, '')) as string[];

const isVercelOrigin = (origin: string) => origin.endsWith('.vercel.app') && origin.includes('bookverse');

// ─── SECURITY MIDDLEWARE ────────────────────────────────────────────────────
// Helmet: Sets security-related HTTP headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow images from CDN
    contentSecurityPolicy: false // managed by the frontend
}));

// NoSQL Injection Sanitizer
app.use(mongoSanitize({
    replaceWith: '_', // Replace prohibited chars instead of stripping
    onSanitize: ({ req, key }) => {
        console.warn(`⚠️ NoSQL injection attempt sanitized. Key: ${key}, IP: ${req.ip}`);
    }
}));

// ─── RATE LIMITERS ──────────────────────────────────────────────────────────
// General API rate limiter (wide)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' }
});

// Strict AI chatbot limiter to prevent API cost abuse
const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 15,             // max 15 AI messages per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'You are sending messages too quickly. Please wait a moment.' }
});

// Auth limiter to prevent brute-force attacks
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,                   // 20 login/register attempts
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many authentication attempts, please try again in 15 minutes.' }
});

app.use('/api', generalLimiter);

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

// Apply specific rate limiters BEFORE route mounting
app.use('/api/ai', aiLimiter);
app.use('/api/auth', authLimiter);

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
app.use('/api/industry-guide', industryGuideRoutes);
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

// Manual cover refresh for the local demo catalogue. This does not create books;
// it only replaces placeholder images on existing Book documents.
app.post('/api/books/enrich-covers', async (_req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ message: 'Cover enrichment is disabled in production.' });
    }

    try {
        await enrichBookCovers();
        return res.json({ message: 'Book cover enrichment completed.' });
    } catch (error) {
        console.error('❌ Cover enrichment failed:', error);
        return res.status(500).json({ message: 'Cover enrichment failed.' });
    }
});

startServer(PORT);

connectDB()
    .then(async () => {
        console.log('✅ Database connected');
        if (process.env.SEED_DISCOVERY_DATA === 'true') {
            await seedDiscovery();
            console.log('🌱 Explicit discovery seed completed.');
        }

        console.log('🖼️ Starting existing-book cover enrichment...');
        try {
            await enrichBookCovers();
        } catch (error) {
            console.error('❌ Cover enrichment failed during startup:', error);
        }
    })
    .catch((error) => console.error('❌ Database unavailable:', error.message));

export default app;
