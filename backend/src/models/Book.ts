import mongoose, { Document, Schema } from 'mongoose';

export interface IBook extends Document {
    id: number; // Legacy numerical ID
    title: string;
    author: string;
    price: number;
    genre: string;
    image?: string;
    buyLink?: string;
    rating: number;
    reviews: number;
    createdAt: Date;
}

const bookSchema: Schema = new Schema({
    id: { type: Number, required: true }, // Keeping numerical ID for compatibility with frontend logic
    title: { type: String, required: true },
    author: { type: String, required: true },
    price: { type: Number, required: true },
    genre: { type: String, required: true },
    image: { type: String },
    buyLink: { type: String }, // External URL for purchasing
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IBook>('Book', bookSchema);
