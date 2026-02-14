import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface IReview extends Document {
    user: IUser['_id'];
    userName: string;
    bookId: number;
    rating: number;
    comment: string;
    isVerified: boolean;
    createdAt: Date;
}

const reviewSchema: Schema = new Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true }, // Cache name to avoid massive lookups
    bookId: { type: Number, required: true }, // Linking to Book.id (custom ID)
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IReview>('Review', reviewSchema);
