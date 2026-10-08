import { Response } from 'express';
import Stripe from 'stripe';
import Book from '../models/Book';
import Order from '../models/Order';
import { AuthRequest } from '../types';
import { normalizeOrderInput, normalizeOrderItems, serializeOrder } from '../utils/contracts';
// @ts-ignore
import sendEmail from '../utils/emailService';
// @ts-ignore
import { orderTemplate } from '../utils/emailTemplates';

const getStripe = () => {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("Stripe Secret Key is missing in environment variables");
    }
    return new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-12-18.acacia',
    } as any);
};

export const createPaymentIntent = async (req: AuthRequest, res: Response) => {
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ message: 'Stripe Config Missing' });
        }
        const orderItems = Array.isArray(req.body.orderItems ?? req.body.items) ? req.body.orderItems ?? req.body.items : [];
        const catalogBooks = await Promise.all(orderItems.map(async (item: any) => {
            const id = item.bookId ?? item.id;
            if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) return Book.findById(id);
            if (typeof id === 'string' && !Number.isNaN(Number(id))) return Book.findOne({ id: Number(id) });
            if (typeof id === 'number') return Book.findOne({ id: id });
            return null;
        }));
        const { totalPrice } = normalizeOrderItems(orderItems, catalogBooks);

        if (totalPrice < 1) return res.status(400).json({ message: "Invalid amount" });

        const paymentIntent = await getStripe().paymentIntents.create({
            amount: Math.round(totalPrice * 100),
            currency: "inr",
            automatic_payment_methods: { enabled: true },
            metadata: { userId: req.user.id, totalPrice: String(totalPrice) }
        });

        res.send({ clientSecret: paymentIntent.client_secret });
    } catch (err: any) {
        console.error("Stripe Error:", err);
        res.status(400).json({ message: err.message || 'Payment init failed' });
    }
};

export const saveOrder = async (req: AuthRequest, res: Response) => {
    try {
        const paymentMethod = String(req.body.paymentMethod ?? 'Stripe');
        const paymentIntentId = req.body.paymentIntentId;
        let status = 'Paid';
        let paymentId = paymentIntentId;

        if (paymentMethod !== 'COD') {
            if (!process.env.STRIPE_SECRET_KEY) {
                return res.status(500).json({ message: 'Stripe Config Missing' });
            }
            const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
            if (paymentIntent.status !== 'succeeded') return res.status(400).json({ message: "Payment failed" });
            paymentId = paymentIntent.id;
        } else {
            status = 'Placed';
            paymentId = 'COD_' + Date.now();
        }

        const orderItems = Array.isArray(req.body.orderItems ?? req.body.items) ? req.body.orderItems ?? req.body.items : [];
        const catalogBooks = await Promise.all(orderItems.map(async (item: any) => {
            const id = item.bookId ?? item.id;
            if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) return Book.findById(id);
            if (typeof id === 'string' && !Number.isNaN(Number(id))) return Book.findOne({ id: Number(id) });
            if (typeof id === 'number') return Book.findOne({ id: id });
            return null;
        }));
        const normalized = normalizeOrderInput({
            orderItems,
            shippingAddress: req.body.shippingAddress ?? req.body.shippingDetails,
            paymentMethod,
            paymentResult: paymentIntentId ? { id: paymentIntentId, status } : undefined,
        }, catalogBooks);

        const newOrder = new Order({
            user: req.user.id,
            orderItems: normalized.orderItems,
            totalPrice: normalized.totalPrice,
            paymentId,
            status,
            paymentMethod,
            shippingAddress: normalized.shippingAddress,
        });

        await newOrder.save();
        sendEmail(
            req.user.email,
            "Order Confirmation - BookVerse",
            orderTemplate(newOrder._id.toString(), normalized.orderItems, normalized.totalPrice)
        ).catch(emailErr => console.error("Email sending failed (background):", emailErr));

        res.json({ success: true, message: 'Order Saved', orderId: newOrder._id, order: serializeOrder(newOrder) });
    } catch (err: any) {
        console.error("Save Order Error:", err);
        res.status(400).json({ message: err.message || 'Error saving order' });
    }
};

import mongoose from 'mongoose';

export const getOrders = async (req: AuthRequest, res: Response) => {
    try {
        const orders = await Order.find({ user: new mongoose.Types.ObjectId(req.user.id) }).sort({ createdAt: -1 });
        res.json(orders.map(serializeOrder));
    } catch (err) {
        res.status(500).json({ message: 'Error fetching orders' });
    }
};

export const stripeWebhook = async (req: any, res: Response) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
        console.error('⚠️ Stripe Webhook Secret missing');
        return res.status(400).send('Webhook Error: Secret missing');
    }

    let event;

    try {
        event = getStripe().webhooks.constructEvent(req.body, sig as string, endpointSecret);
    } catch (err: any) {
        console.error(`⚠️ Webhook Signature Verification Failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log(`💰 PaymentIntent was successful! ID: ${paymentIntent.id}`);
            // Logic to update order status could go here if we were creating orders BEFORE payment
            // Currently saveOrder handles it from frontend, but this is good for redundancy or async flows.
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.send();
};
