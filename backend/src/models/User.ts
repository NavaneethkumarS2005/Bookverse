import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: 'user' | 'admin';
    createdAt: Date;
    resetPasswordTokenHash?: string;
    resetPasswordExpires?: Date;
    refreshTokens: string[];
    cart: {
        bookId: mongoose.Types.ObjectId;
        quantity: number;
    }[];
    wishlist: mongoose.Types.ObjectId[];
}

const userSchema: Schema = new Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: Date, default: Date.now },
    resetPasswordTokenHash: { type: String },
    resetPasswordExpires: { type: Date },
    refreshTokens: [{ type: String }],
    cart: [
        {
            bookId: { type: Schema.Types.ObjectId, ref: 'Book' },
            quantity: { type: Number, default: 1 }
        }
    ],
    wishlist: [{ type: Schema.Types.ObjectId, ref: 'Book' }]
}, {
    toJSON: {
        transform(_document, returnedObject) {
            delete returnedObject.password;
            delete returnedObject.resetPasswordTokenHash;
            delete returnedObject.resetPasswordExpires;
            delete returnedObject.refreshTokens;
            delete returnedObject.__v;
            return returnedObject;
        }
    }
});

userSchema.pre<IUser>('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err: any) {
        next(err);
    }
});

export default mongoose.model<IUser>('User', userSchema);
