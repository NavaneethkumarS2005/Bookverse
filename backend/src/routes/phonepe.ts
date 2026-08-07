import express, { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
// @ts-ignore
import { auth } from '../middleware/auth';
import Order from '../models/Order';
import { AuthRequest } from '../types';

const router = express.Router();

// PHONEPE CREDENTIALS
// Use Env Vars for Production, fallback to UAT (Test) defaults
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || "PGTESTPAYUAT86";
const SALT_KEY = process.env.PHONEPE_SALT_KEY || "96434309-7796-489d-8924-ab56988a6076";
const SALT_INDEX = 1;
const PHONEPE_HOST_URL = process.env.PHONEPE_HOST_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox";

if (!process.env.PHONEPE_MERCHANT_ID) {
    console.warn("⚠️ PhonePe running in TEST MODE (UAT). Add PHONEPE_MERCHANT_ID for production.");
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

const verifyAndRedirect = async (merchantTransactionId: string, clientBaseUrl: string, res: Response) => {
    const result = await getPhonePeStatus(merchantTransactionId);
    const success = result.code === 'PAYMENT_SUCCESS';

    if (success) {
        await Order.findOneAndUpdate({ paymentId: merchantTransactionId }, { status: 'Paid' });
    }

    return res.redirect(paymentResultUrl(clientBaseUrl, result.code, merchantTransactionId));
};

// 1. INITIATE PAYMENT
router.post('/pay', auth, async (req: AuthRequest, res: Response) => {
    try {
        const { amount, items, shippingDetails } = req.body;
        const backendBaseUrl = getBackendBaseUrl(req as Request);
        const userId = req.user.id; // From auth middleware

        // Transaction ID must be unique
        const merchantTransactionId = `MT${Date.now()}`;

        // Create a Pending Order
        const newOrder = new Order({
            user: userId,
            items: items.map((item: any) => ({
                bookId: item.bookId,
                title: item.title,
                quantity: item.quantity,
                price: item.price
            })),
            totalAmount: amount, // Frontend sent amount (already processed if needed, but schema expects number)
            paymentId: merchantTransactionId,
            paymentMethod: 'PhonePe',
            status: 'Pending',
            shippingDetails: shippingDetails
        });

        await newOrder.save();

        const data = {
            merchantId: MERCHANT_ID,
            merchantTransactionId: merchantTransactionId,
            merchantUserId: userId,
            amount: Math.round(amount * 100), // Convert to Paise
            // Include the merchantTransactionId in redirect and callback so QR/code flows carry the txn id
            redirectUrl: `${backendBaseUrl}/api/phonepe/callback?merchantTransactionId=${merchantTransactionId}`,
            redirectMode: "POST",
            callbackUrl: `${backendBaseUrl}/api/phonepe/callback?merchantTransactionId=${merchantTransactionId}`,
            mobileNumber: shippingDetails?.phone || "9999999999",
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
            merchantTransactionId: merchantTransactionId
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
        console.log("🔔 PhonePe Callback Received (POST)");
        console.log("🔗 Query:", req.query);
        console.log("📚 Headers:", req.headers);

        // req.body may be a parsed object, a Buffer (when express.raw used), or a string
        console.log("📦 Raw Body (type):", Object.prototype.toString.call(req.body));

        // Safely extract the PhonePe `response` field from a variety of incoming body shapes
        let responseField: any = undefined;
        try {
            if (req.body === undefined || req.body === null) {
                responseField = undefined;
            } else if (Buffer.isBuffer(req.body)) {
                const asText = req.body.toString('utf-8');
                console.log("📦 Raw Buffer Body:", asText);
                try {
                    const parsed = JSON.parse(asText);
                    responseField = parsed.response ?? parsed?.request ?? undefined;
                } catch (e) {
                    // not JSON — maybe urlencoded key=value pairs
                    // attempt to find 'response=' substring
                    const match = asText.match(/response=([^&]+)/);
                    if (match) {
                        responseField = decodeURIComponent(match[1]);
                    }
                }
            } else if (typeof req.body === 'string') {
                console.log("📦 String Body:", req.body);
                try {
                    const parsed = JSON.parse(req.body);
                    responseField = parsed.response ?? parsed?.request ?? undefined;
                } catch (e) {
                    const match = req.body.match(/response=([^&]+)/);
                    if (match) {
                        responseField = decodeURIComponent(match[1]);
                    }
                }
            } else if (typeof req.body === 'object') {
                // Already parsed by express.json/urlencoded
                responseField = (req.body as any).response ?? (req.body as any).request ?? undefined;
            }
        } catch (err) {
            console.error('❌ Error while extracting body response:', err);
        }

        // ──────────────────────────────────────────────────────────────────
        // QR CODE / EMPTY BODY FALLBACK
        // When paying via QR code, PhonePe may redirect with an empty body
        // but includes the transactionId in the query string. We fall back
        // to the Status Check API to verify the payment.
        // ──────────────────────────────────────────────────────────────────
        if (!responseField) {
            console.warn("⚠️ No 'response' field in callback body. Attempting status check via query param or pending orders...");

            // PhonePe sometimes appends transactionId as a query param
            const txnId = req.query.transactionId as string
                || req.query.merchantTransactionId as string
                || (req.query && (req.query.txnId as string));

            if (txnId) {
                console.log(`🔍 Falling back to status check for txnId: ${txnId}`);
                return await verifyAndRedirect(txnId, clientBaseUrl, res);
            }

            // Last resort: redirect to a pending-orders verification page
            console.error("❌ Could not determine transaction ID from callback.");
            return res.redirect(`${clientBaseUrl}/orders?status=pending&reason=qr_callback`);
        }

        let data: any;
        try {
            // PhonePe sometimes wraps response as base64-encoded JSON
            if (typeof responseField === 'string') {
                // Try base64 decode
                try {
                    const decodedResponse = Buffer.from(responseField, 'base64').toString('utf-8');
                    data = JSON.parse(decodedResponse);
                    console.log("✅ Decoded PhonePe Data (from base64):", JSON.stringify(data, null, 2));
                } catch (e) {
                    // Not base64 JSON — attempt to parse directly
                    try {
                        data = JSON.parse(responseField as string);
                        console.log("✅ Parsed PhonePe Data (string JSON):", JSON.stringify(data, null, 2));
                    } catch (e2) {
                        // Give up — treat as opaque
                        data = { raw: responseField };
                        console.warn('⚠️ Response field could not be parsed as JSON. Preserving raw value.');
                    }
                }
            } else {
                data = responseField;
            }
        } catch (parseError) {
            console.error("❌ JSON Parse Error:", parseError);
            return res.redirect(`${clientBaseUrl}/cart?status=error&reason=parse_error`);
        }

        const { code } = data;
        const merchantTransactionId = data.merchantTransactionId
            || req.query.merchantTransactionId
            || req.query.transactionId
            || req.query.txnId;

        if (!merchantTransactionId) {
            console.error("❌ PhonePe callback had no transaction id.");
            return res.redirect(`${clientBaseUrl}/cart?status=error&reason=missing_transaction`);
        }

        if (code === 'PAYMENT_SUCCESS') {
            console.log(`💰 Payment Success for: ${merchantTransactionId}`);
            await Order.findOneAndUpdate(
                { paymentId: merchantTransactionId },
                { status: 'Paid' }
            );
            res.redirect(paymentResultUrl(clientBaseUrl, code, merchantTransactionId));
        } else {
            console.log(`⚠️ Payment Failed/Pending for: ${merchantTransactionId}, Code: ${code}`);
            await Order.findOneAndUpdate(
                { paymentId: merchantTransactionId },
                { status: 'Failed' }
            );
            res.redirect(paymentResultUrl(clientBaseUrl, code, merchantTransactionId));
        }

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
