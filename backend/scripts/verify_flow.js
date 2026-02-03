const crypto = require('crypto');

const BASE_URL = 'http://localhost:5000';
const USER_EMAIL = `test_${Date.now()}@example.com`;
const USER_PASSWORD = 'password123';
const KEY_SECRET = 'YOUR_RAZORPAY_KEY_SECRET_HERE'; // Matching the .env placeholder

async function runTest() {
    console.log(`Starting verification for user: ${USER_EMAIL}`);

    // 1. Register
    console.log('\n--- 1. Registering User ---');
    let res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test User', email: USER_EMAIL, password: USER_PASSWORD })
    });
    console.log('Register Status:', res.status);
    let data = await res.json();
    console.log('Register Response:', data);

    // 2. Login
    console.log('\n--- 2. Logging In ---');
    res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD })
    });
    console.log('Login Status:', res.status);
    data = await res.json();
    console.log('Login Response:', data.message);
    const token = data.token;

    if (!token) {
        console.error('❌ Failed to get token. Aborting.');
        return;
    }

    // 3. Check Orders (Initial ID)
    console.log('\n--- 3. Fetching Initial Orders (Should be empty) ---');
    res = await fetch(`${BASE_URL}/api/orders`, {
        headers: { 'Authorization': token }
    });
    data = await res.json();
    console.log('Initial Orders:', data.length);


    // 4. Simulate Payment Verify (Create Order)
    console.log('\n--- 4. Simulating Payment Verification ---');

    // Create Valid Signature
    const orderId = 'order_test_123';
    const paymentId = 'pay_test_abc';
    const body = orderId + "|" + paymentId;
    const signature = crypto.createHmac('sha256', KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    const payload = {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        items: [{ id: 1, quantity: 1 }] // Buying "The Great Gatsby"
    };

    res = await fetch(`${BASE_URL}/api/payment/verify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        body: JSON.stringify(payload)
    });
    console.log('Verify Status:', res.status);
    data = await res.json();
    console.log('Verify Response:', data);

    if (data.success) {
        // 5. Check Orders Again
        console.log('\n--- 5. Fetching Orders After Purchase ---');
        res = await fetch(`${BASE_URL}/api/orders`, {
            headers: { 'Authorization': token }
        });
        data = await res.json();
        console.log('Updated Orders Count:', data.length);
        if (data.length > 0) {
            console.log('✅ Last Order Total:', data[0].totalAmount);
            console.log('✅ Verification SUCCEEDED');
        } else {
            console.error('❌ Order not persisted!');
        }
    } else {
        console.error('❌ Payment verification failed');
    }
}

runTest().catch(console.error);
