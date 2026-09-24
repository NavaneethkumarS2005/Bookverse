import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Book from '../models/Book.js';
import { generateEmbedding } from '../utils/embeddings.js';

// Load .env from the backend root (cwd when running `npx tsx src/scripts/...`)
dotenv.config({ path: path.join(process.cwd(), '.env') });

const backfillEmbeddings = async () => {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/bookverse';
        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('Connected.');

        const books = await Book.find({
            $or: [
                { embedding: { $exists: false } },
                { embedding: { $size: 0 } }
            ]
        });

        console.log(`Found ${books.length} books without embeddings.`);

        let processed = 0;
        for (const book of books) {
            const richText = `${book.title} by ${book.author}. Genres: ${(book.genres || []).join(', ')}. ${book.description || ''}`;
            const embedding = await generateEmbedding(richText);
            
            if (embedding && embedding.length > 0 && embedding.some(v => v !== 0)) {
                book.embedding = embedding;
                await book.save();
                processed++;
                console.log(`[${processed}/${books.length}] Generated embedding for: ${book.title}`);
            } else {
                console.error(`Failed to generate embedding for: ${book.title}`);
            }

            // Rate limiting sleep
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`Finished backfilling embeddings. Total processed: ${processed}`);
    } catch (error) {
        console.error('Error during backfill:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
};

// Run directly — this script is always invoked as an entry point
backfillEmbeddings();
