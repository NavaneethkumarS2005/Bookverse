import crypto from 'crypto';
import { Response } from 'express';
import mongoose from 'mongoose';
import Stripe from 'stripe';
import Book from '../models/Book';
import Order from '../models/Order';
import { AuthRequest } from '../types';
import { normalizeOrderInput, serializeOrder } from '../utils/contracts';
import { decrementOrderStock } from '../utils/inventory';
import { publicBookFilter } from '../utils/catalogVisibility';
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

const getCatalogBooks = async (orderItems: any[]) => {
    const visibleFilter = await publicBookFilter();
    return Promise.all(orderItems.map(async (item: any) => {
        const id = item.bookId ?? item.id;
        if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) return Book.findOne({ $and: [{ _id: id }, visibleFilter] });
        if (typeof id === 'string' && !Number.isNaN(Number(id))) return Book.findOne({ $and: [{ id: Number(id) }, visibleFilter] });
        if (typeof id === 'number') return Book.findOne({ $and: [{ id }, visibleFilter] });
        return null;
    }));
};

const loadNormalizedOrder = async (req: AuthRequest, orderItems: any[]) => {
    const catalogBooks = await getCatalogBooks(orderItems);
    return normalizeOrderInput({
        orderItems,
        shippingAddress: req.body.shippingAddress ?? req.body.shippingDetails,
        paymentMethod: req.body.paymentMethod ?? 'Stripe',
    }, catalogBooks);
};

export const createPaymentIntent = async (req: AuthRequest, res: Response) => {
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ message: 'Stripe Config Missing' });
        }
        const orderItems = Array.isArray(req.body.orderItems ?? req.body.items) ? req.body.orderItems ?? req.body.items : [];
        const normalized = await loadNormalizedOrder(req, orderItems);
        const paymentId = `pi_${crypto.randomUUID().replace(/-/g, '')}`;
        const order = await Order.create({
            user: req.user.id,
            orderItems: normalized.orderItems,
            totalPrice: normalized.totalPrice,
            paymentId,
            paymentMethod: 'Stripe',
            status: 'Pending',
            shippingAddress: normalized.shippingAddress,
        });

        const paymentIntent = await getStripe().paymentIntents.create({
            amount: Math.round(normalized.totalPrice * 100),
            currency: 'inr',
            automatic_payment_methods: { enabled: true },
            metadata: {
                userId: req.user.id,
                orderId: order._id.toString(),
                paymentId,
                totalPrice: String(normalized.totalPrice),
            },
        });
        order.paymentId = paymentIntent.id;
        await order.save();

        res.send({ clientSecret: paymentIntent.client_secret, orderId: order._id.toString(), paymentId: paymentIntent.id });
    } catch (err: any) {
        console.error("Stripe Error:", err);
        res.status(400).json({ message: err.message || 'Payment init failed' });
    }
};

export const saveOrder = async (req: AuthRequest, res: Response) => {
    try {
        const paymentMethod = String(req.body.paymentMethod ?? 'Stripe');
        const orderItems = Array.isArray(req.body.orderItems ?? req.body.items) ? req.body.orderItems ?? req.body.items : [];
        const normalized = await loadNormalizedOrder(req, orderItems);

        if (paymentMethod === 'COD') {
            const paymentId = `COD_${crypto.randomUUID().replace(/-/g, '')}`;
            await decrementOrderStock(normalized.orderItems);
            const newOrder = await Order.create({
                user: req.user.id,
                orderItems: normalized.orderItems,
                totalPrice: normalized.totalPrice,
                paymentId,
                paymentMethod,
                status: 'Placed',
                stockConsumed: true,
                shippingAddress: normalized.shippingAddress,
            });
            await sendOrderConfirmation(req, newOrder, normalized);
            return res.json({ success: true, message: 'Order Saved', orderId: newOrder._id, order: serializeOrder(newOrder) });
        }

        if (paymentMethod !== 'Stripe') {
            return res.status(400).json({ message: 'Unsupported payment method' });
        }

        const paymentIntentId = req.body.paymentIntentId;
        if (!paymentIntentId) return res.status(400).json({ message: 'Payment intent is required' });
        const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== 'succeeded') return res.status(400).json({ message: 'Payment failed' });
        if (paymentIntent.metadata?.userId !== req.user.id) return res.status(403).json({ message: 'Payment does not belong to this user' });

        const expectedAmount = Math.round(normalized.totalPrice * 100);
        if (paymentIntent.amount !== expectedAmount) return res.status(400).json({ message: 'Payment amount does not match the order' });
        const orderId = paymentIntent.metadata?.orderId;
        if (!orderId || !mongoose.isValidObjectId(orderId)) return res.status(400).json({ message: 'Invalid order reference' });

        const existingOrder = await Order.findOne({ _id: orderId, user: req.user.id });
        if (!existingOrder) return res.status(404).json({ message: 'Order not found' });
        if (existingOrder.status === 'Paid') {
            return res.json({ success: true, message: 'Order already saved', orderId: existingOrder._id, order: serializeOrder(existingOrder) });
        }

        if (existingOrder.stockConsumed) {
            return res.json({ success: true, message: 'Order already saved', orderId: existingOrder._id, order: serializeOrder(existingOrder) });
        }

        existingOrder.orderItems = normalized.orderItems;
        existingOrder.totalPrice = normalized.totalPrice;
        existingOrder.paymentId = paymentIntent.id;
        existingOrder.paymentMethod = 'Stripe';
        existingOrder.status = 'Paid';
        existingOrder.shippingAddress = normalized.shippingAddress;
        await consumeStockOnce(existingOrder);
        await sendOrderConfirmation(req, existingOrder, normalized);

        res.json({ success: true, message: 'Order Saved', orderId: existingOrder._id, order: serializeOrder(existingOrder) });
    } catch (err: any) {
        console.error("Save Order Error:", err);
        res.status(400).json({ message: err.message || 'Error saving order' });
    }
};

const sendOrderConfirmation = async (req: AuthRequest, order: any, normalized: Awaited<ReturnType<typeof loadNormalizedOrder>>) => {
    await sendEmail(
        req.user.email,
        "Order Confirmation - BookVerse",
        orderTemplate(order._id.toString(), normalized.orderItems, normalized.totalPrice)
    ).catch(emailErr => console.error("Email sending failed (background):", emailErr));
};

const consumeStockOnce = async (order: any) => {
    if (!order || order.stockConsumed) return;
    if (!Array.isArray(order.orderItems) || order.orderItems.length === 0) return;

    await decrementOrderStock(order.orderItems);
    order.stockConsumed = true;
    await order.save();
};

export const createDemoOrder = async (req: AuthRequest, res: Response) => {
    // Demo orders are disabled in production unless an operator explicitly enables them.
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEMO_PAYMENTS !== 'true') {
        return res.status(403).json({ success: false, message: 'Demo payments are disabled in this environment.' });
    }

    const requestId = req.body?.requestId;
    if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
        return res.status(400).json({ success: false, message: 'A valid demo request ID is required.' });
    }

    const paymentId = `DEMO_${requestId.toLowerCase()}`;
    let normalized: Awaited<ReturnType<typeof loadNormalizedOrder>>;

    try {
        const orderItems = Array.isArray(req.body?.orderItems) ? req.body.orderItems : [];
        normalized = await loadNormalizedOrder(req, orderItems);
    } catch (err: any) {
        return res.status(400).json({ success: false, message: err?.message || 'Invalid demo order.' });
    }

    const matchesExistingDemoOrder = (order: any) => {
        if (!order || String(order.user) !== req.user.id ||
            order.paymentMethod !== 'UPI_QR_DEMO' ||
            order.status !== 'Demo Completed' ||
            order.stockConsumed !== true ||
            Number(order.totalPrice) !== normalized.totalPrice) return false;

        const existingItems = (order.orderItems || []).map((item: any) => ({
            bookId: String(item.bookId), quantity: Number(item.quantity), title: String(item.title), price: Number(item.price),
        }));
        const requestedItems = normalized.orderItems.map((item: any) => ({
            bookId: String(item.bookId), quantity: Number(item.quantity), title: String(item.title), price: Number(item.price),
        }));
        const existingAddress = order.shippingAddress || {};
        const requestedAddress = normalized.shippingAddress;
        return JSON.stringify(existingItems) === JSON.stringify(requestedItems) &&
            String(existingAddress.address || '') === requestedAddress.address &&
            String(existingAddress.city || '') === requestedAddress.city &&
            String(existingAddress.zip || '') === requestedAddress.zip &&
            String(existingAddress.phone || '') === requestedAddress.phone;
    };

    let createdOrder: any;
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const existing = await Order.findOne({ paymentId }).session(session);
            if (existing) {
                if (!matchesExistingDemoOrder(existing)) {
                    const conflict: any = new Error('This demo request ID has already been used for a different order.');
                    conflict.statusCode = 409;
                    throw conflict;
                }
                createdOrder = existing;
                return;
            }

            const [order] = await Order.create([{
                user: req.user.id,
                orderItems: normalized.orderItems,
                totalPrice: normalized.totalPrice,
                paymentId,
                paymentMethod: 'UPI_QR_DEMO',
                status: 'Demo Completed',
                stockConsumed: false,
                shippingAddress: normalized.shippingAddress,
            }], { session });

            await decrementOrderStock(normalized.orderItems, session);
            order.stockConsumed = true;
            await order.save({ session });
            createdOrder = order;
        });
    } catch (err: any) {
        // If simultaneous retries race on the unique paymentId, the losing
        // transaction is rolled back; return the already-committed matching order.
        if (err?.code === 11000) {
            const existing = await Order.findOne({ paymentId });
            if (matchesExistingDemoOrder(existing)) {
                return res.json({
                    success: true,
                    demo: true,
                    realPayment: false,
                    message: 'Demo order already created. No money was transferred.',
                    orderId: existing._id.toString(),
                    order: serializeOrder(existing),
                });
            }
            return res.status(409).json({ success: false, message: 'This demo request ID has already been used.' });
        }

        const statusCode = err?.statusCode || (
            /required|invalid|unavailable|quantity|price|book|address|order item/i.test(String(err?.message))
                ? 400
                : 500
        );
        console.error('Demo Order Error:', err);
        return res.status(statusCode).json({ success: false, message: statusCode === 500 ? 'Unable to process demo order. Please try again.' : err.message });
    } finally {
        await session.endSession();
    }

    if (!createdOrder) {
        return res.status(500).json({ success: false, message: 'Demo order could not be confirmed.' });
    }

    await sendOrderConfirmation(req, createdOrder, normalized);
    return res.json({
        success: true,
        demo: true,
        realPayment: false,
        message: 'Demo order created successfully. No money was transferred.',
        orderId: createdOrder._id.toString(),
        order: serializeOrder(createdOrder),
    });
};

export const getOrders = async (req: AuthRequest, res: Response) => {
    try {
        const orders = await Order.find({ user: new mongoose.Types.ObjectId(req.user.id) }).sort({ createdAt: -1 });
        res.json(orders.map(serializeOrder));
    } catch (err) {
        res.status(500).json({ message: 'Error fetching orders' });
    }
};

const finalizeStripePayment = async (paymentIntent: Stripe.PaymentIntent) => {
    if (paymentIntent.status !== 'succeeded') return;
    const orderId = paymentIntent.metadata?.orderId;
    if (!orderId || !mongoose.isValidObjectId(orderId)) return;

    const order = await Order.findOne({ _id: orderId, paymentId: paymentIntent.id });
    if (!order || order.status === 'Paid') return;
    if (paymentIntent.metadata?.userId !== order.user.toString()) return;

    order.paymentId = paymentIntent.id;
    order.paymentMethod = 'Stripe';
    order.status = 'Paid';
    await consumeStockOnce(order);
    await order.save();
};

export const stripeWebhook = async (req: any, res: Response) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
        console.error('⚠️ Stripe Webhook Secret missing');
        return res.status(400).send('Webhook Error: Secret missing');
    }

    try {
        const event = getStripe().webhooks.constructEvent(req.body, sig as string, endpointSecret);
        if (event.type === 'payment_intent.succeeded') {
            await finalizeStripePayment(event.data.object as Stripe.PaymentIntent);
        }
        return res.send();
    } catch (err: any) {
        console.error(`⚠️ Webhook Signature Verification Failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
};
