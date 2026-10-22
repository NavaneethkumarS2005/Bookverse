import { Request, Response } from 'express';
import Author from '../models/Author.js';
import Publisher from '../models/Publisher.js';
import UpcomingBook from '../models/UpcomingBook.js';
import BookFair from '../models/BookFair.js';
import Booth from '../models/Booth.js';
import { publicPublisherFilter } from '../utils/catalogVisibility.js';
import { VERIFIED_INDUSTRY_RESOURCES } from '../data/industryGuideResources.js';
import { computeFairStatus } from '../services/discoveryLiveService.js';

const asText = (value: unknown) => typeof value === 'string' ? value.trim() : '';

/**
 * A verified publishing intelligence and industry guide endpoint.
 * Combines authoritative industry resources (ISBN, copyright, submissions, author guilds)
 * with verified BookVerse publisher guidelines, upcoming titles, and book fairs.
 */
export const getIndustryGuide = async (req: Request, res: Response) => {
  try {
    const focus = asText(req.query.focus).slice(0, 160);
    const category = asText(req.query.category).toUpperCase();
    const language = asText(req.query.language);
    const genre = asText(req.query.genre);
    const region = asText(req.query.region);
    const year = Number(req.query.year) || undefined;
    const search = focus ? new RegExp(focus.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

    // Filter verified industry resources
    let filteredResources = VERIFIED_INDUSTRY_RESOURCES;
    if (category && category !== 'ALL') {
      filteredResources = filteredResources.filter(r => r.category === category);
    }
    if (focus) {
      const lower = focus.toLowerCase();
      filteredResources = filteredResources.filter(r =>
        r.title.toLowerCase().includes(lower) ||
        r.description.toLowerCase().includes(lower) ||
        r.organization.toLowerCase().includes(lower) ||
        r.keyTopics.some(t => t.toLowerCase().includes(lower))
      );
    }

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

    const fairQuery: Record<string, unknown> = {};
    if (region) fairQuery.$or = [{ 'location.city': new RegExp(region, 'i') }, { 'location.state': new RegExp(region, 'i') }, { 'location.country': new RegExp(region, 'i') }];
    if (search) fairQuery.$or = [{ name: search }, { description: search }, { 'location.city': search }];

    const [upcomingBooks, authors, publishers, rawFairs] = await Promise.all([
      UpcomingBook.find(upcomingQuery)
        .populate('authorId', 'name language genres bio avatarUrl')
        .populate({ path: 'publisherId', match: publicPublisherFilter(), select: 'name website country headquarters logoUrl' })
        .sort({ expectedReleaseDate: 1 })
        .limit(12),
      Author.find(authorQuery)
        .sort({ isFeatured: -1, featuredOrder: 1, createdAt: -1 })
        .limit(12),
      Publisher.find({ $and: [publisherQuery, publicPublisherFilter()] })
        .select('_id name publisherSlug description logoUrl logo establishedYear headquarters country website isVerified isFeatured genres stats createdAt')
        .sort({ isVerified: -1, isFeatured: -1, createdAt: -1 })
        .limit(12),
      BookFair.find(fairQuery).sort({ startDate: 1 }).limit(12)
    ]);

    // Recalculate dynamic statuses for book fairs
    const fairs = rawFairs.map(fair => {
      const obj = fair.toObject();
      obj.status = computeFairStatus(fair.startDate, fair.endDate);
      return obj;
    });

    const fairIds = fairs.map(fair => fair._id);
    const booths = fairIds.length ? await Booth.find({ fairId: { $in: fairIds } })
      .populate('fairId', 'name location website')
      .populate({ path: 'publisherId', match: publicPublisherFilter(), select: 'name website headquarters' })
      .sort({ boothNumber: 1 }) : [];

    res.json({
      focus: { text: focus || 'All Publishing Intelligence', category: category || 'ALL', language: language || null, genre: genre || null, region: region || null, year: year || null },
      verification: {
        scope: 'verified_real_world_guidelines',
        lastGeneratedAt: new Date().toISOString(),
        sources: [
          'Bowker US ISBN Agency',
          'Raja Rammohun Roy National Agency for ISBN (India)',
          'International ISBN Agency',
          'U.S. Copyright Office',
          'Copyright Office of India',
          'World Intellectual Property Organization (WIPO)',
          'Official Publisher Portals (PRH, HarperCollins, Bloomsbury)',
          'The Authors Guild & The Society of Authors',
          'Book Industry Study Group (BISG)'
        ],
        notice: 'Verified official guidelines and regulatory portals. Outbound URLs link directly to statutory registration authorities and publisher submission departments.'
      },
      resources: filteredResources,
      upcomingBooks,
      emergingAuthors: authors,
      languageGenreCatalog: {
        languages: [...new Set(upcomingBooks.map(book => book.language).filter(Boolean))],
        genres: [...new Set(upcomingBooks.flatMap(book => book.genres || []))]
      },
      publishers,
      fairs,
      boothMappings: booths.filter(booth => booth.publisherId).map(booth => ({
        booth,
        allocationStatus: 'official_exhibitor_stall',
        note: 'Verified exhibitor allocation. Please check the official organizer venue map prior to attending.'
      }))
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Unable to build publishing intelligence guide.', detail: error.message });
  }
};
