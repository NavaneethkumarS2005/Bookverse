const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    id: { type: Number, required: true }, // Keeping numerical ID for compatibility with frontend logic
    title: { type: String, required: true },
    author: { type: String, required: true },
    price: { type: Number, required: true },
    genre: { type: String, required: true },
    image: { type: String },
    buyLink: { type: String }, // External URL for purchasing
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Book', bookSchema);
