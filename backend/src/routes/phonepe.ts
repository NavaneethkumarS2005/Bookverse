import express, { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
// @ts-ignore
import { auth } from '../middleware/auth';
import Order from '../models/Order';
import { AuthRequest } from '../types';
import Book from '../models/Book';
import { normalizeOrderItems } from '../utils/contracts';

const router = express.Router();

const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || "";
const SALT_KEY = process.env.PHONEPE_SALT_KEY || "";
const SALT_INDEX = 1;
const PHONEPE_HOST_URL = process.env.PHONEPE_HOST_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox";

if (!process.env.PHONEPE_MERCHANT_ID || !process.env.PHONEPE_SALT_KEY) {
    console.warn("⚠️ PhonePe credentials are not configured. Payment requests will fail until they are supplied.");
}

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

    // The callback originates from PhonePe's servers, so checking req.headers.origin
    // or referer will return PhonePe URLs. We should rely on the configured CLIENT_URL.
    return 'http://localhost:5173';
};

const getPhonePeStatus = async (merchantTransactionId: string) => {
    const stringToHash = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + SALT_KEY;
    const checksum = crypto.createHash('sha256').update(stringToHash).digest('hex') + '###' + SALT_INDEX;

    const response = await axios.get(
        `${PHONEPE_HOST_URL}/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`,
        {
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': checksum,
                'X-MERCHANT-ID': MERCHANT_ID
            }
        }
    );

    return response.data;
};

const paymentResultUrl = (clientBaseUrl: string, code: string | undefined, merchantTransactionId: string) => {
    if (code === 'PAYMENT_SUCCESS') return `${clientBaseUrl}/?payment=success`;

    const failed = ['PAYMENT_ERROR', 'PAYMENT_DECLINED', 'PAYMENT_CANCELLED'].includes(code || '');
    if (failed) return `${clientBaseUrl}/cart?status=failure`;

    // QR payments can briefly remain pending after the PhonePe browser returns.
    // Keep the customer on the site and let the frontend recheck the transaction.
    return `${clientBaseUrl}/?payment=pending&txnId=${encodeURIComponent(merchantTransactionId)}`;
};

const finalizePhonePeOrder = async (merchantTransactionId: string, providerResponse: any) => {
    if (providerResponse.code !== 'PAYMENT_SUCCESS') return false;
    const order = await Order.findOne({ paymentId: merchantTransactionId });
    if (!order || order.status === 'Paid') return false;

    const providerAmount = Number(providerResponse.amount ?? providerResponse.data?.amount);
    const expectedAmount = Math.round(order.totalPrice * 100);
    if (!Number.isFinite(providerAmount) || providerAmount !== expectedAmount) return false;

    order.status = 'Paid';
    await order.save();
    return true;
};

const verifyAndRedirect = async (merchantTransactionId: string, clientBaseUrl: string, res: Response) => {
    const result = await getPhonePeStatus(merchantTransactionId);
    const success = await finalizePhonePeOrder(merchantTransactionId, result);
    return res.redirect(paymentResultUrl(clientBaseUrl, success ? 'PAYMENT_SUCCESS' : result.code, merchantTransactionId));
};

// 1. INITIATE PAYMENT
router.post('/pay', auth, async (req: AuthRequest, res: Response) => {
    try {
        const orderItems = Array.isArray(req.body.orderItems ?? req.body.items) ? req.body.orderItems ?? req.body.items : [];
        const catalogBooks = await Promise.all(orderItems.map(async (item: any) => {
            const id = item.bookId ?? item.id;
            if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) return Book.findById(id);
            if (typeof id === 'string' && !Number.isNaN(Number(id))) return Book.findOne({ id: Number(id) });
            if (typeof id === 'number') return Book.findOne({ id: id });
            return null;
        }));
        const { orderItems: normalizedItems, totalPrice } = normalizeOrderItems(orderItems, catalogBooks);
        const shippingAddress = req.body.shippingAddress ?? req.body.shippingDetails;
        const backendBaseUrl = getBackendBaseUrl(req as Request);
        const userId = req.user.id;
        const merchantTransactionId = `MT${crypto.randomUUID().replace(/-/g, '')}`;

        // Create a Pending Order with server-authoritative catalog values.
        const newOrder = new Order({
            user: userId,
            orderItems: normalizedItems,
            totalPrice,
            paymentId: merchantTransactionId,
            paymentMethod: 'PhonePe',
            status: 'Pending',
            shippingAddress
        });

        await newOrder.save();

        const data = {
            merchantId: MERCHANT_ID,
            merchantTransactionId: merchantTransactionId,
            merchantUserId: userId,
            amount: Math.round(totalPrice * 100), // Convert to Paise
            // Include the merchantTransactionId in redirect and callback so QR/code flows carry the txn id
            redirectUrl: `${backendBaseUrl}/api/phonepe/callback?merchantTransactionId=${merchantTransactionId}`,
            redirectMode: "POST",
            callbackUrl: `${backendBaseUrl}/api/phonepe/callback?merchantTransactionId=${merchantTransactionId}`,
            mobileNumber: shippingAddress?.phone || "9999999999",
            paymentInstrument: {
                type: "PAY_PAGE"
            }
        };

        const payload = JSON.stringify(data);
        const payloadMain = Buffer.from(payload).toString('base64');

        const stringToHash = payloadMain + "/pg/v1/pay" + SALT_KEY;
        const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
        const checksum = sha256 + '###' + SALT_INDEX;

        const options = {
            method: 'POST',
            url: `${PHONEPE_HOST_URL}/pg/v1/pay`,
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
// PhonePe test/QR flows can return with a GET and only the transaction id in the query.
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
router.get('/status/:txnId', async (req: Request, res: Response) => {
    try {
        const merchantTransactionId = Array.isArray(req.params.txnId)
            ? req.params.txnId[0]
            : req.params.txnId;
        const response = { data: await getPhonePeStatus(merchantTransactionId) };

        if (response.data.code === 'PAYMENT_SUCCESS') {
            await Order.findOneAndUpdate(
                { paymentId: merchantTransactionId },
                { status: 'Paid' }
            );
            res.json({ success: true, message: 'Payment Successful', data: response.data });
        } else {
            const failed = ['PAYMENT_ERROR', 'PAYMENT_DECLINED', 'PAYMENT_CANCELLED'].includes(response.data.code);
            if (failed) {
                await Order.findOneAndUpdate(
                    { paymentId: merchantTransactionId },
                    { status: 'Failed' }
                );
            }
            res.json({
                success: false,
                pending: !failed,
                message: failed ? 'Payment failed' : 'Payment is being confirmed',
                data: response.data
            });
        }

    } catch (error: any) {
        console.error("PhonePe Status Error:", error.message);
        res.status(500).json({ success: false, message: 'Error checking status' });
    }
});

export default router;
