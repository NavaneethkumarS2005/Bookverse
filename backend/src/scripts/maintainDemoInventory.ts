import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Book from '../models/Book';
import { getDemoInventoryMaintenanceAction } from '../utils/catalogFulfillment';

dotenv.config();

const argumentsList = process.argv.slice(2);
const apply = argumentsList.includes('--apply');
const confirmed = argumentsList.includes('--confirm');
const stockArgument = argumentsList.find((argument) => argument.startsWith('--stock='));
const demoStock = stockArgument ? Number(stockArgument.slice('--stock='.length)) : Number.NaN;

const printUsage = () => {
    console.log('Usage: npm run inventory:maintain -- --stock=<non-negative integer> [--apply --confirm]');
    console.log('Without --apply --confirm this performs a dry run only.');
};

const run = async () => {
    if (!Number.isInteger(demoStock) || demoStock < 0) {
        printUsage();
        process.exitCode = 1;
        return;
    }

    if (apply && !confirmed) {
        console.error('Refusing to write: --apply requires --confirm.');
        process.exitCode = 1;
        return;
    }

    const report = { matched: 0, wouldUpdate: 0, updated: 0, skipped: 0, failed: 0, external: 0, unclassified: 0 };
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bookverse');

    try {
        const books = await Book.find({}).select('_id id fulfillment stock title').lean();
        for (const book of books) {
            const action = getDemoInventoryMaintenanceAction(book);
            if (action === 'skip-external') {
                report.external += 1;
                continue;
            }
            if (action === 'skip-unclassified') {
                report.unclassified += 1;
                continue;
            }

            report.matched += 1;
            if (action !== 'update-missing-stock') {
                report.skipped += 1;
                continue;
            }

            report.wouldUpdate += 1;
            if (!apply) continue;
            try {
                const result = await Book.updateOne(
                    { _id: book._id, stock: { $exists: false } },
                    { $set: { stock: demoStock, availability: demoStock > 0 ? 'In Stock' : 'Out of Stock', fulfillment: 'internal' } }
                );
                if (result.modifiedCount === 1) report.updated += 1;
                else report.skipped += 1;
            } catch {
                report.failed += 1;
            }
        }
    } finally {
        await mongoose.disconnect();
    }

    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', demoStock, ...report }));
};

run().catch((error: unknown) => {
    console.error('Demo inventory maintenance failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exitCode = 1;
});
