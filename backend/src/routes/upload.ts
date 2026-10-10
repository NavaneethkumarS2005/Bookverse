import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cloudinary from 'cloudinary';
import Book from '../models/Book';
import { auth } from '../middleware/auth';
import { admin } from '../middleware/admin';
import { AuthRequest } from '../types';
// @ts-ignore
import upload from '../middleware/upload';
import { generateBookCoverSvg } from '../utils/coverArt';

dotenv.config();

const router = express.Router();
const FALLBACK_IMAGE = '/images/bookstore-hero-editorial.png';

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const normalizeCoverUrl = (value?: string, title?: string, author?: string, category?: string): string => {
    if (!value || !value.trim()) {
        return generateBookCoverSvg(title || 'Untitled', author, category);
    }
    const trimmed = value.trim();
    const lower = trimmed.toLowerCase();

    const placeholders = [
        'placehold.co',
        'via.placeholder.com',
        'placeholder.com',
        'loremflickr.com',
        '/images/hero-book.png',
        '/images/bookstore-hero-editorial.png',
        'text='
    ];

    if (placeholders.some(marker => lower.includes(marker))) {
        return generateBookCoverSvg(title || 'Untitled', author, category);
    }

    return trimmed;
};

const validateCoverMutation = (bookId?: string) => {
    if (!bookId) {
        return null;
    }

    if (typeof bookId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(bookId.trim())) {
        throw new Error('Invalid book id');
    }

    return bookId.trim();
};

const uploadToCloudinary = async (file: Express.Multer.File) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return null;
    }

    return new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.v2.uploader.upload_stream(
            {
                folder: 'lumina-book/used-books',
                transformation: [{ quality: 'auto', fetch_format: 'auto' }],
            },
            (error, result) => {
                if (error || !result) return reject(error || new Error('Cloudinary upload failed'));
                resolve(result as { secure_url: string });
            }
        );

        stream.end(file.buffer);
    });
};

const fetchBookCoverFromISBN = async (isbn: string): Promise<string | null> => {
    try {
        const formattedIsbn = isbn.replace(/\s+/g, '').trim();
        if (!formattedIsbn) return null;

        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${formattedIsbn}`);
        if (!response.ok) return null;

        const data = await response.json() as any;
        const cover = data.items?.[0]?.volumeInfo?.imageLinks?.extraLarge
            || data.items?.[0]?.volumeInfo?.imageLinks?.large
            || data.items?.[0]?.volumeInfo?.imageLinks?.medium
            || data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;

        return cover ? normalizeCoverUrl(cover) : null;
    } catch (error) {
        console.error('ISBN cover lookup failed:', error);
        return null;
    }
};

router.post('/', auth, upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 5 }
]), async (req: AuthRequest, res: Response) => {
    try {
        const files: Express.Multer.File[] = [];

        if (Array.isArray(req.files)) {
            files.push(...req.files);
        } else if (req.files) {
            Object.values(req.files).forEach((fieldFiles) => {
                if (Array.isArray(fieldFiles)) files.push(...fieldFiles);
            });
        }

        if (!files.length) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const uploadedUrls = await Promise.all(files.map(async (file) => {
            const cloudinaryResult = await uploadToCloudinary(file);
            if (cloudinaryResult?.secure_url) {
                return normalizeCoverUrl(cloudinaryResult.secure_url, 'Uploaded Book', 'Seller', 'Used Book');
            }

            return normalizeCoverUrl(`${req.protocol}://${req.get('host')}/uploads/${file.filename}`, 'Uploaded Book', 'Seller', 'Used Book');
        }));

        const primaryImage = uploadedUrls[0];
        return res.json({
            imageUrl: primaryImage,
            imageUrls: uploadedUrls,
            images: uploadedUrls
        });
    } catch (err) {
        console.error('Upload failed:', err);
        return res.status(500).json({ message: 'Error uploading file' });
    }
});

router.post('/isbn-cover', auth, async (req: AuthRequest, res: Response) => {
    try {
        const isbn = typeof req.body?.isbn === 'string' ? req.body.isbn.trim() : '';
        const bookId = validateCoverMutation(req.body?.bookId as string | undefined);

        if (!isbn) {
            return res.status(400).json({ message: 'ISBN is required' });
        }

        if (!/^(?:97[89])?\d{9}[\dXx]$/.test(isbn.replace(/\s+/g, ''))) {
            return res.status(400).json({ message: 'Invalid ISBN format' });
        }

        const cover = await fetchBookCoverFromISBN(isbn);
        if (!cover) {
            return res.status(404).json({ message: 'No cover image found for this ISBN' });
        }

        if (bookId) {
            const user = req.user;
            if (!user || user.role !== 'admin') {
                return res.status(403).json({ message: 'Admin access required to update catalog cover images' });
            }

            await Book.findByIdAndUpdate(bookId, {
                image: cover,
                coverImage: cover,
                thumbnail: cover,
                imageSource: 'isbn-fetch',
                imageStatus: 'ready'
            }, { new: true });
        }

        return res.json({ imageUrl: cover, source: 'isbn-fetch' });
    } catch (error: any) {
        console.error('Auto cover fetch failed:', error);
        return res.status(500).json({ message: error.message || 'Error fetching cover from ISBN' });
    }
});

export default router;
