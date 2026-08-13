import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Author from '../models/Author';
import Publisher from '../models/Publisher';
import UpcomingBook from '../models/UpcomingBook';
import BookFair from '../models/BookFair';
import Booth from '../models/Booth';
import Book from '../models/Book';

const findByIdOr404 = async (model: any, id: string, res: Response) => {
    const item = await model.findById(id);
    if (!item) {
        res.status(404).json({ message: 'Discovery item not found' });
        return null;
    }
    return item;
};

export const getAuthors = async (req: Request, res: Response) => {
    try {
        const { keyword, language, genre, classification } = req.query;
        const query: any = {};
        if (keyword) query.$or = [{ name: { $regex: keyword, $options: 'i' } }, { bio: { $regex: keyword, $options: 'i' } }];
        if (language) query.language = { $in: [String(language)] };
        if (genre) query.genres = { $in: [String(genre)] };
        if (classification) query.classification = String(classification);
        const authors = await Author.find(query).sort({ isFeatured: -1, createdAt: -1 }).limit(20);
        res.json(authors);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPublishers = async (req: Request, res: Response) => {
    try {
        const { keyword, language, genre } = req.query;
        const query: any = {};
        if (keyword) query.$or = [{ name: { $regex: keyword, $options: 'i' } }, { description: { $regex: keyword, $options: 'i' } }];
        if (language) query.genres = { $in: [String(language)] };
        if (genre) query.genres = { $in: [String(genre)] };
        const publishers = await Publisher.find(query).sort({ isFeatured: -1, createdAt: -1 }).limit(20);
        res.json(publishers);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getUpcomingBooks = async (req: Request, res: Response) => {
    try {
        const { keyword, language, genre, author, publisher, sort = 'publicationDate' } = req.query;
        const query: any = {};
        if (keyword) query.$or = [{ title: { $regex: keyword, $options: 'i' } }, { description: { $regex: keyword, $options: 'i' } }, { 'metadata.teaser': { $regex: keyword, $options: 'i' } }];
        if (language) query.language = String(language);
        if (genre) query.genres = { $in: [String(genre)] };
        if (author && mongoose.isValidObjectId(String(author))) query.authorId = String(author);
        if (publisher && mongoose.isValidObjectId(String(publisher))) query.publisherId = String(publisher);

        const sortMap: Record<string, any> = {
            releaseDate: { expectedReleaseDate: 1 },
            publicationDate: { expectedReleaseDate: 1 },
            newest: { createdAt: -1 },
            price: { price: 1 },
            popularity: { isFeatured: -1, createdAt: -1 }
        };

        const books = await UpcomingBook.find(query)
            .populate('authorId', 'name avatarUrl photo')
            .populate('publisherId', 'name logoUrl logo')
            .sort(sortMap[String(sort)] || sortMap.releaseDate)
            .limit(30);
        res.json(books);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getBookFairs = async (req: Request, res: Response) => {
    try {
        const { keyword, city, status } = req.query;
        const query: any = {};
        if (keyword) query.$or = [{ name: { $regex: keyword, $options: 'i' } }, { description: { $regex: keyword, $options: 'i' } }, { 'location.city': { $regex: keyword, $options: 'i' } }];
        if (city) query['location.city'] = { $regex: city, $options: 'i' };
        if (status) query.status = String(status);
        const fairs = await BookFair.find(query).sort({ startDate: 1 }).limit(30);
        res.json(fairs);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getBooths = async (req: Request, res: Response) => {
    try {
        const { fairId, publisherId } = req.query;
        const query: any = {};
        if (fairId) query.fairId = fairId;
        if (publisherId) query.publisherId = publisherId;
        const booths = await Booth.find(query).populate('fairId').populate('publisherId').sort({ createdAt: -1 });
        res.json(booths);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAuthorById = async (req: Request, res: Response) => {
    try {
        const author = await findByIdOr404(Author, String(req.params.id), res);
        if (!author) return;
        const books = await Book.find({ $or: [{ authorId: author._id }, { author: new RegExp(`^${author.name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i') }] }).limit(30);
        res.json({ ...author.toObject(), books });
    } catch (error: any) { res.status(400).json({ message: error.message }); }
};

export const getPublisherById = async (req: Request, res: Response) => {
    try {
        const publisher = await findByIdOr404(Publisher, String(req.params.id), res);
        if (!publisher) return;
        const books = await Book.find({ $or: [{ publisherId: publisher._id }, { publisher: new RegExp(`^${publisher.name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i') }] }).limit(30);
        res.json({ ...publisher.toObject(), books });
    } catch (error: any) { res.status(400).json({ message: error.message }); }
};

export const getBookFairById = async (req: Request, res: Response) => {
    try {
        const fair = await findByIdOr404(BookFair, String(req.params.id), res);
        if (!fair) return;
        const booths = await Booth.find({ fairId: fair._id }).populate('publisherId').sort({ boothNumber: 1 });
        res.json({ ...fair.toObject(), booths });
    } catch (error: any) { res.status(400).json({ message: error.message }); }
};

export const getBoothById = async (req: Request, res: Response) => {
    try {
        const booth = await Booth.findById(req.params.id).populate('fairId').populate('publisherId');
        if (!booth) return res.status(404).json({ message: 'Booth not found' });
        const featuredIds = (booth.featuredBooks || []).map(String);
        const objectIds = featuredIds.filter((id) => mongoose.isValidObjectId(id));
        const books = await Book.find({ $or: [
            ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
            ...(featuredIds.length ? [{ id: { $in: featuredIds } }] : [])
        ] });
        res.json({ ...booth.toObject(), books });
    } catch (error: any) { res.status(400).json({ message: error.message }); }
};

export const searchDiscovery = async (req: Request, res: Response) => {
    try {
        const term = String(req.query.q || '').trim();
        if (term.length < 2) return res.status(400).json({ message: 'q must contain at least 2 characters' });
        const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const [books, authors, publishers, upcomingBooks, fairs] = await Promise.all([
            Book.find({ $or: [{ title: regex }, { author: regex }, { publisher: regex }, { genre: regex }] }).limit(8),
            Author.find({ $or: [{ name: regex }, { bio: regex }, { genres: regex }] }).limit(8),
            Publisher.find({ $or: [{ name: regex }, { description: regex }, { genres: regex }] }).limit(8),
            UpcomingBook.find({ $or: [{ title: regex }, { description: regex }, { 'metadata.teaser': regex }] }).populate('authorId', 'name').populate('publisherId', 'name').limit(8),
            BookFair.find({ $or: [{ name: regex }, { 'location.city': regex }, { description: regex }] }).limit(8)
        ]);
        res.json({ query: term, books, authors, publishers, upcomingBooks, fairs });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
};
