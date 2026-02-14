import { Response } from 'express';
import Stripe from 'stripe';
import Book from '../models/Book';
import Order from '../models/Order';
import { AuthRequest } from '../types';
// @ts-ignore
import sendEmail from '../utils/emailService';
// @ts-ignore
import { orderTemplate } from '../utils/emailTemplates';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-12-18.acacia',
} as any);

export const createPaymentIntent = async (req: AuthRequest, res: Response) => {
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ message: 'Stripe Config Missing' });
        }
        const { items } = req.body;
        if (!items || !items.length) return res.status(400).json({ message: 'No items provided' });

        let totalAmount = 0;
        for (const item of items) {
            const id = item.bookId || item.id;
            let book;

            // 1. Try finding by custom numeric 'id'
            if (!isNaN(Number(id))) {
                book = await Book.findOne({ id: Number(id) });
            }

            // 2. If not found, try finding by MongoDB '_id'
            if (!book && typeof id === 'string' && id.length === 24) {
                book = await Book.findById(id);
            }

            if (!book) {
                console.error(`Error: Book not found for ID: ${id}`);
                return res.status(404).json({ message: `Book with ID ${id} not found` });
            }

            totalAmount += book.price * (item.quantity || 1);
        }

        if (totalAmount < 1) return res.status(400).json({ message: "Invalid amount" });

        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmount * 100,
            currency: "inr",
            automatic_payment_methods: { enabled: true },
            metadata: { userId: req.user.id }
        });

        res.send({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
        console.error("Stripe Error:", err);
        res.status(500).json({ message: 'Payment init failed' });
    }
};

export const saveOrder = async (req: AuthRequest, res: Response) => {
    try {
        const { paymentIntentId, items, paymentMethod, shippingDetails } = req.body;
        let status = 'Paid';
        let paymentId = paymentIntentId;

        if (paymentMethod !== 'COD') {
            if (!process.env.STRIPE_SECRET_KEY) {
                return res.status(500).json({ message: 'Stripe Config Missing' });
            }
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            if (paymentIntent.status !== 'succeeded') return res.status(400).json({ message: "Payment failed" });
            paymentId = paymentIntent.id;
        } else {
            status = 'Placed';
            paymentId = 'COD_' + Date.now();
        }

        let totalAmount = 0;
        const orderItems = [];
        for (const item of items) {
            const id = item.bookId || item.id;
            let book;

            // 1. Try finding by custom numeric 'id'
            if (!isNaN(Number(id))) {
                book = await Book.findOne({ id: Number(id) });
            }

            // 2. If not found, try finding by MongoDB '_id'
            if (!book && typeof id === 'string' && id.length === 24) {
                book = await Book.findById(id);
            }

            if (book) {
                totalAmount += book.price * (item.quantity || 1);
                orderItems.push({
                    bookId: book.id, // Save the numeric ID for consistency
                    title: book.title,
                    quantity: item.quantity || 1,
                    price: book.price
                });
            } else {
                console.error(`Skipping item, book not found for ID: ${id}`);
            }
        }

        const newOrder = new Order({
            user: req.user.id,
            items: orderItems,
            totalAmount,
            paymentId,
            status,
            paymentMethod: paymentMethod || 'Stripe',
            shippingDetails
        });

        await newOrder.save();

        // Send Order Confirmation Email (Non-blocking)
        // Send Order Confirmation Email (Non-blocking - Fire & Forget)
        sendEmail(
            req.user.email,
            "Order Confirmation - BookVerse",
            orderTemplate(newOrder._id.toString(), orderItems, totalAmount)
        ).catch(emailErr => console.error("Email sending failed (background):", emailErr));

        res.json({ success: true, message: 'Order Saved', orderId: newOrder._id });
    } catch (err: any) {
        console.error("Save Order Error:", err);
        res.status(500).json({ message: err.message || 'Error saving order' });
    }
};

import mongoose from 'mongoose';

export const getOrders = async (req: AuthRequest, res: Response) => {
    try {
        const orders = await Order.find({ user: new mongoose.Types.ObjectId(req.user.id) }).sort({ createdAt: -1 });
        res.json(orders);
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
        event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
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
