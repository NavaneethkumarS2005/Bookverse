import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Author from '../models/Author.js';
import Publisher from '../models/Publisher.js';
import UpcomingBook from '../models/UpcomingBook.js';
import BookFair from '../models/BookFair.js';
import Booth from '../models/Booth.js';
import Book from '../models/Book.js';
import { publicBookFilter, publicBoothFilter, publicPublisherFilter } from '../utils/catalogVisibility.js';
import { computeFairStatus, fetchOpenLibraryAuthorWorks } from '../services/discoveryLiveService.js';
import { VERIFIED_INDUSTRY_RESOURCES } from '../data/industryGuideResources.js';

const findByIdOr404 = async (model: any, id: string, res: Response) => {
    if (!mongoose.isValidObjectId(id)) {
        res.status(404).json({ message: 'Discovery item not found' });
        return null;
    }
    const item = await model.findById(id);
    if (!item) {
        res.status(404).json({ message: 'Discovery item not found' });
        return null;
    }
    return item;
};

export const getAuthors = async (req: Request, res: Response) => {
    try {
        const { keyword, language, genre } = req.query;
        const query: any = {};
        if (keyword) query.$or = [{ name: { $regex: keyword, $options: 'i' } }, { bio: { $regex: keyword, $options: 'i' } }];
        if (language) query.language = { $in: [String(language)] };
        if (genre) query.genres = { $in: [String(genre)] };
        const authors = await Author.find(query).sort({ isFeatured: -1, createdAt: -1 }).limit(30);
        res.json(authors);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPublishers = async (req: Request, res: Response) => {
    try {
        const { keyword, genre } = req.query;
        const query: any = {};
        if (keyword) query.$or = [{ name: { $regex: keyword, $options: 'i' } }, { description: { $regex: keyword, $options: 'i' } }];
        if (genre) query.genres = { $in: [String(genre)] };
        const publishers = await Publisher.find({ $and: [query, publicPublisherFilter()] })
            .select('_id name publisherSlug description logoUrl logo establishedYear headquarters country website isVerified isFeatured genres stats createdAt')
            .sort({ isFeatured: -1, isVerified: -1, createdAt: -1 }).limit(30);
        res.json(publishers);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getUpcomingBooks = async (req: Request, res: Response) => {
    try {
        const { keyword, language, genre, author, publisher, sort = 'releaseDate' } = req.query;
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
            .populate('authorId', 'name avatarUrl photo nationality genres')
            .populate({ path: 'publisherId', match: publicPublisherFilter(), select: 'name logoUrl logo website country' })
            .sort(sortMap[String(sort)] || sortMap.releaseDate)
            .limit(40);
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
        
        const rawFairs = await BookFair.find(query).sort({ startDate: 1 }).limit(40);
        const fairs = rawFairs.map(fair => {
            const fairObj = fair.toObject();
            fairObj.status = computeFairStatus(fair.startDate, fair.endDate);
            return fairObj;
        });

        const filtered = status && status !== 'All'
            ? fairs.filter(fair => fair.status === status)
            : fairs;

        res.json(filtered);
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
        const booths = await Booth.find({ $and: [query, await publicBoothFilter()] })
            .populate('fairId')
            .populate({ path: 'publisherId', match: publicPublisherFilter(), select: '_id name publisherSlug logoUrl logo website isVerified headquarters' })
            .sort({ createdAt: -1 });
        res.json(booths);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAuthorById = async (req: Request, res: Response) => {
    try {
        const author = await findByIdOr404(Author, String(req.params.id), res);
        if (!author) return;
        const escapedName = author.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const books = await Book.find(await publicBookFilter({ $or: [{ authorId: author._id }, { author: new RegExp(`^${escapedName}$`, 'i') }] })).limit(30);

        // Fetch associated genuine Open Library works if available
        let externalWorks: any[] = [];
        const authorKey = (author as any).openLibraryKey || author.metadata?.openLibraryKey;
        if (authorKey) {
            externalWorks = await fetchOpenLibraryAuthorWorks(authorKey);
        }

        res.json({
            ...author.toObject(),
            books,
            externalWorks: externalWorks.map(w => ({ ...w, isExternalCatalog: true }))
        });
    } catch (error: any) { res.status(400).json({ message: error.message }); }
};

export const getPublisherById = async (req: Request, res: Response) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: 'Discovery item not found' });
        }
        const publisher = await Publisher.findOne({ _id: req.params.id, ...publicPublisherFilter() })
            .select('_id name publisherSlug description logoUrl logo establishedYear headquarters country website isVerified isFeatured genres stats createdAt');
        if (!publisher) return res.status(404).json({ message: 'Discovery item not found' });
        const escapedName = publisher.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const books = await Book.find(await publicBookFilter({ $or: [{ publisherId: publisher._id }, { publisher: new RegExp(`^${escapedName}$`, 'i') }] })).select('-publisherOwnerId').limit(30);
        res.json({ ...publisher.toObject(), books });
    } catch (error: any) { res.status(400).json({ message: error.message }); }
};

export const getBookFairById = async (req: Request, res: Response) => {
    try {
        const fair = await findByIdOr404(BookFair, String(req.params.id), res);
        if (!fair) return;
        const fairObj = fair.toObject();
        fairObj.status = computeFairStatus(fair.startDate, fair.endDate);

        const booths = await Booth.find({ $and: [{ fairId: fair._id }, await publicBoothFilter()] })
            .populate({ path: 'publisherId', match: publicPublisherFilter(), select: '_id name publisherSlug logoUrl logo website isVerified' })
            .sort({ boothNumber: 1 });
        res.json({ ...fairObj, booths });
    } catch (error: any) { res.status(400).json({ message: error.message }); }
};

export const getBoothById = async (req: Request, res: Response) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: 'Booth not found' });
        }
        const booth = await Booth.findOne({ $and: [{ _id: req.params.id }, await publicBoothFilter()] })
            .populate('fairId')
            .populate({ path: 'publisherId', match: publicPublisherFilter(), select: '_id name publisherSlug logoUrl logo website isVerified' });
        if (!booth) return res.status(404).json({ message: 'Booth not found' });
        const featuredIds = (booth.featuredBooks || []).map(String);
        const objectIds = featuredIds.filter(mongoose.isValidObjectId);
        const bookQuery = featuredIds.length
            ? { $or: [
                ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
                { id: { $in: featuredIds } }
            ] }
            : { _id: { $in: [] } };
        const books = await Book.find(await publicBookFilter(bookQuery));
        res.json({ ...booth.toObject(), books });
    } catch (error: any) { res.status(400).json({ message: error.message }); }
};

export const searchDiscovery = async (req: Request, res: Response) => {
    try {
        const term = String(req.query.q || '').trim();
        if (term.length < 2) return res.status(400).json({ message: 'q must contain at least 2 characters' });
        const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const [books, authors, publishers, upcomingBooks, rawFairs] = await Promise.all([
            Book.find(await publicBookFilter({ $or: [{ title: regex }, { author: regex }, { publisher: regex }, { genre: regex }] })).limit(8),
            Author.find({ $or: [{ name: regex }, { bio: regex }, { genres: regex }] }).limit(8),
            Publisher.find({ $and: [{ $or: [{ name: regex }, { description: regex }, { genres: regex }] }, publicPublisherFilter()] })
                .select('_id name publisherSlug description logoUrl logo establishedYear headquarters country website isVerified isFeatured genres stats createdAt')
                .limit(8),
            UpcomingBook.find({ $or: [{ title: regex }, { description: regex }, { 'metadata.teaser': regex }] })
                .populate('authorId', 'name avatarUrl photo')
                .populate('publisherId', 'name logoUrl logo website')
                .limit(8),
            BookFair.find({ $or: [{ name: regex }, { 'location.city': regex }, { description: regex }] }).limit(8)
        ]);

        const fairs = rawFairs.map(fair => {
            const obj = fair.toObject();
            obj.status = computeFairStatus(fair.startDate, fair.endDate);
            return obj;
        });

        res.json({ query: term, books, authors, publishers, upcomingBooks, fairs });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
};

/**
 * Aggregated live overview for the Discover Landing Page (/discover).
 * Bundles verified upcoming releases, featured authors, major publishers,
 * live book fairs with dynamic status, and key industry resources into a single fast payload.
 */
export const getDiscoveryOverview = async (_req: Request, res: Response) => {
    try {
        const [upcomingBooks, authors, publishers, rawFairs, totalBooksCount] = await Promise.all([
            UpcomingBook.find()
                .populate('authorId', 'name avatarUrl photo nationality genres')
                .populate({ path: 'publisherId', match: publicPublisherFilter(), select: 'name logoUrl logo website country' })
                .sort({ expectedReleaseDate: 1 })
                .limit(6),
            Author.find()
                .sort({ isFeatured: -1, createdAt: -1 })
                .limit(6),
            Publisher.find(publicPublisherFilter())
                .select('_id name publisherSlug description logoUrl logo establishedYear headquarters country website isVerified isFeatured genres stats createdAt')
                .sort({ isVerified: -1, isFeatured: -1, createdAt: -1 })
                .limit(6),
            BookFair.find()
                .sort({ startDate: 1 })
                .limit(6),
            Book.countDocuments(await publicBookFilter({}))
        ]);

        const bookFairs = rawFairs.map(fair => {
            const fairObj = fair.toObject();
            fairObj.status = computeFairStatus(fair.startDate, fair.endDate);
            return fairObj;
        });

        res.json({
            meta: {
                title: 'BookVerse Discover Hub',
                subtitle: 'Genuine literary intelligence, verified author bibliographies, publisher records, and global book fair schedules.',
                lastVerifiedAt: new Date().toISOString(),
                sources: ['Open Library', 'Official Publisher Websites', 'International ISBN Agency', 'National Book Trust', 'U.S. Copyright Office']
            },
            stats: {
                upcomingReleases: upcomingBooks.length,
                verifiedAuthors: authors.length,
                verifiedPublishers: publishers.length,
                globalBookFairs: bookFairs.length,
                industryResources: VERIFIED_INDUSTRY_RESOURCES.length,
                catalogBooks: totalBooksCount
            },
            upcomingBooks,
            authors,
            publishers,
            bookFairs,
            industryResources: VERIFIED_INDUSTRY_RESOURCES.slice(0, 6)
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to retrieve discovery overview', detail: error.message });
    }
};
