import mongoose, { Document, Schema } from 'mongoose';
import { IOrderItem, IShippingDetails } from './Order';

export type DemoPaymentSessionState =
    | 'CREATED'
    | 'PROCESSING'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'EXPIRED';

export interface IDemoPaymentSession extends Document {
    sessionKeyHash: string;
    user: mongoose.Types.ObjectId;
    orderItems: IOrderItem[];
    shippingAddress: IShippingDetails;
    totalPrice: number;
    state: DemoPaymentSessionState;
    order?: mongoose.Types.ObjectId;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const demoPaymentSessionSchema = new Schema<IDemoPaymentSession>({
    sessionKeyHash: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderItems: [{
        bookId: { type: mongoose.Schema.Types.Mixed, required: true },
        title: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
    }],
    shippingAddress: {
        address: { type: String, required: true },
        city: { type: String },
        zip: { type: String },
        phone: { type: String, required: true },
    },
    totalPrice: { type: Number, required: true },
    state: {
        type: String,
        enum: ['CREATED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'EXPIRED'],
        default: 'CREATED',
        index: true,
    },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    expiresAt: { type: Date, required: true, index: true },
}, { timestamps: true });

demoPaymentSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IDemoPaymentSession>('DemoPaymentSession', demoPaymentSessionSchema);
