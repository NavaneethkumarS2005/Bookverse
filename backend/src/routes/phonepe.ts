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

const CLIENT_URL = process.env.CLIENT_URL || "https://book-vers.netlify.app";
const BACKEND_URL = process.env.BACKEND_URL || "https://bookverse-backend-gw75.onrender.com";

// 1. INITIATE PAYMENT
router.post('/pay', auth, async (req: AuthRequest, res: Response) => {
    try {
        const { amount, items, shippingDetails } = req.body;
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
            redirectUrl: `${BACKEND_URL}/api/phonepe/callback`,
            redirectMode: "POST",
            callbackUrl: `${BACKEND_URL}/api/phonepe/callback`,
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
// Handle GET Request (Manual visit or redirect issues) - Redirect to Home/Cart
router.get('/callback', (req: Request, res: Response) => {
    console.warn("⚠️ Manual GET request to /phonepe/callback. Redirecting to frontend.");
    res.redirect(`${CLIENT_URL}/cart`);
});

router.post('/callback', async (req: Request, res: Response) => {
    try {
        console.log("🔔 PhonePe Callback Received (POST)");
        const { response } = req.body;

        if (!response) {
            console.error("❌ No response in callback body. Body:", req.body);
            // If body is empty, it might be a parsing issue or wrong content-type
            return res.redirect(`${CLIENT_URL}/cart?status=error&reason=no_body`);
        }

        let data;
        try {
            const decodedResponse = Buffer.from(response, 'base64').toString('utf-8');
            data = JSON.parse(decodedResponse);
            console.log("✅ Decoded PhonePe Data:", JSON.stringify(data, null, 2));
        } catch (parseError) {
            console.error("❌ JSON Parse Error:", parseError);
            return res.redirect(`${CLIENT_URL}/cart?status=error&reason=parse_error`);
        }

        const { code, merchantTransactionId } = data;

        if (code === 'PAYMENT_SUCCESS') {
            console.log(`💰 Payment Success for: ${merchantTransactionId}`);
            await Order.findOneAndUpdate(
                { paymentId: merchantTransactionId },
                { status: 'Paid' }
            );
            res.redirect(`${CLIENT_URL}/orders?status=success`);
        } else {
            console.log(`⚠️ Payment Failed/Pending for: ${merchantTransactionId}, Code: ${code}`);
            await Order.findOneAndUpdate(
                { paymentId: merchantTransactionId },
                { status: 'Failed' }
            );
            res.redirect(`${CLIENT_URL}/cart?status=failure`);
        }

    } catch (error: any) {
        console.error("Callback Fatal Error:", error.message);
        res.redirect(`${CLIENT_URL}/cart?status=error&reason=exception`);
    }
});

// 3. CHECK STATUS (Frontend calls this to verify after coming back)
router.get('/status/:txnId', async (req: Request, res: Response) => {
    try {
        const merchantTransactionId = req.params.txnId;
        const merchantId = MERCHANT_ID;

        const stringToHash = `/pg/v1/status/${merchantId}/${merchantTransactionId}` + SALT_KEY;
        const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
        const checksum = sha256 + '###' + SALT_INDEX;

        const options = {
            method: 'GET',
            url: `${PHONEPE_HOST_URL}/pg/v1/status/${merchantId}/${merchantTransactionId}`,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': checksum,
                'X-MERCHANT-ID': merchantId
            }
        };

        const response = await axios.request(options);

        if (response.data.code === 'PAYMENT_SUCCESS') {
            await Order.findOneAndUpdate(
                { paymentId: merchantTransactionId },
                { status: 'Paid' }
            );
            res.json({ success: true, message: 'Payment Successful', data: response.data });
        } else {
            await Order.findOneAndUpdate(
                { paymentId: merchantTransactionId },
                { status: 'Failed' }
            );
            res.json({ success: false, message: 'Payment Failed or Pending', data: response.data });
        }

    } catch (error: any) {
        console.error("PhonePe Status Error:", error.message);
        res.status(500).json({ success: false, message: 'Error checking status' });
    }
});

export default router;
