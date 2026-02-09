const Book = require('../models/Book');
const Order = require('../models/Order');
const Stripe = require('stripe');
const sendEmail = require('../utils/emailService');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.createPaymentIntent = async (req, res) => {
    try {
        const { items } = req.body;
        if (!items || !items.length) return res.status(400).json({ message: 'No items provided' });

        let totalAmount = 0;
        for (const item of items) {
            const book = await Book.findOne({ id: item.bookId });
            if (!book) return res.status(404).json({ message: `Book ${item.bookId || 'unknown'} not found` });
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

exports.saveOrder = async (req, res) => {
    try {
        const { paymentIntentId, items, paymentMethod, shippingDetails } = req.body;
        let status = 'Paid';
        let paymentId = paymentIntentId;

        if (paymentMethod !== 'COD') {
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
            const book = await Book.findOne({ id: item.bookId });
            if (book) {
                totalAmount += book.price * (item.quantity || 1);
                orderItems.push({
                    bookId: book.id,
                    title: book.title,
                    quantity: item.quantity || 1,
                    price: book.price
                });
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

        // Send Order Confirmation Email
        const { orderTemplate } = require('../utils/emailTemplates');

        // Send Order Confirmation Email
        await sendEmail(
            req.user.email,
            "Order Confirmation - BookVerse",
            orderTemplate(newOrder._id.toString(), orderItems, totalAmount)
        );

        res.json({ success: true, message: 'Order Saved', orderId: newOrder._id });
    } catch (err) {
        console.error("Save Order Error:", err);
        res.status(500).json({ message: 'Error saving order' });
    }
};

exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching orders' });
    }
};
