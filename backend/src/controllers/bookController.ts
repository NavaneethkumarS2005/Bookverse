import { Request, Response } from 'express';
import Book, { IBook } from '../models/Book';
import User from '../models/User';

const initialBooks = [
    { id: 1, title: "The Great Gatsby", author: "F. Scott Fitzgerald", price: 999, genre: "Fiction", image: "https://placehold.co/400x600/F87171/white?text=Great+Gatsby", rating: 4.5, reviews: 120 },
    { id: 2, title: "1984", author: "George Orwell", price: 850, genre: "Sci-Fi", image: "https://placehold.co/400x600/60A5FA/white?text=1984", rating: 4.8, reviews: 350 },
    { id: 3, title: "Dune", author: "Frank Herbert", price: 1450, genre: "Sci-Fi", image: "https://placehold.co/400x600/FBBF24/white?text=Dune", rating: 4.9, reviews: 410 },
    { id: 4, title: "Pride and Prejudice", author: "Jane Austen", price: 799, genre: "Classic", image: "https://placehold.co/400x600/34D399/white?text=Pride+Prejudice", rating: 4.6, reviews: 200 },
    { id: 5, title: "The Hobbit", author: "J.R.R. Tolkien", price: 1200, genre: "Fantasy", image: "https://placehold.co/400x600/A78BFA/white?text=The+Hobbit", rating: 5.0, reviews: 500 },
    { id: 6, title: "Sapiens", author: "Yuval Noah Harari", price: 1750, genre: "History", image: "https://placehold.co/400x600/F472B6/white?text=Sapiens", rating: 4.7, reviews: 180 },
    { id: 7, title: "Thinking, Fast and Slow", author: "Daniel Kahneman", price: 1100, genre: "Non-Fiction", image: "https://placehold.co/400x600/FCD34D/white?text=Thinking+Fast", rating: 4.6, reviews: 300 },
    { id: 8, title: "A Brief History of Time", author: "Stephen Hawking", price: 950, genre: "Science", image: "https://placehold.co/400x600/60A5FA/white?text=Brief+History", rating: 4.8, reviews: 450 },
    { id: 9, title: "Silent Spring", author: "Rachel Carson", price: 890, genre: "Non-Fiction", image: "https://placehold.co/400x600/34D399/white?text=Silent+Spring", rating: 4.4, reviews: 150 },
    { id: 10, title: "External Link Demo", author: "Demo User", price: 0, genre: "Non-Fiction", image: "https://placehold.co/400x600/ccc/white?text=External+Link", rating: 5.0, reviews: 0, buyLink: "https://google.com" },

    // NEW BOOKS (Non-Fiction)
    { id: 11, title: "Atomic Habits", author: "James Clear", price: 0, genre: "Non-Fiction", image: "https://placehold.co/400x600/ef4444/white?text=Atomic+Habits", rating: 4.9, reviews: 800, buyLink: "https://www.flipkart.com/atomic-habits-easy-proven-way-build-good-break-bad/p/itmfcyurt9pfakjh?pid=9781847941831" },
    { id: 12, title: "Educated", author: "Tara Westover", price: 720, genre: "Non-Fiction", image: "https://placehold.co/400x600/f59e0b/white?text=Educated", rating: 4.7, reviews: 600 },
    { id: 13, title: "Becoming", author: "Michelle Obama", price: 900, genre: "Non-Fiction", image: "https://placehold.co/400x600/3b82f6/white?text=Becoming", rating: 4.8, reviews: 1000 },

    // NEW BOOKS (Fiction)
    { id: 14, title: "The Alchemist", author: "Paulo Coelho", price: 0, genre: "Fiction", image: "https://placehold.co/400x600/eab308/white?text=Alchemist", rating: 4.8, reviews: 900, buyLink: "https://www.flipkart.com/alchemist-journey-dreams-tale-destiny-courage/p/itmfc9jxsc7dckfm?pid=9788172234980" },

    { id: 15, title: "Harry Potter", author: "J.K. Rowling", price: 1200, genre: "Fantasy", image: "https://placehold.co/400x600/ec4899/white?text=Harry+Potter", rating: 4.9, reviews: 2000 },
    { id: 16, title: "The Catcher in the Rye", author: "J.D. Salinger", price: 550, genre: "Fiction", image: "https://placehold.co/400x600/6366f1/white?text=Catcher+Rye", rating: 4.2, reviews: 400 }
];

export const seedDatabase = async () => {
    try {
        const count = await Book.countDocuments();
        if (count < initialBooks.length) {
            console.log('🌱 Database missing some data. Seeding/Updating books...');
            await Book.deleteMany({});
            await Book.insertMany(initialBooks);
            console.log('✅ Books seeded successfully!');
        } else {
            console.log(`ℹ️ Database has ${count} books. checks passed.`);
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
        let book = await Book.findOne({ id: id });
        if (!book) {
            book = await Book.findById(id);
        }
        if (!book) return res.status(404).json({ message: 'Book not found' });
        res.json(book);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};
