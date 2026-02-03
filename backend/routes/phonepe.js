const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const { auth } = require('../middleware/auth'); // Optional: if you want to protect payment

// PHONEPE TEST CREDENTIALS (UAT)
const MERCHANT_ID = "PGTESTPAYUAT86";
const SALT_KEY = "96434309-7796-489d-8924-ab56988a6076";
const SALT_INDEX = 1;
const PHONEPE_HOST_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";

// 1. INITIATE PAYMENT
router.post('/pay', async (req, res) => {
    try {
        const { amount, userId } = req.body;

        // Transaction ID must be unique
        const merchantTransactionId = `MT${Date.now()}`;

        // Amount should be in Paise (INR * 100) NOT already converted by frontend if passed as INR
        // If frontend passes 500 (INR), we simply use it. Assuming frontend passes INR.
        // PhonePe expects Paise: 10 INR = 1000 Paise

        const data = {
            merchantId: MERCHANT_ID,
            merchantTransactionId: merchantTransactionId,
            merchantUserId: userId || 'MUID123',
            amount: Math.round(amount * 100), // Ensure it is an INTEGER (Paise)
            redirectUrl: `http://localhost:5000/api/phonepe/callback`, // Route to backend first
            redirectMode: "POST",
            callbackUrl: `http://localhost:5000/api/phonepe/callback`, // S2S callback
            mobileNumber: "9999999999",
            paymentInstrument: {
                type: "PAY_PAGE"
            }
        };

        const payload = JSON.stringify(data);
        const payloadMain = Buffer.from(payload).toString('base64');

        // X-VERIFY Header: SHA256(base64Payload + "/pg/v1/pay" + saltKey) + ### + saltIndex
        const stringToHash = payloadMain + "/pg/v1/pay" + SALT_KEY;
        const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
        const checksum = sha256 + '###' + SALT_INDEX;

        // Note: For Redirect Flow, we don't necessarily need to call the API from backend to get the link.
        // We can just return the payload and checksum to frontend, and frontend posts a form.
        // HOWEVER, PhonePe recommends calling the API to get the redirect URL directly.

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

        // Send the Redirect URL back to frontend
        // Frontend should redirect window.location.href = response.data.data.instrumentResponse.redirectInfo.url
        res.json({
            success: true,
            url: response.data.data.instrumentResponse.redirectInfo.url,
            merchantTransactionId: merchantTransactionId
        });

    } catch (error) {
        console.error("PhonePe Error:", error.response ? JSON.stringify(error.response.data) : error.message);
        res.status(500).json({
            success: false,
            message: error.message || "PhonePe API Error",
            details: error.response ? error.response.data : null
        });
    }
});

// 2. CALLBACK / REDIRECT HANDLER
router.post('/callback', async (req, res) => {
    try {
        // PhonePe sends response in body.code, body.message etc.
        // For 'POST' redirectMode, it comes in body.

        if (req.body.code === 'PAYMENT_SUCCESS') {
            // Redirect to Frontend Success Page
            res.redirect('http://localhost:5173/orders?status=success');
        } else {
            // Redirect to Frontend Failure Page
            res.redirect('http://localhost:5173/cart?status=failure');
        }

    } catch (error) {
        console.error("Callback Error:", error.message);
        res.redirect('http://localhost:5173/cart?status=error');
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
            res.json({ success: true, message: 'Payment Successful', data: response.data });
        } else {
            res.json({ success: false, message: 'Payment Failed or Pending', data: response.data });
        }

    } catch (error) {
        console.error("PhonePe Status Error:", error.message);
        res.status(500).json({ success: false, message: 'Error checking status' });
    }
});

module.exports = router;
