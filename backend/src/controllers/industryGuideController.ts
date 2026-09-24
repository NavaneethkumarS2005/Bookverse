import { Request, Response } from 'express';
import Author from '../models/Author.js';
import Publisher from '../models/Publisher.js';
import UpcomingBook from '../models/UpcomingBook.js';
import BookFair from '../models/BookFair.js';
import Booth from '../models/Booth.js';

const asText = (value: unknown) => typeof value === 'string' ? value.trim() : '';

/**
 * A catalog-first publishing-intelligence response. It deliberately exposes only
 * BookVerse-managed records; live global claims require a separately verified source.
 */
export const getIndustryGuide = async (req: Request, res: Response) => {
  try {
    const focus = asText(req.query.focus).slice(0, 160);
    const language = asText(req.query.language);
    const genre = asText(req.query.genre);
    const region = asText(req.query.region);
    const year = Number(req.query.year) || undefined;
    const search = focus ? new RegExp(focus.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

    const upcomingQuery: Record<string, unknown> = { status: { $in: ['ANNOUNCED', 'COMING_SOON'] } };
    if (language) upcomingQuery.language = language;
    if (genre) upcomingQuery.genres = genre;
    if (year) upcomingQuery.expectedReleaseDate = { $gte: new Date(`${year}-01-01`), $lt: new Date(`${year + 1}-01-01`) };
    if (search) upcomingQuery.$or = [{ title: search }, { description: search }, { 'metadata.teaser': search }];

    const authorQuery: Record<string, unknown> = {};
    if (language) authorQuery.language = language;
    if (genre) authorQuery.genres = genre;
    if (search) authorQuery.$or = [{ name: search }, { bio: search }, { genres: search }];

    const publisherQuery: Record<string, unknown> = {};
    if (genre) publisherQuery.genres = genre;
    if (region) publisherQuery.$or = [{ country: new RegExp(region, 'i') }, { headquarters: new RegExp(region, 'i') }];

    const fairQuery: Record<string, unknown> = { status: { $in: ['UPCOMING', 'ONGOING'] } };
    if (region) fairQuery.$or = [{ 'location.city': new RegExp(region, 'i') }, { 'location.state': new RegExp(region, 'i') }, { 'location.country': new RegExp(region, 'i') }];
    if (search) fairQuery.$or = [{ name: search }, { description: search }, { 'location.city': search }];

    const [upcomingBooks, authors, publishers, fairs] = await Promise.all([
      UpcomingBook.find(upcomingQuery).populate('authorId', 'name language genres bio').populate('publisherId', 'name website country headquarters contactEmail').sort({ expectedReleaseDate: 1 }).limit(12),
      Author.find(authorQuery).sort({ isFeatured: -1, featuredOrder: 1, createdAt: -1 }).limit(12),
      Publisher.find(publisherQuery).sort({ isVerified: -1, isFeatured: -1, createdAt: -1 }).limit(12),
      BookFair.find(fairQuery).sort({ startDate: 1 }).limit(12)
    ]);
    const fairIds = fairs.map(fair => fair._id);
    const booths = fairIds.length ? await Booth.find({ fairId: { $in: fairIds } }).populate('fairId', 'name location').populate('publisherId', 'name website').sort({ boothNumber: 1 }) : [];

    res.json({
      focus: { text: focus || 'All BookVerse publishing data', language: language || null, genre: genre || null, region: region || null, year: year || null },
      verification: {
        scope: 'bookverse_catalog',
        lastGeneratedAt: new Date().toISOString(),
        notice: 'Results are sourced from BookVerse-managed catalog records. External release dates, publisher submissions, entry pricing and official stall allocations require organizer or publisher verification before publication.'
      },
      upcomingBooks,
      emergingAuthors: authors,
      languageGenreCatalog: { languages: [...new Set(upcomingBooks.map(book => book.language).filter(Boolean))], genres: [...new Set(upcomingBooks.flatMap(book => book.genres || []))] },
      publishers,
      fairs,
      boothMappings: booths.map(booth => ({
        booth,
        allocationStatus: 'catalog_record',
        note: 'Confirm against the fair organizer’s official exhibitor map before travel.'
      }))
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Unable to build publishing intelligence guide.', detail: error.message });
  }
};
