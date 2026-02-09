const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const auth = require('../middleware/auth'); // Optional: if you want to protect payment

// PHONEPE TEST CREDENTIALS (UAT)
const MERCHANT_ID = "PGTESTPAYUAT86";
const SALT_KEY = "96434309-7796-489d-8924-ab56988a6076";
const SALT_INDEX = 1;
const PHONEPE_HOST_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

// 1. INITIATE PAYMENT
const Order = require('../models/Order');

// 1. INITIATE PAYMENT
router.post('/pay', auth, async (req, res) => {
    try {
        const { amount, items, shippingDetails } = req.body;
        const userId = req.user.id; // From auth middleware

        // Transaction ID must be unique
        const merchantTransactionId = `MT${Date.now()}`;

        // Create a Pending Order
        const newOrder = new Order({
            user: userId,
            items: items.map(item => ({
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

    } catch (error) {
        console.error("PhonePe Error:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "PhonePe API Error"
        });
    }
});

// 2. CALLBACK / REDIRECT HANDLER
router.post('/callback', async (req, res) => {
    try {
        const { code, merchantTransactionId } = req.body;

        if (code === 'PAYMENT_SUCCESS') {
            // Update Order to Paid
            await Order.findOneAndUpdate(
                { paymentId: merchantTransactionId },
                { status: 'Paid' }
            );
            res.redirect(`${CLIENT_URL}/orders?status=success`);
        } else {
            // Update Order to Failed
            await Order.findOneAndUpdate(
                { paymentId: merchantTransactionId },
                { status: 'Failed' }
            );
            res.redirect(`${CLIENT_URL}/cart?status=failure`);
        }

    } catch (error) {
        console.error("Callback Error:", error.message);
        res.redirect(`${CLIENT_URL}/cart?status=error`);
    }
});

// 3. CHECK STATUS (Frontend calls this to verify after coming back)
router.get('/status/:txnId', async (req, res) => {
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

    } catch (error) {
        console.error("PhonePe Status Error:", error.message);
        res.status(500).json({ success: false, message: 'Error checking status' });
    }
});

module.exports = router;
