import { Response } from 'express';
import mongoose from 'mongoose';
import Book from '../models/Book';
import Publisher from '../models/Publisher';
import { AuthRequest } from '../types';

const PUBLIC_PUBLISHER_FIELDS = '_id name publisherSlug description logoUrl logo establishedYear headquarters country website isVerified isFeatured genres stats createdAt';
const PUBLISHER_FIELDS = ['name', 'description', 'contactEmail', 'contactPhone', 'website', 'headquarters', 'country', 'logoUrl'] as const;
const BOOK_FIELDS = ['title', 'author', 'description', 'genre', 'image', 'price', 'isbn'] as const;

type PublisherInput = Record<typeof PUBLISHER_FIELDS[number], string>;
type BookInput = Omit<Record<typeof BOOK_FIELDS[number], string>, 'price' | 'isbn'> & { price: number; isbn?: string };

const asText = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isHttpUrl = (value: string) => {
    if (!value) return true;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
        return false;
    }
};

export const normalizePublisherInput = (input: Record<string, unknown>): { value?: PublisherInput; error?: string } => {
    const value = {
        name: asText(input.name),
        description: asText(input.description),
        contactEmail: asText(input.contactEmail).toLowerCase(),
        contactPhone: asText(input.contactPhone),
        website: asText(input.website),
        headquarters: asText(input.headquarters),
        country: asText(input.country),
        logoUrl: asText(input.logoUrl),
    };

    if (value.name.length < 2 || value.name.length > 120) return { error: 'Publisher name must be between 2 and 120 characters.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.contactEmail) || value.contactEmail.length > 254) return { error: 'Enter a valid contact email.' };
    if (value.description.length > 2000) return { error: 'Description must be 2000 characters or fewer.' };
    if (value.contactPhone && (!/^[+()0-9 .-]{7,30}$/.test(value.contactPhone))) return { error: 'Enter a valid contact phone number.' };
    if (!isHttpUrl(value.website) || value.website.length > 2048) return { error: 'Website must be a valid HTTP or HTTPS URL.' };
    if (!isHttpUrl(value.logoUrl) || value.logoUrl.length > 2048) return { error: 'Logo must be a valid HTTP or HTTPS URL.' };
    if (value.headquarters.length > 160 || value.country.length > 100) return { error: 'Location details exceed the allowed length.' };
    return { value };
};

export const normalizeBookInput = (input: Record<string, unknown>): { value?: BookInput; error?: string } => {
    if (input.price === undefined || input.price === null || (typeof input.price === 'string' && !input.price.trim())) {
        return { error: 'Book price is required.' };
    }
    const priceValue = typeof input.price === 'number' ? input.price : Number(input.price);
    const isbn = asText(input.isbn).replace(/[ -]/g, '').toUpperCase();
    const value = {
        title: asText(input.title),
        author: asText(input.author),
        description: asText(input.description),
        genre: asText(input.genre),
        image: asText(input.image),
        price: priceValue,
        isbn: isbn || undefined,
    };

    if (value.title.length < 1 || value.title.length > 200) return { error: 'Title must be between 1 and 200 characters.' };
    if (value.author.length < 1 || value.author.length > 120) return { error: 'Author must be between 1 and 120 characters.' };
    if (value.genre.length < 1 || value.genre.length > 80) return { error: 'Genre must be between 1 and 80 characters.' };
    if (!Number.isFinite(value.price) || value.price < 0 || value.price > 10000000) return { error: 'Enter a valid non-negative book price.' };
    if (value.description.length > 5000 || value.image.length > 2048) return { error: 'Book description or image URL exceeds the allowed length.' };
    if (value.image && !isHttpUrl(value.image)) return { error: 'Book cover must be a valid HTTP or HTTPS URL.' };
    if (value.isbn && !/^(?:\d{9}[\dX]|\d{13})$/.test(value.isbn)) return { error: 'ISBN must contain 10 or 13 characters.' };
    return { value };
};

const getOwnedPublisher = (userId: string) => {
    const query = Publisher.findOne({ ownerId: userId });
    return typeof query.select === 'function' ? query.select('+ownerId') : query;
};
const handleDuplicate = (error: any, res: Response, label: string) => {
    if (error?.code === 11000) {
        res.status(409).json({ message: `A publisher or book with this ${label} already exists.` });
        return true;
    }
    return false;
};

export const listPublicPublishers = async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const keyword = asText(req.query.keyword).slice(0, 100);
    const query: Record<string, unknown> = {
        applicationStatus: { $in: ['approved', null] },
        isActive: { $ne: false },
    };
    if (keyword) query.name = { $regex: escapeRegex(keyword), $options: 'i' };

    const [publishers, total] = await Promise.all([
        Publisher.find(query).select(PUBLIC_PUBLISHER_FIELDS).sort({ isFeatured: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Publisher.countDocuments(query),
    ]);
    res.json({ publishers, total, page, pages: Math.ceil(total / limit) });
};

export const getPublicPublisher = async (req: AuthRequest, res: Response) => {
    if (!mongoose.isValidObjectId(String(req.params.id))) return res.status(404).json({ message: 'Publisher not found.' });
    const publisher = await Publisher.findOne({
        _id: req.params.id,
        applicationStatus: { $in: ['approved', null] },
        isActive: { $ne: false },
    }).select(PUBLIC_PUBLISHER_FIELDS).lean();
    if (!publisher) return res.status(404).json({ message: 'Publisher not found.' });
    const books = await Book.find({ publisherId: publisher._id, publicationStatus: { $in: ['approved', null] } }).select('-publisherOwnerId').limit(30).lean();
    res.json({ ...publisher, books });
};

export const getMyPublisher = async (req: AuthRequest, res: Response) => {
    const publisher = await getOwnedPublisher(req.user.id);
    if (!publisher) return res.status(404).json({ message: 'No publisher application was found.' });
    res.json(publisher);
};

export const applyAsPublisher = async (req: AuthRequest, res: Response) => {
    const normalized = normalizePublisherInput(req.body || {});
    if (!normalized.value) return res.status(400).json({ message: normalized.error });

    try {
        const existing = await getOwnedPublisher(req.user.id);
        if (existing) return res.status(409).json({ message: 'You already have a publisher application. View its status in your publisher workspace.' });

        const normalizedName = normalized.value.name.toLocaleLowerCase();
        const nameExists = await Publisher.exists({ $or: [
            { normalizedName },
            { name: { $regex: `^${escapeRegex(normalized.value.name)}$`, $options: 'i' } },
        ] });
        if (nameExists) return res.status(409).json({ message: 'A publisher application with this name already exists.' });

        const publisher = await Publisher.create({
            ...normalized.value,
            normalizedName,
            ownerId: req.user.id,
            applicationStatus: 'pending',
            isActive: false,
            isVerified: false,
        });
        return res.status(201).json({ message: 'Publisher application submitted for review.', publisher });
    } catch (error: any) {
        if (handleDuplicate(error, res, 'name or account')) return;
        throw error;
    }
};

export const updateMyPublisher = async (req: AuthRequest, res: Response) => {
    const publisher = await getOwnedPublisher(req.user.id);
    if (!publisher) return res.status(404).json({ message: 'No publisher application was found.' });
    const normalized = normalizePublisherInput({ ...publisher.toObject(), ...req.body });
    if (!normalized.value) return res.status(400).json({ message: normalized.error });

    try {
        const normalizedName = normalized.value.name.toLocaleLowerCase();
        const duplicate = await Publisher.exists({ _id: { $ne: publisher._id }, $or: [
            { normalizedName },
            { name: { $regex: `^${escapeRegex(normalized.value.name)}$`, $options: 'i' } },
        ] });
        if (duplicate) return res.status(409).json({ message: 'A publisher with this name already exists.' });

        Object.assign(publisher, normalized.value, { normalizedName });
        if (publisher.applicationStatus === 'rejected') {
            publisher.applicationStatus = 'pending';
            publisher.isActive = false;
            publisher.reviewedBy = undefined;
            publisher.reviewedAt = undefined;
            publisher.rejectionReason = undefined;
        }
        await publisher.save();
        return res.json({ message: 'Publisher profile updated.', publisher });
    } catch (error: any) {
        if (handleDuplicate(error, res, 'name')) return;
        throw error;
    }
};

export const listMyPublisherBooks = async (req: AuthRequest, res: Response) => {
    const publisher = await getOwnedPublisher(req.user.id);
    if (!publisher) return res.status(404).json({ message: 'No publisher application was found.' });
    const books = await Book.find({ publisherId: publisher._id }).sort({ createdAt: -1 }).limit(100).lean();
    res.json(books);
};

export const submitPublisherBook = async (req: AuthRequest, res: Response) => {
    const publisher = await getOwnedPublisher(req.user.id);
    if (!publisher) return res.status(404).json({ message: 'No publisher application was found.' });
    if (publisher.applicationStatus !== 'approved' || publisher.isActive === false) {
        return res.status(403).json({ message: 'Only active, approved publishers can submit books.' });
    }
    const normalized = normalizeBookInput(req.body || {});
    if (!normalized.value) return res.status(400).json({ message: normalized.error });

    try {
        const book = await Book.create({
            ...normalized.value,
            publisher: publisher.name,
            publisherId: publisher._id,
            publisherOwnerId: publisher.ownerId,
            publicationStatus: 'pending',
            fulfillment: 'internal',
            stock: 0,
            availability: 'Out of Stock',
        });
        return res.status(201).json({ message: 'Book submission sent for admin review.', book });
    } catch (error: any) {
        if (handleDuplicate(error, res, 'ISBN')) return;
        throw error;
    }
};

export const updatePublisherBook = async (req: AuthRequest, res: Response) => {
    if (!mongoose.isValidObjectId(String(req.params.bookId))) return res.status(404).json({ message: 'Book not found.' });
    const publisher = await getOwnedPublisher(req.user.id);
    if (!publisher) return res.status(404).json({ message: 'No publisher application was found.' });
    if (publisher.applicationStatus !== 'approved' || publisher.isActive === false) {
        return res.status(403).json({ message: 'Only active, approved publishers can manage books.' });
    }
    const book = await Book.findOne({ _id: req.params.bookId, publisherId: publisher._id, publisherOwnerId: req.user.id });
    if (!book) return res.status(404).json({ message: 'Book not found.' });
    const normalized = normalizeBookInput({ ...book.toObject(), ...req.body });
    if (!normalized.value) return res.status(400).json({ message: normalized.error });

    try {
        Object.assign(book, normalized.value, {
            publicationStatus: 'pending',
            reviewedBy: undefined,
            reviewedAt: undefined,
            rejectionReason: undefined,
        });
        await book.save();
        return res.json({ message: 'Book changes submitted for admin review.', book });
    } catch (error: any) {
        if (handleDuplicate(error, res, 'ISBN')) return;
        throw error;
    }
};

export const validatePublisherIdentifier = (value: string) => mongoose.isValidObjectId(value);
export const publisherInputFields = PUBLISHER_FIELDS;
export const publisherBookFields = BOOK_FIELDS;