import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/bookverse';
        await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 10000 });
        console.log('✅ MongoDB Connected');
    } catch (err: any) {
        console.error('❌ MongoDB Connection Error:', err.message);
        // Keep the HTTP server available for health checks and CORS diagnostics.
        // Mongoose will reconnect automatically when MongoDB becomes reachable.
        throw err;
    }
};

export default connectDB;
