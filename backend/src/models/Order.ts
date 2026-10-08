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
    orderItems: IOrderItem[];
    items?: IOrderItem[];
    totalPrice: number;
    totalAmount?: number;
    paymentId: string;
    paymentMethod: string;
    status: string;
    shippingAddress?: IShippingDetails;
    shippingDetails?: IShippingDetails;
    createdAt: Date;
}

const orderSchema: Schema = new Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderItems: [{
        bookId: { type: mongoose.Schema.Types.Mixed, required: true },
        title: { type: String, required: true },
        quantity: { type: Number, required: true, default: 1 },
        price: { type: Number, required: true }
    }],
    items: [{
        bookId: { type: mongoose.Schema.Types.Mixed, required: true },
        title: { type: String, required: true },
        quantity: { type: Number, required: true, default: 1 },
        price: { type: Number, required: true }
    }],
    totalPrice: { type: Number, required: true },
    totalAmount: { type: Number },
    paymentId: { type: String, required: true },
    paymentMethod: { type: String, default: 'Razorpay' },
    status: { type: String, default: 'Paid' },
    shippingAddress: {
        address: { type: String },
        city: { type: String },
        zip: { type: String },
        phone: { type: String }
    },
    shippingDetails: {
        address: { type: String },
        city: { type: String },
        zip: { type: String },
        phone: { type: String }
    },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IOrder>('Order', orderSchema);
