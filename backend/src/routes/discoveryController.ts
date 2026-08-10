import { Request, Response } from 'express';
import Book from '../models/Book.js';
import Author from '../models/Author.js';
import Publisher from '../models/Publisher.js';
import UpcomingBook from '../models/UpcomingBook.js';
import BookFair from '../models/BookFair.js';
import Booth from '../models/Booth.js';
import FairPublisherMapping from '../models/FairPublisherMapping.js';

export const getDiscoveryDashboard = async (req: Request, res: Response) => {
    try {
        const [featuredBooks, upcomingBooks, featuredAuthors, featuredPublishers, activeFairs] = await Promise.all([
            Book.find({ isFeatured: true }).limit(6).populate('authorId', 'name').lean(),
            UpcomingBook.find({ status: 'COMING_SOON' }).limit(6).populate('authorId', 'name').lean(),
            Author.find({ isFeatured: true }).limit(6).lean(),
            Publisher.find({ isFeatured: true }).limit(6).lean(),
            BookFair.find({ status: 'UPCOMING' }).limit(4).lean()
        ]);

        res.status(200).json({
            success: true,
            data: {
                featuredBooks,
                upcomingBooks,
                featuredAuthors,
                featuredPublishers,
                activeFairs
            }
        });
    } catch (error) {
        console.error('Error in discovery dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching discovery data'
        });
    }
};

export const getAuthors = async (req: Request, res: Response) => {
    try {
        const authors = await Author.find({}).lean();
        res.status(200).json({
            success: true,
            data: authors
        });
    } catch (error) {
        console.error('Error fetching authors:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching authors'
        });
    }
};

export const getAuthorById = async (req: Request, res: Response) => {
    try {
        const author = await Author.findById(req.params.id).lean();
        
        if (!author) {
            return res.status(404).json({
                success: false,
                message: 'Author not found'
            });
        }

        const books = await Book.find({ authorId: author._id }).lean();

        res.status(200).json({
            success: true,
            data: {
                ...author,
                books
            }
        });
    } catch (error) {
        console.error('Error fetching author:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching author'
        });
    }
};

export const getPublishers = async (req: Request, res: Response) => {
    try {
        const publishers = await Publisher.find({}).lean();
        res.status(200).json({
            success: true,
            data: publishers
        });
    } catch (error) {
        console.error('Error fetching publishers:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching publishers'
        });
    }
};

export const getPublisherById = async (req: Request, res: Response) => {
    try {
        const publisher = await Publisher.findById(req.params.id).lean();
        
        if (!publisher) {
            return res.status(404).json({
                success: false,
                message: 'Publisher not found'
            });
        }

        const books = await Book.find({ publisherId: publisher._id }).lean();

        res.status(200).json({
            success: true,
            data: {
                ...publisher,
                books
            }
        });
    } catch (error) {
        console.error('Error fetching publisher:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching publisher'
        });
    }
};

export const getUpcomingBooks = async (req: Request, res: Response) => {
    try {
        const upcomingBooks = await UpcomingBook.find({})
            .populate('authorId', 'name')
            .populate('publisherId', 'name')
            .lean();
        
        res.status(200).json({
            success: true,
            data: upcomingBooks
        });
    } catch (error) {
        console.error('Error fetching upcoming books:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching upcoming books'
        });
    }
};

export const getBookFairs = async (req: Request, res: Response) => {
    try {
        const fairs = await BookFair.find({}).lean();
        res.status(200).json({
            success: true,
            data: fairs
        });
    } catch (error) {
        console.error('Error fetching book fairs:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching book fairs'
        });
    }
};

export const getFairDetails = async (req: Request, res: Response) => {
    try {
        const fair = await BookFair.findById(req.params.id).lean();
        
        if (!fair) {
            return res.status(404).json({
                success: false,
                message: 'Book fair not found'
            });
        }

        const mappings = await FairPublisherMapping.find({ fairId: fair._id })
            .populate('publisherId')
            .populate('boothId')
            .lean();

        const booths = await Booth.find({ fairId: fair._id }).lean();

        res.status(200).json({
            success: true,
            data: {
                ...fair,
                mappings,
                booths
            }
        });
    } catch (error) {
        console.error('Error fetching fair details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching fair details'
        });
    }
};

export const getBooths = async (req: Request, res: Response) => {
    try {
        const booths = await Booth.find({})
            .populate('fairId', 'name location')
            .populate('publisherId', 'name')
            .lean();
        
        res.status(200).json({
            success: true,
            data: booths
        });
    } catch (error) {
        console.error('Error fetching booths:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching booths'
        });
    }
};

export const getBoothById = async (req: Request, res: Response) => {
    try {
        const booth = await Booth.findById(req.params.id)
            .populate('fairId', 'name location startDate endDate')
            .populate('publisherId', 'name logo')
            .lean();
        
        if (!booth) {
            return res.status(404).json({
                success: false,
                message: 'Booth not found'
            });
        }

        res.status(200).json({
            success: true,
            data: booth
        });
    } catch (error) {
        console.error('Error fetching booth:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching booth'
        });
    }
};

export const searchDiscovery = async (req: Request, res: Response) => {
    try {
        const { q, type } = req.query;
        
        if (!q || typeof q !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const searchRegex = new RegExp(q, 'i');
        let results: any = {};

        const searchTypes = type ? [type as string] : ['books', 'authors', 'publishers', 'upcoming', 'fairs'];

        if (searchTypes.includes('books') || !type) {
            results.books = await Book.find({
                $or: [
                    { title: searchRegex },
                    { author: searchRegex },
                    { genres: searchRegex },
                    { 'metadata.publisherSummary': searchRegex }
                ]
            }).limit(6).lean();
        }

        if (searchTypes.includes('authors') || !type) {
            results.authors = await Author.find({
                $or: [
                    { name: searchRegex },
                    { bio: searchRegex },
                    { genres: searchRegex },
                    { nationality: searchRegex }
                ]
            }).limit(6).lean();
        }

        if (searchTypes.includes('publishers') || !type) {
            results.publishers = await Publisher.find({
                $or: [
                    { name: searchRegex },
                    { description: searchRegex },
                    { country: searchRegex }
                ]
            }).limit(6).lean();
        }

        if (searchTypes.includes('upcoming') || !type) {
            results.upcomingBooks = await UpcomingBook.find({
                $or: [
                    { title: searchRegex },
                    { 'metadata.publisherSummary': searchRegex },
                    { 'metadata.teaser': searchRegex }
                ]
            }).populate('authorId', 'name').limit(6).lean();
        }

        if (searchTypes.includes('fairs') || !type) {
            results.fairs = await BookFair.find({
                $or: [
                    { name: searchRegex },
                    { description: searchRegex },
                    { 'location.city': searchRegex },
                    { 'location.country': searchRegex }
                ]
            }).limit(6).lean();
        }

        const totalCount = Object.values(results).reduce((acc: number, arr: any) => acc + (arr?.length || 0), 0);

        res.status(200).json({
            success: true,
            data: results,
            total: totalCount,
            query: q
        });

    } catch (error) {
        console.error('Error in search:', error);
        res.status(500).json({
            success: false,
            message: 'Error performing search'
        });
    }
};