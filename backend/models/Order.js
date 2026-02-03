const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        bookId: { type: Object, required: true }, // Store original book ID (could be number or string depending on Book model)
        title: { type: String, required: true },
        quantity: { type: Number, required: true, default: 1 },
        price: { type: Number, required: true }
    }],
    totalAmount: { type: Number, required: true },
    paymentId: { type: String, required: true }, // Razorpay Payment ID or 'COD'
    paymentMethod: { type: String, default: 'Razorpay' },
    status: { type: String, default: 'Paid' },
    shippingDetails: {
        address: { type: String },
        city: { type: String },
        zip: { type: String },
        phone: { type: String }
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
