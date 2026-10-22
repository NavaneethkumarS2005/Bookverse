import express, { Response } from 'express';
import mongoose from 'mongoose';
import Book from '../models/Book';
import Publisher from '../models/Publisher';
import { AuthRequest } from '../types';
import { auth } from '../middleware/auth';
import { admin } from '../middleware/admin';

const router = express.Router();
router.use(auth, admin);

router.get('/', async (req: AuthRequest, res: Response) => {
    const status = String(req.query.status || 'all');
    const query = status === 'all' ? {} : ['pending', 'approved', 'rejected'].includes(status) ? { applicationStatus: status } : null;
    if (!query) return res.status(400).json({ message: 'Status must be pending, approved, rejected, or all.' });
    const publishers = await Publisher.find(query).sort({ createdAt: -1 }).limit(100).lean();
    res.json(publishers);
});

router.get('/:id/books', async (req: AuthRequest, res: Response) => {
    if (!mongoose.isValidObjectId(String(req.params.id))) return res.status(404).json({ message: 'Publisher not found.' });
    const publisher = await Publisher.findById(req.params.id).select('_id');
    if (!publisher) return res.status(404).json({ message: 'Publisher not found.' });
    const books = await Book.find({ publisherId: publisher._id }).sort({ createdAt: -1 }).limit(100).lean();
    res.json(books);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
    if (!mongoose.isValidObjectId(String(req.params.id))) return res.status(404).json({ message: 'Publisher not found.' });
    const publisher = await Publisher.findById(req.params.id).lean();
    if (!publisher) return res.status(404).json({ message: 'Publisher not found.' });
    res.json(publisher);
});

router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
    const status = req.body?.status;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Status must be approved or rejected.' });
    const rejectionReason = typeof req.body?.rejectionReason === 'string' ? req.body.rejectionReason.trim() : '';
    if (status === 'rejected' && (!rejectionReason || rejectionReason.length > 500)) {
        return res.status(400).json({ message: 'Provide a rejection reason of at most 500 characters.' });
    }
    if (!mongoose.isValidObjectId(String(req.params.id))) return res.status(404).json({ message: 'Publisher not found.' });
    const publisher = await Publisher.findOne({ _id: req.params.id, applicationStatus: 'pending' });
    if (!publisher) return res.status(404).json({ message: 'Pending publisher application not found.' });

    publisher.applicationStatus = status;
    publisher.isActive = status === 'approved';
    publisher.isVerified = status === 'approved';
    publisher.reviewedBy = req.user.id;
    publisher.reviewedAt = new Date();
    publisher.rejectionReason = status === 'rejected' ? rejectionReason : undefined;
    await publisher.save();
    res.json({ message: `Publisher application ${status}.`, publisher });
});

router.patch('/:id/active', async (req: AuthRequest, res: Response) => {
    if (typeof req.body?.isActive !== 'boolean') return res.status(400).json({ message: 'isActive must be a boolean.' });
    if (!mongoose.isValidObjectId(String(req.params.id))) return res.status(404).json({ message: 'Publisher not found.' });
    const publisher = await Publisher.findOneAndUpdate(
        { _id: req.params.id, applicationStatus: 'approved' },
        { $set: { isActive: req.body.isActive } },
        { new: true, runValidators: true },
    );
    if (!publisher) return res.status(404).json({ message: 'Approved publisher not found.' });
    res.json({ message: `Publisher ${req.body.isActive ? 'activated' : 'deactivated'}.`, publisher });
});

router.patch('/books/:bookId/status', async (req: AuthRequest, res: Response) => {
    const status = req.body?.status;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Status must be approved or rejected.' });
    const rejectionReason = typeof req.body?.rejectionReason === 'string' ? req.body.rejectionReason.trim() : '';
    if (status === 'rejected' && (!rejectionReason || rejectionReason.length > 500)) {
        return res.status(400).json({ message: 'Provide a rejection reason of at most 500 characters.' });
    }
    if (!mongoose.isValidObjectId(String(req.params.bookId))) return res.status(404).json({ message: 'Book submission not found.' });
    const book = await Book.findOne({ _id: req.params.bookId, publisherOwnerId: { $exists: true }, publicationStatus: 'pending' });
    if (!book) return res.status(404).json({ message: 'Pending publisher book submission not found.' });
    if (status === 'approved') {
        const publisher = await Publisher.findOne({ _id: book.publisherId, applicationStatus: 'approved', isActive: { $ne: false } }).select('_id');
        if (!publisher) return res.status(409).json({ message: 'The owning publisher must be active and approved before this book can be approved.' });
        const initialStock = Number(req.body?.initialStock);
        if (!Number.isInteger(initialStock) || initialStock < 0 || initialStock > 1000000) {
            return res.status(400).json({ message: 'Provide an initial stock value between 0 and 1000000 to approve this book.' });
        }
        book.stock = initialStock;
        book.availability = initialStock > 0 ? 'In Stock' : 'Out of Stock';
    }
    book.publicationStatus = status;
    book.reviewedBy = req.user.id;
    book.reviewedAt = new Date();
    book.rejectionReason = status === 'rejected' ? rejectionReason : undefined;
    await book.save();
    res.json({ message: `Book submission ${status}.`, book });
});

export default router;