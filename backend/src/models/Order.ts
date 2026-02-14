import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface IOrderItem {
    bookId: string | number; // Adaptable to both ObjectId string or numeric ID
    title: string;
    quantity: number;
    price: number;
}

export interface IShippingDetails {
    address: string;
    city: string;
    zip: string;
    phone: string;
}

export interface IOrder extends Document {
    user: IUser['_id'];
    items: IOrderItem[];
    totalAmount: number;
    paymentId: string;
    paymentMethod: string;
    status: string;
    shippingDetails?: IShippingDetails;
    createdAt: Date;
}

const orderSchema: Schema = new Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        bookId: { type: mongoose.Schema.Types.Mixed, required: true }, // Store original book ID (could be number or string depending on Book model)
        title: { type: String, required: true },
        quantity: { type: Number, required: true, default: 1 },
        price: { type: Number, required: true }
    }],
    totalAmount: { type: Number, required: true },
    paymentId: { type: String, required: true }, // Razorpay Payment ID or 'COD'
    paymentMethod: { type: String, default: 'Razorpay' },
    status: { type: String, default: 'Paid' },
    shippingDetails: {
        address: { type: String },
        city: { type: String },
        zip: { type: String },
        phone: { type: String }
    },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IOrder>('Order', orderSchema);
