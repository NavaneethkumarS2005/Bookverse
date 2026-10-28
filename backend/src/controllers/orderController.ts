import crypto from 'crypto';
import { Response } from 'express';
import mongoose from 'mongoose';
import Stripe from 'stripe';
import Book from '../models/Book';
import Order from '../models/Order';
import DemoPaymentSession, { DemoPaymentSessionState } from '../models/DemoPaymentSession';
import User from '../models/User';
import { AuthRequest } from '../types';
import { normalizeOrderInput, serializeOrder } from '../utils/contracts';
import { decrementOrderStock } from '../utils/inventory';
import { publicBookFilter } from '../utils/catalogVisibility';
import { areDemoPaymentsEnabled } from '../config/env';
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

const validateOrderItemShape = (orderItems: unknown): orderItems is Array<Record<string, unknown>> => {
    if (!Array.isArray(orderItems) || orderItems.length === 0) {
        throw new Error('At least one order item is required');
    }

    const seenIds = new Set<string>();
    for (const item of orderItems) {
        if (!item || typeof item !== 'object') {
            throw new Error('Order item is invalid');
        }

        const candidate = item as Record<string, unknown>;
        const rawId = candidate.bookId ?? candidate.productId ?? candidate.id;
        if (rawId === null || rawId === undefined || rawId === '') {
            throw new Error('Book is missing from the order');
        }
        if (typeof rawId !== 'string' && typeof rawId !== 'number') {
            throw new Error('Book identifier is invalid');
        }
        const bookId = String(rawId).trim();
        const quantity = typeof candidate.quantity === 'number'
            ? candidate.quantity
            : Number(candidate.quantity);

        if (!bookId || (typeof rawId === 'number' && !Number.isFinite(rawId))) {
            throw new Error('Book is missing from the order');
        }
        if (!Number.isInteger(quantity) || quantity < 1) {
            throw new Error('Order item quantity must be a positive integer');
        }
        if (seenIds.has(bookId)) throw new Error('Order items contain duplicate books');
        seenIds.add(bookId);
    }

    return true;
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
            const transaction = await mongoose.startSession();
            let newOrder: any;
            try {
                await transaction.withTransaction(async () => {
                    await decrementOrderStock(normalized.orderItems, transaction);
                    [newOrder] = await Order.create([{
                        user: req.user.id,
                        orderItems: normalized.orderItems,
                        totalPrice: normalized.totalPrice,
                        paymentId,
                        paymentMethod,
                        status: 'Placed',
                        stockConsumed: true,
                        shippingAddress: normalized.shippingAddress,
                    }], { session: transaction });
                });
            } finally {
                await transaction.endSession();
            }
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

        const finalized = await finalizeStripeOrder(paymentIntent, req.user.id, normalized);
        if (!finalized) return res.status(404).json({ message: 'Order not found' });
        if (finalized.finalized) await sendOrderConfirmation(req, finalized.order, normalized);
        res.json({
            success: true,
            message: finalized.finalized ? 'Order Saved' : 'Order already saved',
            orderId: finalized.order._id,
            order: serializeOrder(finalized.order)
        });
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

    const DEMO_SESSION_TTL_MS = 10 * 60 * 1000;

    const hashDemoSessionKey = (sessionKey: string) =>
        crypto.createHash('sha256').update(sessionKey).digest('hex');

    const demoSessionResponse = (session: any, sessionKey?: string) => ({
        success: true,
        demo: true,
        state: session.state,
        amount: session.totalPrice,
        expiresAt: session.expiresAt,
        sessionReference: String(session._id).slice(-8).toUpperCase(),
        ...(sessionKey ? { sessionKey } : {}),
    });

    const expireDemoSessionIfNeeded = async (session: any) => {
        if (session && session.state === 'CREATED' && session.expiresAt.getTime() <= Date.now()) {
            return DemoPaymentSession.findOneAndUpdate(
                { _id: session._id, state: 'CREATED' },
                { $set: { state: 'EXPIRED' } },
                { new: true }
            );
        }
        return session;
    };

    export const createDemoPaymentSession = async (req: AuthRequest, res: Response) => {
        if (!areDemoPaymentsEnabled()) {
            return res.status(403).json({ success: false, message: 'Demo payments are disabled in this environment.' });
        }

        const rawItems = req.body?.orderItems;
        try {
            validateOrderItemShape(rawItems);
        } catch (error: any) {
            return res.status(400).json({ success: false, message: error.message });
        }

        let normalized: Awaited<ReturnType<typeof loadNormalizedOrder>>;
        try {
            normalized = await loadNormalizedOrder(req, rawItems);
        } catch (error: any) {
            return res.status(400).json({ success: false, message: error?.message || 'Invalid demo order.' });
        }

        const sessionKey = crypto.randomBytes(32).toString('hex');
        const session = await DemoPaymentSession.create({
            sessionKeyHash: hashDemoSessionKey(sessionKey),
            user: req.user.id,
            orderItems: normalized.orderItems,
            shippingAddress: normalized.shippingAddress,
            totalPrice: normalized.totalPrice,
            state: 'CREATED',
            expiresAt: new Date(Date.now() + DEMO_SESSION_TTL_MS),
        });

        return res.status(201).json(demoSessionResponse(session, sessionKey));
    };

    const findDemoSession = async (sessionKey: string) => {
        if (!/^[a-f0-9]{64}$/i.test(sessionKey)) return null;
        const session = await DemoPaymentSession.findOne({ sessionKeyHash: hashDemoSessionKey(sessionKey) });
        return expireDemoSessionIfNeeded(session);
    };

    export const getDemoPaymentSession = async (req: AuthRequest, res: Response) => {
        const session = await DemoPaymentSession.findOne({
            sessionKeyHash: hashDemoSessionKey(String(req.params.sessionKey || '')),
            user: req.user.id,
        });
        const current = await expireDemoSessionIfNeeded(session);
        if (!current) return res.status(404).json({ success: false, message: 'Demo session not found.' });
        return res.json(demoSessionResponse(current));
    };

    export const getPublicDemoPaymentSession = async (req: any, res: Response) => {
        const session = await findDemoSession(String(req.params.sessionKey || ''));
        if (!session) return res.status(404).json({ success: false, message: 'Demo session not found.' });
        return res.json(demoSessionResponse(session));
    };

    const updateDemoSessionState = async (
        req: any,
        res: Response,
        nextState: Extract<DemoPaymentSessionState, 'SUCCEEDED' | 'FAILED'>
    ) => {
        if (!areDemoPaymentsEnabled()) {
            return res.status(403).json({ success: false, message: 'Demo payments are disabled in this environment.' });
        }

        const session = await findDemoSession(String(req.params.sessionKey || ''));
        if (!session) return res.status(404).json({ success: false, message: 'Demo session not found.' });
        if (session.state === nextState) return res.json(demoSessionResponse(session));
        if (session.state !== 'CREATED') {
            return res.status(409).json({ success: false, message: `Demo session is already ${session.state.toLowerCase()}.` });
        }
        if (nextState === 'FAILED') {
            const failed = await DemoPaymentSession.findOneAndUpdate(
                { _id: session._id, state: 'CREATED' },
                { $set: { state: 'FAILED' } },
                { new: true }
            );
            const current = failed || await DemoPaymentSession.findById(session._id);
            return res.json(demoSessionResponse(current || session));
        }

        const transaction = await mongoose.startSession();
        try {
            let finalized: any;
            let createdOrder: any;
            await transaction.withTransaction(async () => {
                const claimed = await DemoPaymentSession.findOneAndUpdate(
                    { _id: session._id, state: 'CREATED', expiresAt: { $gt: new Date() } },
                    { $set: { state: 'PROCESSING' } },
                    { new: true, session: transaction }
                );
                if (!claimed) throw Object.assign(new Error('Demo session is no longer available.'), { statusCode: 409 });

                const paymentId = `DEMO_SESSION_${String(claimed._id)}`;
                const [order] = await Order.create([{
                    user: claimed.user,
                    orderItems: claimed.orderItems,
                    totalPrice: claimed.totalPrice,
                    paymentId,
                    paymentMethod: 'UPI_QR_DEMO',
                    status: 'Demo Completed',
                    stockConsumed: false,
                    shippingAddress: claimed.shippingAddress,
                }], { session: transaction });

                await decrementOrderStock(claimed.orderItems, transaction);
                order.stockConsumed = true;
                await order.save({ session: transaction });
                createdOrder = order;

                finalized = await DemoPaymentSession.findOneAndUpdate(
                    { _id: claimed._id, state: 'PROCESSING' },
                    { $set: { state: 'SUCCEEDED', order: order._id } },
                    { new: true, session: transaction }
                );
            });

            if (!finalized) return res.status(500).json({ success: false, message: 'Demo session could not be confirmed.' });
            const owner = await User.findById(finalized.user).select('email');
            if (owner?.email) {
                await sendOrderConfirmation({ user: { email: owner.email } } as AuthRequest, createdOrder, {
                    orderItems: finalized.orderItems,
                    totalPrice: finalized.totalPrice,
                    shippingAddress: finalized.shippingAddress,
                } as any);
            }
            return res.json(demoSessionResponse(finalized));
        } catch (error: any) {
            const statusCode = error?.statusCode || 500;
            if (statusCode === 409) {
                const current = await findDemoSession(String(req.params.sessionKey || ''));
                if (current?.state === 'SUCCEEDED') return res.json(demoSessionResponse(current));
            }
            return res.status(statusCode).json({
                success: false,
                message: statusCode === 500 ? 'Unable to finalize demo payment.' : error.message,
            });
        } finally {
            await transaction.endSession();
        }
    };

    export const succeedDemoPaymentSession = (req: any, res: Response) =>
        updateDemoSessionState(req, res, 'SUCCEEDED');

    export const failDemoPaymentSession = (req: any, res: Response) =>
        updateDemoSessionState(req, res, 'FAILED');

export const getOrders = async (req: AuthRequest, res: Response) => {
    try {
        const orders = await Order.find({ user: new mongoose.Types.ObjectId(req.user.id) }).sort({ createdAt: -1 });
        res.json(orders.map(serializeOrder));
    } catch (err) {
        res.status(500).json({ message: 'Error fetching orders' });
    }
};

const finalizeStripeOrder = async (
    paymentIntent: Stripe.PaymentIntent,
    userId: string,
    normalized?: Awaited<ReturnType<typeof loadNormalizedOrder>>
) => {
    if (paymentIntent.status !== 'succeeded') return;
    const orderId = paymentIntent.metadata?.orderId;
    if (!orderId || !mongoose.isValidObjectId(orderId)) return;

    if (paymentIntent.metadata?.userId !== userId) return;

    const transaction = await mongoose.startSession();
    let finalizedOrder: any;
    let didFinalize = false;
    try {
        await transaction.withTransaction(async () => {
            const existingOrder = await Order.findOne({
                _id: orderId,
                user: userId,
            }, null, { session: transaction });
            if (!existingOrder) return;

            const expectedAmount = Math.round((normalized?.totalPrice ?? existingOrder.totalPrice) * 100);
            if (paymentIntent.amount !== expectedAmount) {
                throw new Error('Payment amount does not match the order');
            }

            if (existingOrder.status === 'Paid' && existingOrder.stockConsumed) {
                finalizedOrder = existingOrder;
                return;
            }

            const claimedOrder = await Order.findOneAndUpdate(
                {
                    _id: existingOrder._id,
                    user: userId,
                    stockConsumed: false,
                    status: { $in: ['Pending', 'Paid'] },
                },
                {
                    $set: {
                        paymentId: paymentIntent.id,
                        paymentMethod: 'Stripe',
                        status: 'Paid',
                    },
                },
                { new: true, session: transaction }
            );
            if (!claimedOrder) {
                finalizedOrder = await Order.findById(existingOrder._id, null, { session: transaction });
                return;
            }

            await decrementOrderStock(claimedOrder.orderItems, transaction);
            claimedOrder.stockConsumed = true;
            finalizedOrder = await claimedOrder.save({ session: transaction });
            didFinalize = true;
        });
    } finally {
        await transaction.endSession();
    }

    return finalizedOrder ? { order: finalizedOrder, finalized: didFinalize } : undefined;
};

const finalizeStripePayment = async (paymentIntent: Stripe.PaymentIntent) => {
    const userId = paymentIntent.metadata?.userId;
    if (!userId) return;
    const finalized = await finalizeStripeOrder(paymentIntent, userId);
    if (finalized?.finalized) {
        const owner = await User.findById(userId).select('email');
        if (owner?.email) {
            await sendOrderConfirmation({ user: { email: owner.email } } as AuthRequest, finalized.order, {
                orderItems: finalized.order.orderItems,
                totalPrice: finalized.order.totalPrice,
                shippingAddress: finalized.order.shippingAddress,
            } as any);
        }
    }
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
