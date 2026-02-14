import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: 'user' | 'admin';
    createdAt: Date;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
    refreshTokens: string[];
    cart: {
        bookId: mongoose.Types.ObjectId;
        quantity: number;
    }[];
}

const userSchema: Schema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: Date, default: Date.now },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    refreshTokens: [{ type: String }],
    cart: [
        {
            bookId: { type: Schema.Types.ObjectId, ref: 'Book' },
            quantity: { type: Number, default: 1 }
        }
    ]
});

// Pre-save hook to hash password
userSchema.pre<IUser>('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err: any) {
        next(err);
    }
});

export default mongoose.model<IUser>('User', userSchema);
