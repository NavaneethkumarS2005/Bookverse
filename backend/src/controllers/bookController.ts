import { Request, Response } from 'express';
import Book, { IBook } from '../models/Book';
import User from '../models/User';

import { seedBooks } from '../data/seedBooks';

export const seedDatabase = async () => {
    try {
        const count = await Book.countDocuments();
        // Always seed if current count is significantly less than the new seed data size
        // ensuring we didn't just accidentally wipe it.
        // For this task: Force Reseed to ensure all 53+ books are present.

        console.log(`Checking database... Found ${count} books.`);

        if (count < seedBooks.length) {
            console.log('🌱 Database missing some data. performing full re-seed...');
            await Book.deleteMany({});
            await Book.insertMany(seedBooks);
            console.log(`✅ ${seedBooks.length} Books seeded successfully!`);
        } else {
            console.log(`ℹ️ Database has ${count} books. Checks passed.`);
            // Optional: Upsert to ensure specific keys (like buyLink) are present on existing books if we didn't delete
            // But deleting is safer to ensure clean state
        }
    } catch (err) {
        console.error('❌ Error seeding database:', err);
    }
};

export const seedAdmin = async () => {
    try {
        const adminEmail = "admin@bookverse.com";
        const existingAdmin = await User.findOne({ email: adminEmail });
        if (!existingAdmin) {
            const newAdmin = new User({
                name: "Admin User",
                email: adminEmail,
                password: "admin123", // In a real app, hash this!
                role: "admin"
            });
            await newAdmin.save();
            console.log("👑 Default Admin Created: admin@bookverse.com / admin123");
        }
    } catch (err) {
        console.error("Admin Seed Error:", err);
    }
}

export const ensureCorrectData = async () => {
    try {
        // Update Atomic Habits (Upsert to ensure it exists)
        const atomicHabitsData = {
            id: 11, title: "Atomic Habits", author: "James Clear", price: 0, genre: "Non-Fiction", image: "https://placehold.co/400x600/ef4444/white?text=Atomic+Habits", rating: 4.9, reviews: 800,
            buyLink: "https://www.flipkart.com/atomic-habits-easy-proven-way-build-good-break-bad/p/itmfcyurt9pfakjh?pid=9781847941831"
        };
        await Book.updateOne({ title: "Atomic Habits" }, { $set: atomicHabitsData }, { upsert: true });

        // Re-add The Alchemist if missing, or update it
        const alchemistData = {
            id: 14, title: "The Alchemist", author: "Paulo Coelho", price: 0, genre: "Fiction", image: "https://placehold.co/400x600/eab308/white?text=Alchemist", rating: 4.8, reviews: 900,
            buyLink: "https://www.flipkart.com/alchemist-journey-dreams-tale-destiny-courage/p/itmfc9jxsc7dckfm?pid=9788172234980"
        };
        await Book.updateOne({ title: "The Alchemist" }, { $set: alchemistData }, { upsert: true });

        console.log("🔥 Updated 'Atomic Habits' and restored 'The Alchemist' with Flipkart links.");
    } catch (err) {
        console.error("Error ensuring correct data:", err);
    }
};

export const getBooks = async (req: Request, res: Response) => {
    try {
        const { keyword, category, minPrice, maxPrice, rating, sort, page = 1, limit = 10 } = req.query;

        const query: any = {};

        // 1. Search (Title or Author)
        if (keyword) {
            const regex = new RegExp(keyword as string, 'i');
            query.$or = [
                { title: regex },
                { author: regex }
            ];
        }

        // 2. Filter by Category
        if (category && category !== 'All') {
            query.genre = category; // Note: Frontend sends 'category', DB uses 'genre'
        }

        // 3. Filter by Price
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        // 4. Filter by Rating
        if (rating) {
            query.rating = { $gte: Number(rating) };
        }

        // 5. Pagination
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        // 6. Sorting
        let sortOption: any = {};
        if (sort === 'price_asc') sortOption.price = 1;
        else if (sort === 'price_desc') sortOption.price = -1;
        else if (sort === 'rating') sortOption.rating = -1;
        else if (sort === 'newest') sortOption.id = -1; // Assuming higher ID = newer, or use createdAt if available
        else sortOption.id = -1; // Default

        const books = await Book.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(limitNum);

        const total = await Book.countDocuments(query);

        res.json({
            books,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum)
        });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

export const addBook = async (req: Request, res: Response) => {
    try {
        const count = await Book.countDocuments();
        const newBook = new Book({
            ...req.body,
            id: count + 1 + Date.now()
        });
        const savedBook = await newBook.save();
        res.status(201).json(savedBook);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
};

export const deleteBook = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Try finding by internal id first, then _id
        let book = await Book.findOne({ id: id });
        if (!book) {
            book = await Book.findById(id);
        }

        if (!book) return res.status(404).json({ message: 'Book not found' });

        await Book.deleteOne({ _id: book._id });
        res.json({ message: 'Book deleted successfully' });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

export const getBookById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        let book;

        // 1. If it's a valid MongoDB ObjectId, try findById first
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            book = await Book.findById(id);
        }

        // 2. If not found (or not an ObjectId), try legacy numeric ID
        if (!book && !isNaN(Number(id))) {
            book = await Book.findOne({ id: id });
        }

        if (!book) return res.status(404).json({ message: 'Book not found' });
        res.json(book);
    } catch (err: any) {
        console.error("Error in getBookById:", err);
        res.status(500).json({ message: err.message });
    }
};
