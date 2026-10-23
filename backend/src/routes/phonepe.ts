import express, { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import mongoose from 'mongoose';
// @ts-ignore
import { auth } from '../middleware/auth';
import Order from '../models/Order';
import { AuthRequest } from '../types';
import Book from '../models/Book';
import { normalizeOrderInput } from '../utils/contracts';
import { decrementOrderStock } from '../utils/inventory';
import {
    getPhonePeRedirectUrl,
    getPhonePeStatusForUser,
    isPhonePePaymentMatch,
    PhonePeProviderResponse,
} from '../../phonepeRedirect.cjs';

const router = express.Router();

interface TokenCache {
    accessToken: string;
    expiresAtEpochMs: number;
}

let cachedToken: TokenCache | null = null;

export const clearPhonePeTokenCache = () => {
    cachedToken = null;
};

export const getPhonePeConfig = () => {
    const clientId = process.env.PHONEPE_CLIENT_ID?.trim() || "";
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET?.trim() || "";
    const clientVersion = process.env.PHONEPE_CLIENT_VERSION?.trim() || "1";
    const merchantId = process.env.PHONEPE_MERCHANT_ID?.trim() || "";
    const saltKey = process.env.PHONEPE_SALT_KEY?.trim() || "";
    const hostUrl = process.env.PHONEPE_HOST_URL?.trim() || "https://api-preprod.phonepe.com/apis/pg-sandbox";

    const isV2 = Boolean(clientId && clientSecret);
    const isV1 = Boolean(merchantId && saltKey);

    return {
        clientId,
        clientSecret,
        clientVersion,
        merchantId,
        saltKey,
        hostUrl,
        isConfigured: isV2 || isV1,
        mode: isV2 ? ('v2' as const) : isV1 ? ('v1' as const) : ('none' as const),
    };
};

export const getPhonePeOAuthToken = async (config = getPhonePeConfig()): Promise<string> => {
    if (!config.clientId || !config.clientSecret) {
        throw new Error('PhonePe OAuth requires PHONEPE_CLIENT_ID and PHONEPE_CLIENT_SECRET');
    }

    const now = Date.now();
    // Use cached token if valid for at least another 60 seconds
    if (cachedToken && cachedToken.expiresAtEpochMs - now > 60000) {
        return cachedToken.accessToken;
    }

    const oauthUrl = `${config.hostUrl.replace(/\/$/, '')}/v1/oauth/token`;
    const params = new URLSearchParams({
        client_id: config.clientId,
        client_version: config.clientVersion,
        client_secret: config.clientSecret,
        grant_type: 'client_credentials'
    });

    const response = await axios.post(oauthUrl, params.toString(), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json'
        }
    });

    const data = response.data;
    const token = data?.access_token;
    if (!token || typeof token !== 'string') {
        throw new Error('PhonePe OAuth response did not contain an access_token');
    }

    // expires_at can be in seconds or milliseconds
    const rawExpires = Number(data?.expires_at);
    let expiresAtEpochMs = now + 3600000;
    if (Number.isFinite(rawExpires) && rawExpires > 0) {
        expiresAtEpochMs = rawExpires < 10000000000 ? rawExpires * 1000 : rawExpires;
    }

    cachedToken = {
        accessToken: token,
        expiresAtEpochMs
    };

    return token;
};

const getRequestBaseUrl = (req: Request) => {
    const forwardedProto = req.headers['x-forwarded-proto'];
    const protocol = Array.isArray(forwardedProto)
        ? forwardedProto[0]
        : forwardedProto || req.protocol || 'http';
    const host = req.get('host') || 'localhost:5000';
    return `${protocol}://${host}`.replace(/\/$/, '');
};

const getBackendBaseUrl = (req: Request) => {
    const configured = process.env.BACKEND_URL?.trim();
    if (configured) return configured.replace(/\/$/, '');
    return getRequestBaseUrl(req);
};

const getClientBaseUrl = (req: Request) => {
    const configured = process.env.CLIENT_URL?.trim();
    if (configured) return configured.replace(/\/$/, '');
    return 'http://localhost:5173';
};

const SALT_INDEX = 1;

export const getPhonePeStatus = async (merchantTransactionId: string): Promise<PhonePeProviderResponse> => {
    const config = getPhonePeConfig();

    if (config.mode === 'v2') {
        const token = await getPhonePeOAuthToken(config);
        const statusUrl = `${config.hostUrl.replace(/\/$/, '')}/checkout/v2/order/${encodeURIComponent(merchantTransactionId)}/status`;
        const response = await axios.get(statusUrl, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `O-Bearer ${token}`
            }
        });
        return response.data;
    }

    // Legacy v1 flow
    const { merchantId, saltKey, hostUrl } = config;
    const stringToHash = `/pg/v1/status/${merchantId}/${merchantTransactionId}` + saltKey;
    const checksum = crypto.createHash('sha256').update(stringToHash).digest('hex') + '###' + SALT_INDEX;

    const response = await axios.get(
        `${hostUrl}/pg/v1/status/${merchantId}/${merchantTransactionId}`,
        {
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': checksum,
                'X-MERCHANT-ID': merchantId
            }
        }
    );

    return response.data;
};

const finalizePhonePeOrder = async (merchantTransactionId: string, providerResponse: any) => {
    const providerCode = providerResponse?.state ?? providerResponse?.code ?? providerResponse?.data?.code;
    const isSuccess = providerCode === 'PAYMENT_SUCCESS' || providerCode === 'COMPLETED';
    if (!isSuccess) return false;

    const session = await mongoose.startSession();
    let finalized = false;

    try {
        await session.withTransaction(async () => {
            finalized = false;
            const order = await Order.findOne({ paymentId: merchantTransactionId }).session(session);
            if (!order) return;

            const expectedAmount = Math.round(order.totalPrice * 100);
            if (!isPhonePePaymentMatch(providerResponse, merchantTransactionId, expectedAmount)) return;

            if (order.status === 'Paid' || order.stockConsumed) {
                finalized = order.status === 'Paid' && order.stockConsumed;
                return;
            }

            if (!order.stockConsumed) {
                await decrementOrderStock(order.orderItems, session);
            }

            const updatedOrder = await Order.findOneAndUpdate(
                { _id: order._id, status: { $ne: 'Paid' }, stockConsumed: { $ne: true } },
                { $set: { status: 'Paid', stockConsumed: true } },
                { session, new: true }
            );

            if (!updatedOrder) {
                throw new Error('PhonePe order was concurrently finalized');
            }

            finalized = true;
        });
    } catch (error) {
        console.error('PhonePe finalization failed:', error);
        finalized = false;
    } finally {
        await session.endSession();
    }

    return finalized;
};

const verifyAndRedirect = async (merchantTransactionId: string, clientBaseUrl: string, res: Response) => {
    const redirectUrl = await getPhonePeRedirectUrl({
        clientBaseUrl,
        merchantTransactionId,
        getProviderStatus: getPhonePeStatus,
        finalizeOrder: finalizePhonePeOrder,
        findOrder: async (paymentId) => {
            const order = await Order.findOne({ paymentId });
            return order ? { _id: order._id.toString(), status: order.status, stockConsumed: order.stockConsumed } : null;
        },
    });
    return res.redirect(redirectUrl);
};

// 1. INITIATE PAYMENT
router.post('/pay', auth, async (req: AuthRequest, res: Response) => {
    try {
        const config = getPhonePeConfig();
        if (!config.isConfigured) {
            return res.status(503).json({
                success: false,
                message: 'PhonePe payment gateway is currently not configured on this server.'
            });
        }

        const orderItems = Array.isArray(req.body.orderItems ?? req.body.items) ? req.body.orderItems ?? req.body.items : [];
        const catalogBooks = await Promise.all(orderItems.map(async (item: any) => {
            const id = item.bookId ?? item.id;
            if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) return Book.findById(id);
            if (typeof id === 'string' && !Number.isNaN(Number(id))) return Book.findOne({ id: Number(id) });
            if (typeof id === 'number') return Book.findOne({ id: id });
            return null;
        }));
        const normalizedOrder = normalizeOrderInput({
            orderItems,
            shippingAddress: req.body.shippingAddress ?? req.body.shippingDetails,
            paymentMethod: 'PhonePe'
        }, catalogBooks);
        const backendBaseUrl = getBackendBaseUrl(req as Request);
        const userId = req.user.id;
        const merchantTransactionId = `MT${crypto.randomUUID().replace(/-/g, '')}`;

        // Create a Pending Order with server-authoritative catalog values.
        const newOrder = new Order({
            user: userId,
            orderItems: normalizedOrder.orderItems,
            totalPrice: normalizedOrder.totalPrice,
            paymentId: merchantTransactionId,
            paymentMethod: 'PhonePe',
            status: 'Pending',
            shippingAddress: normalizedOrder.shippingAddress
        });

        await newOrder.save();

        const amountPaise = Math.round(normalizedOrder.totalPrice * 100);
        const callbackUrl = `${backendBaseUrl}/api/phonepe/callback?merchantTransactionId=${merchantTransactionId}`;

        if (config.mode === 'v2') {
            const token = await getPhonePeOAuthToken(config);
            const payUrl = `${config.hostUrl.replace(/\/$/, '')}/checkout/v2/pay`;
            const payloadV2 = {
                merchantOrderId: merchantTransactionId,
                amount: amountPaise,
                paymentFlow: {
                    type: "PG_CHECKOUT",
                    merchantUrls: {
                        redirectUrl: callbackUrl
                    }
                },
                metaInfo: {
                    userId,
                    orderId: newOrder._id.toString(),
                    phone: normalizedOrder.shippingAddress.phone || ''
                }
            };

            const response = await axios.post(payUrl, payloadV2, {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: `O-Bearer ${token}`
                }
            });

            const redirectUrl = response.data?.redirectUrl || response.data?.data?.redirectUrl;
            if (!redirectUrl) {
                throw new Error('PhonePe v2 response did not contain a redirectUrl');
            }

            return res.json({
                success: true,
                url: redirectUrl,
                merchantTransactionId,
                orderId: newOrder._id.toString()
            });
        }

        // Fallback: Legacy v1 initiate flow
        const { merchantId, saltKey, hostUrl } = config;
        const data = {
            merchantId,
            merchantTransactionId: merchantTransactionId,
            merchantUserId: userId,
            amount: amountPaise,
            redirectUrl: callbackUrl,
            redirectMode: "POST",
            callbackUrl: callbackUrl,
            mobileNumber: normalizedOrder.shippingAddress.phone,
            paymentInstrument: {
                type: "PAY_PAGE"
            }
        };

        const payload = JSON.stringify(data);
        const payloadMain = Buffer.from(payload).toString('base64');

        const stringToHash = payloadMain + "/pg/v1/pay" + saltKey;
        const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
        const checksum = sha256 + '###' + SALT_INDEX;

        const options = {
            method: 'POST',
            url: `${hostUrl}/pg/v1/pay`,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': checksum
            },
            data: {
                request: payloadMain
            }
        };

        const response = await axios.request(options);

        res.json({
            success: true,
            url: response.data.data.instrumentResponse.redirectInfo.url,
            merchantTransactionId,
            orderId: newOrder._id.toString()
        });

    } catch (error: any) {
        console.error("PhonePe Error:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "PhonePe API Error"
        });
    }
});

// 2. CALLBACK / REDIRECT HANDLER
router.get('/callback', async (req: Request, res: Response) => {
    const clientBaseUrl = getClientBaseUrl(req);
    const merchantTransactionId = req.query.merchantTransactionId as string
        || req.query.transactionId as string
        || req.query.txnId as string;

    if (!merchantTransactionId) {
        console.warn("⚠️ PhonePe GET callback received without a transaction id.");
        return res.redirect(`${clientBaseUrl}/cart?status=error&reason=missing_transaction`);
    }

    try {
        return await verifyAndRedirect(merchantTransactionId, clientBaseUrl, res);
    } catch (error: any) {
        console.error("PhonePe GET callback verification failed:", error.message);
        return res.redirect(`${clientBaseUrl}/cart?status=error&reason=verification_failed`);
    }
});

router.post('/callback', async (req: Request, res: Response) => {
    const clientBaseUrl = getClientBaseUrl(req);
    try {
        const merchantTransactionId = req.query.merchantTransactionId as string
            || req.query.transactionId as string
            || req.query.txnId as string
            || (req.body as any)?.merchantOrderId
            || (req.body as any)?.merchantTransactionId
            || (req.body as any)?.transactionId;

        if (!merchantTransactionId) {
            return res.redirect(`${clientBaseUrl}/cart?status=error&reason=missing_transaction`);
        }

        return await verifyAndRedirect(merchantTransactionId, clientBaseUrl, res);

    } catch (error: any) {
        console.error("Callback Fatal Error:", error.message);
        res.redirect(`${clientBaseUrl}/cart?status=error&reason=exception`);
    }
});

// 3. CHECK STATUS (Frontend calls this to verify after coming back)
router.get('/status/:txnId', auth, async (req: AuthRequest, res: Response) => {
    try {
        const merchantTransactionId = Array.isArray(req.params.txnId)
            ? req.params.txnId[0]
            : req.params.txnId;
        const result = await getPhonePeStatusForUser({
            userId: req.user?.id,
            merchantTransactionId,
            findOrder: async (paymentId, userId) => {
                const order = await Order.findOne({ paymentId, user: userId });
                return order ? { _id: order._id.toString(), status: order.status, stockConsumed: order.stockConsumed } : null;
            },
            getProviderStatus: getPhonePeStatus,
            finalizeOrder: finalizePhonePeOrder,
            markFailedOrder: async (paymentId, userId, order) => {
                const updatedOrder = await Order.findOneAndUpdate(
                    { _id: order._id, user: userId, status: { $ne: 'Paid' } },
                    { $set: { status: 'Failed' } },
                    { new: true }
                );
                if (updatedOrder) return updatedOrder.status;

                const currentOrder = await Order.findOne({ paymentId, user: userId });
                return currentOrder?.status ?? 'Failed';
            },
        });
        return res.status(result.statusCode).json(result.body);
    } catch (error: any) {
        console.error("PhonePe Status Error:", error.message);
        res.status(500).json({ success: false, message: 'Error checking status' });
    }
});

export default router;
