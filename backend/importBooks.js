const https = require('https');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const Book = require('./models/Book');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bookverse';

// Google Books API URL
const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes?q=harry+potter&maxResults=10&langRestrict=en';

function fetchBooks() {
    return new Promise((resolve, reject) => {
        https.get(GOOGLE_BOOKS_API, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => reject(err));
    });
}

async function importBooks() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🌍 Fetching from Google Books API...');
        const data = await fetchBooks();

        if (!data.items) {
            console.log('❌ No items found.');
            return;
        }

        const booksToInsert = [];
        // Get current count for ID generation
        const startId = await Book.countDocuments() + 100; // Offset to avoid conflicts

        data.items.forEach((item, index) => {
            const vol = item.volumeInfo;
            const sale = item.saleInfo;

            // Only add if we have an image
            if (vol.imageLinks && vol.imageLinks.thumbnail) {
                const book = {
                    id: startId + index,
                    title: vol.title,
                    author: vol.authors ? vol.authors[0] : 'Unknown',
                    // Use listPrice if available, otherwise generate random price between 500-1500
                    price: sale.listPrice ? Math.round(sale.listPrice.amount) : Math.floor(Math.random() * 1000) + 500,
                    genre: 'Fantasy', // Hardcoded for Harry Potter
                    image: vol.imageLinks.thumbnail.replace('http:', 'https:'), // Ensure HTTPS
                    buyLink: vol.infoLink, // Direct link to Google Books page
                    rating: vol.averageRating || 4.5,
                    reviews: vol.ratingsCount || 100
                };
                booksToInsert.push(book);
            }
        });

        if (booksToInsert.length > 0) {
            await Book.insertMany(booksToInsert);
            console.log(`✅ Successfully imported ${booksToInsert.length} Harry Potter books!`);
        } else {
            console.log('⚠️ No valid books found to import.');
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected');
    }
}

importBooks();
