import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ------------------- CORS -------------------
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://book-vers.netlify.app',
    'https://bookverse-neon.vercel.app',
    process.env.CLIENT_URL
].filter(Boolean).map(url => url?.replace(/\/$/, '')) as string[];

// Dynamic check for Vercel preview/branch URLs
const isVercelOrigin = (origin: string) => {
    return origin.endsWith('.vercel.app') && origin.includes('bookverse');
};

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            console.log('✅ CORS: No origin (Allowed)');
            return callback(null, true);
        }

        const cleanedOrigin = origin.replace(/\/$/, '');
        const isAllowed = allowedOrigins.includes(cleanedOrigin) || isVercelOrigin(cleanedOrigin);

        if (isAllowed) {
            console.log(`✅ CORS: Allowed origin: ${origin}`);
            return callback(null, true);
        }

        console.error(`❌ CORS BLOCKED: ${origin}`);
        console.log(`Debug - Allowed Origins: ${JSON.stringify(allowedOrigins)}`);
        return callback(null, false);
    },
    credentials: true
}));

// ------------------- BODY PARSING -------------------
app.use(express.urlencoded({ extended: true }));

// Stripe webhook (raw body)
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

// PhonePe callback: capture raw body so we can inspect incoming payloads (QR flow may POST different content-types)
app.use('/api/phonepe/callback', express.raw({ type: '*/*', limit: '1mb' }));

// JSON parser for everything else (skip webhook and phonepe raw endpoints)
app.use((req, res, next) => {
    if (req.originalUrl === '/api/payment/webhook' || req.originalUrl === '/api/phonepe/callback') {
        return next();
    }
    express.json()(req, res, next);
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ------------------- ROUTES -------------------
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
import aiRoutes from './routes/ai';

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
app.use('/api/ai', aiRoutes);

app.get('/', (_req, res) => {
    res.send('API is running...');
});

app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});

// ------------------- START SERVER AFTER DB CONNECT -------------------
connectDB()
    .then(() => {
        console.log('✅ Database connected');

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    });

export default app;
