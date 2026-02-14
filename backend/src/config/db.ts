import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/bookverse';
        await mongoose.connect(mongoURI);
        console.log('✅ MongoDB Connected');
    } catch (err: any) {
        console.error('❌ MongoDB Connection Error:', err.message);
        process.exit(1);
    }
};

export default connectDB;
