import axios from 'axios';
import { VERIFIED_INDUSTRY_RESOURCES } from '../data/industryGuideResources.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache
const cache = new Map<string, CacheEntry<any>>();

const getCached = <T>(key: string): T | null => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
};

const setCached = <T>(key: string, data: T): void => {
  cache.set(key, { data, timestamp: Date.now() });
};

/**
 * Verified real authors with Open Library keys and genuine bibliographies.
 */
export const VERIFIED_AUTHORS = [
  {
    name: 'George Orwell',
    openLibraryKey: 'OL118077A',
    nationality: 'British',
    bio: 'Eric Arthur Blair, known by his pen name George Orwell, was an English novelist, essayist, journalist, and critic whose work is characterized by lucid prose, biting social criticism, and opposition to totalitarianism.',
    birthDate: '1903-06-25',
    deathDate: '1950-01-21',
    genres: ['Dystopian', 'Political Fiction', 'Satire', 'Essays'],
    language: ['English'],
    avatarUrl: 'https://covers.openlibrary.org/a/olid/OL118077A-M.jpg',
    metadata: {
      popularWorks: ['1984', 'Animal Farm', 'Homage to Catalonia', 'Down and Out in Paris and London'],
      awards: ['Prometheus Hall of Fame Award'],
      trivia: ['Worked as an imperial policeman in Burma and fought in the Spanish Civil War.']
    },
    isFeatured: true,
    isVerified: true
  },
  {
    name: 'J. K. Rowling',
    openLibraryKey: 'OL23919A',
    nationality: 'British',
    bio: 'Joanne Rowling, best known by her pen name J. K. Rowling, is a British author, screenwriter, and producer best known for writing the seven-volume Harry Potter fantasy series.',
    birthDate: '1965-07-31',
    genres: ['Fantasy', 'Young Adult', 'Mystery'],
    language: ['English'],
    avatarUrl: 'https://covers.openlibrary.org/a/olid/OL23919A-M.jpg',
    metadata: {
      popularWorks: ['Harry Potter and the Philosopher\'s Stone', 'Harry Potter and the Prisoner of Azkaban', 'The Casual Vacancy', 'The Cuckoo\'s Calling'],
      awards: ['Companion of Honour', 'Order of the British Empire (OBE)', 'Hugo Award'],
      trivia: ['Conceived the idea for Harry Potter while on a delayed train journey from Manchester to London King\'s Cross.']
    },
    isFeatured: true,
    isVerified: true
  },
  {
    name: 'Arundhati Roy',
    openLibraryKey: 'OL26786A',
    nationality: 'Indian',
    bio: 'Suzanna Arundhati Roy is an Indian author and political activist best known for her novel The God of Small Things, which won the Man Booker Prize for Fiction in 1997.',
    birthDate: '1961-11-24',
    genres: ['Literary Fiction', 'Political Essays', 'Non-Fiction'],
    language: ['English'],
    avatarUrl: 'https://covers.openlibrary.org/a/olid/OL26786A-M.jpg',
    metadata: {
      popularWorks: ['The God of Small Things', 'The Ministry of Utmost Happiness', 'Azadi: Freedom. Fascism. Fiction.'],
      awards: ['Man Booker Prize (1997)', 'Sydney Peace Prize (2004)', 'Sahitya Akademi Award (2006)'],
      trivia: ['Trained as an architect at the School of Planning and Architecture, New Delhi.']
    },
    isFeatured: true,
    isVerified: true
  },
  {
    name: 'Gabriel García Márquez',
    openLibraryKey: 'OL23158A',
    nationality: 'Colombian',
    bio: 'Gabriel José de la Concordia García Márquez was a Colombian novelist, short-story writer, screenwriter, and journalist, known affectionately as Gabo. Considered one of the most significant authors of the 20th century.',
    birthDate: '1927-03-06',
    deathDate: '2014-04-17',
    genres: ['Magical Realism', 'Literary Fiction', 'Historical Fiction'],
    language: ['Spanish', 'English'],
    avatarUrl: 'https://covers.openlibrary.org/a/olid/OL23158A-M.jpg',
    metadata: {
      popularWorks: ['One Hundred Years of Solitude', 'Love in the Time of Cholera', 'Chronicle of a Death Foretold'],
      awards: ['Nobel Prize in Literature (1982)', 'Neustadt International Prize for Literature (1972)'],
      trivia: ['Pioneered the worldwide popularity of the literary style known as magical realism.']
    },
    isFeatured: true,
    isVerified: true
  },
  {
    name: 'Haruki Murakami',
    openLibraryKey: 'OL23927A',
    nationality: 'Japanese',
    bio: 'Haruki Murakami is a Japanese writer whose novels, essays, and short stories have been bestsellers in Japan as well as internationally, characterized by fatalistic, surrealistic, and melancholic motifs.',
    birthDate: '1949-01-12',
    genres: ['Magical Realism', 'Surrealism', 'Contemporary Fiction'],
    language: ['Japanese', 'English'],
    avatarUrl: 'https://covers.openlibrary.org/a/olid/OL23927A-M.jpg',
    metadata: {
      popularWorks: ['Norwegian Wood', 'Kafka on the Shore', '1Q84', 'The Wind-Up Bird Chronicle'],
      awards: ['Franz Kafka Prize (2006)', 'Jerusalem Prize (2009)', 'World Fantasy Award (2006)'],
      trivia: ['Ran a jazz bar called Peter Cat in Kokubunji, Tokyo, before publishing his first novel.']
    },
    isFeatured: true,
    isVerified: true
  },
  {
    name: 'Chimamanda Ngozi Adichie',
    openLibraryKey: 'OL1394244A',
    nationality: 'Nigerian',
    bio: 'Chimamanda Ngozi Adichie is a Nigerian writer whose works include novels, short stories, and non-fiction. She was described in The Times Literary Supplement as the most prominent of a procession of critically acclaimed young anglophone authors.',
    birthDate: '1977-09-15',
    genres: ['Fiction', 'Literary Fiction', 'Essays', 'Feminism'],
    language: ['English', 'Igbo'],
    avatarUrl: 'https://covers.openlibrary.org/a/olid/OL1394244A-M.jpg',
    metadata: {
      popularWorks: ['Half of a Yellow Sun', 'Americanah', 'Purple Hibiscus', 'We Should All Be Feminists'],
      awards: ['Orange Prize for Fiction (2007)', 'National Book Critics Circle Award (2013)', 'MacArthur Fellowship'],
      trivia: ['Delivered the viral 2012 TEDx talk "We should all be feminists", later sampled by Beyoncé.']
    },
    isFeatured: true,
    isVerified: true
  },
  {
    name: 'Neil Gaiman',
    openLibraryKey: 'OL22986A',
    nationality: 'British',
    bio: 'Neil Richard MacKinnon Gaiman is an English author of short fiction, novels, comic books, graphic novels, nonfiction, audio theatre, and films. Renowned for rich mythic storytelling blending modern fantasy with ancient lore.',
    birthDate: '1960-11-10',
    genres: ['Fantasy', 'Mythology', 'Horror', 'Graphic Novels'],
    language: ['English'],
    avatarUrl: 'https://covers.openlibrary.org/a/olid/OL22986A-M.jpg',
    metadata: {
      popularWorks: ['American Gods', 'Coraline', 'The Sandman', 'Good Omens', 'The Graveyard Book'],
      awards: ['Hugo Award', 'Nebula Award', 'Bram Stoker Award', 'Carnegie Medal', 'Newbery Medal'],
      trivia: ['First author to win both the Newbery and the Carnegie medals for the same work (The Graveyard Book).']
    },
    isFeatured: true,
    isVerified: true
  },
  {
    name: 'Salman Rushdie',
    openLibraryKey: 'OL23171A',
    nationality: 'British-Indian',
    bio: 'Sir Ahmed Salman Rushdie is an Indian-born British-American novelist. His work often combines magical realism with historical fiction and primarily deals with the connections, disruptions, and migrations between Eastern and Western civilizations.',
    birthDate: '1947-06-19',
    genres: ['Magical Realism', 'Historical Fiction', 'Postcolonial Literature'],
    language: ['English'],
    avatarUrl: 'https://covers.openlibrary.org/a/olid/OL23171A-M.jpg',
    metadata: {
      popularWorks: ['Midnight\'s Children', 'The Satanic Verses', 'Victory City', 'Knife: Meditations After an Attempted Murder'],
      awards: ['Booker Prize (1981)', 'Booker of Bookers (1993, 2008)', 'Knighthood for Services to Literature'],
      trivia: ['Midnight\'s Children was awarded the "Booker of Bookers" on the 25th and 40th anniversaries of the prize.']
    },
    isFeatured: true,
    isVerified: true
  }
];

/**
 * Verified real publishers with official domains, founding years, and genres.
 */
export const VERIFIED_PUBLISHERS = [
  {
    name: 'Penguin Random House',
    publisherSlug: 'penguin-random-house',
    establishedYear: 1927,
    headquarters: 'New York City, NY',
    country: 'United States',
    website: 'https://www.penguinrandomhouse.com',
    description: 'The world’s largest trade book publisher, comprising nearly 250 editorially and creatively independent imprints across five continents, publishing thousands of award-winning titles annually.',
    logoUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80',
    genres: ['Fiction', 'Non-Fiction', 'Literary Fiction', 'Young Adult', 'Classics'],
    isVerified: true,
    isFeatured: true
  },
  {
    name: 'HarperCollins Publishers',
    publisherSlug: 'harpercollins-publishers',
    establishedYear: 1817,
    headquarters: 'New York City, NY',
    country: 'United States',
    website: 'https://www.harpercollins.com',
    description: 'One of the world’s leading English-language publishers with a heritage dating back over 200 years, publishing legendary authors from Mark Twain and the Brontës to modern bestsellers.',
    logoUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80',
    genres: ['Fiction', 'Biographies', 'History', 'Children’s', 'Science Fiction'],
    isVerified: true,
    isFeatured: true
  },
  {
    name: 'Simon & Schuster',
    publisherSlug: 'simon-and-schuster',
    establishedYear: 1924,
    headquarters: 'New York City, NY',
    country: 'United States',
    website: 'https://www.simonandschuster.com',
    description: 'A global leader in general interest publishing, dedicated to bringing an extensive range of voices, journalism, memoirs, and fiction to readers worldwide.',
    logoUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80',
    genres: ['Fiction', 'Memoirs', 'Thrillers', 'Current Affairs', 'Young Adult'],
    isVerified: true,
    isFeatured: true
  },
  {
    name: 'Bloomsbury Publishing',
    publisherSlug: 'bloomsbury-publishing',
    establishedYear: 1986,
    headquarters: 'London',
    country: 'United Kingdom',
    website: 'https://www.bloomsbury.com',
    description: 'Independent publishing house celebrating high-quality literary fiction, academic scholarship, specialist interest non-fiction, and children\'s literature.',
    logoUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80',
    genres: ['Literary Fiction', 'Academic', 'Fantasy', 'Non-Fiction', 'Children’s'],
    isVerified: true,
    isFeatured: true
  },
  {
    name: 'Oxford University Press',
    publisherSlug: 'oxford-university-press',
    establishedYear: 1586,
    headquarters: 'Oxford',
    country: 'United Kingdom',
    website: 'https://global.oup.com',
    description: 'The world’s largest university press, furthering the University of Oxford’s objective of excellence in research, scholarship, and education through global publishing.',
    logoUrl: 'https://images.unsplash.com/photo-1507842217121-9e96e4769ea0?auto=format&fit=crop&q=80',
    genres: ['Academic', 'Reference', 'History', 'Philosophy', 'Sciences'],
    isVerified: true,
    isFeatured: true
  },
  {
    name: 'Hachette Book Group',
    publisherSlug: 'hachette-book-group',
    establishedYear: 1837,
    headquarters: 'New York City, NY',
    country: 'United States',
    website: 'https://www.hachettebookgroup.com',
    description: 'Leading US trade publisher and subsidiary of Hachette Livre, home to prominent imprints including Grand Central Publishing, Little Brown, and Orbit.',
    logoUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&q=80',
    genres: ['Fiction', 'Sci-Fi & Fantasy', 'History', 'Pop Culture', 'Business'],
    isVerified: true,
    isFeatured: true
  },
  {
    name: 'Macmillan Publishers',
    publisherSlug: 'macmillan-publishers',
    establishedYear: 1843,
    headquarters: 'London / New York City',
    country: 'United Kingdom',
    website: 'https://us.macmillan.com',
    description: 'Global trade book publishing company operating across imprints including Farrar Straus & Giroux, St. Martin\'s Press, Tor Books, and Flatiron Books.',
    logoUrl: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&q=80',
    genres: ['Fiction', 'Science Fiction', 'Poetry', 'Essays', 'Crime Fiction'],
    isVerified: true,
    isFeatured: true
  },
  {
    name: 'Rupa Publications',
    publisherSlug: 'rupa-publications',
    establishedYear: 1936,
    headquarters: 'New Delhi',
    country: 'India',
    website: 'https://rupapublications.co.in',
    description: 'Pioneering Indian publishing house publishing widely across contemporary Indian fiction, economics, politics, memoirs, and popular culture.',
    logoUrl: 'https://images.unsplash.com/photo-1491841573634-28140fc7ced7?auto=format&fit=crop&q=80',
    genres: ['Indian Writing', 'Non-Fiction', 'History', 'Biographies', 'Self-Help'],
    isVerified: true,
    isFeatured: true
  }
];

/**
 * Verified real book fairs with real venues, official organizer URLs, and exact schedules.
 */
export const VERIFIED_BOOK_FAIRS = [
  {
    name: 'Frankfurter Buchmesse (Frankfurt Book Fair)',
    fairSlug: 'frankfurt-book-fair',
    startDate: new Date('2026-10-14T09:00:00.000Z'),
    endDate: new Date('2026-10-18T18:00:00.000Z'),
    location: {
      venue: 'Messe Frankfurt, Ludwig-Erhard-Anlage 1',
      city: 'Frankfurt am Main',
      state: 'Hesse',
      country: 'Germany',
      coordinates: { lat: 50.1118, lng: 8.6486 }
    },
    website: 'https://www.buchmesse.de/en',
    description: 'The world’s largest trade fair for books based both on the number of publishing companies represented and the number of international trade visitors. A premier gathering for rights trading and literary debates.',
    featuredImage: { url: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80', publicId: 'fair-frankfurt' },
    isFeatured: true,
    stats: { totalVisitors: 286000, totalPublishers: 7500, totalBooksDisplayed: 400000 }
  },
  {
    name: 'The London Book Fair',
    fairSlug: 'the-london-book-fair',
    startDate: new Date('2026-03-10T09:00:00.000Z'),
    endDate: new Date('2026-03-12T17:00:00.000Z'),
    location: {
      venue: 'Olympia London, Hammersmith Road',
      city: 'London',
      state: 'Greater London',
      country: 'United Kingdom',
      coordinates: { lat: 51.4965, lng: -0.2104 }
    },
    website: 'https://www.londonbookfair.co.uk',
    description: 'The global marketplace for story creators, copyright negotiations, rights sales, and book content distribution across print, audio, TV, film, and digital channels.',
    featuredImage: { url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80', publicId: 'fair-london' },
    isFeatured: true,
    stats: { totalVisitors: 25000, totalPublishers: 1000, totalBooksDisplayed: 120000 }
  },
  {
    name: 'New Delhi World Book Fair',
    fairSlug: 'new-delhi-world-book-fair',
    startDate: new Date('2026-02-14T11:00:00.000Z'),
    endDate: new Date('2026-02-22T20:00:00.000Z'),
    location: {
      venue: 'Bharat Mandapam, Pragati Maidan',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      coordinates: { lat: 28.6186, lng: 77.2415 }
    },
    website: 'https://www.nbtindia.gov.in',
    description: 'Organized by the National Book Trust (India), one of Asia’s largest international book exhibitions, attracting millions of passionate readers, scholarly publishers, and cultural delegations.',
    featuredImage: { url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80', publicId: 'fair-delhi' },
    isFeatured: true,
    stats: { totalVisitors: 1200000, totalPublishers: 1100, totalBooksDisplayed: 250000 }
  },
  {
    name: 'Kolkata International Book Fair',
    fairSlug: 'kolkata-international-book-fair',
    startDate: new Date('2026-01-28T12:00:00.000Z'),
    endDate: new Date('2026-02-09T20:00:00.000Z'),
    location: {
      venue: 'Boi Mela Prangan, Central Park, Salt Lake',
      city: 'Kolkata',
      state: 'West Bengal',
      country: 'India',
      coordinates: { lat: 22.5857, lng: 88.4143 }
    },
    website: 'https://kolkatabookfair.net',
    description: 'The world’s largest non-trade book fair and the most attended book fair in the world, renowned for unmatched civic enthusiasm, literary seminars, and independent publishing showcases.',
    featuredImage: { url: 'https://images.unsplash.com/photo-1507842217121-9e96e4769ea0?auto=format&fit=crop&q=80', publicId: 'fair-kolkata' },
    isFeatured: true,
    stats: { totalVisitors: 2700000, totalPublishers: 950, totalBooksDisplayed: 350000 }
  },
  {
    name: 'Bologna Children’s Book Fair',
    fairSlug: 'bologna-childrens-book-fair',
    startDate: new Date('2026-03-30T09:00:00.000Z'),
    endDate: new Date('2026-04-02T18:00:00.000Z'),
    location: {
      venue: 'BolognaFiere, Piazza della Costituzione',
      city: 'Bologna',
      state: 'Emilia-Romagna',
      country: 'Italy',
      coordinates: { lat: 44.5113, lng: 11.3644 }
    },
    website: 'https://www.bolognachildrensbookfair.com',
    description: 'The leading international professional event dedicated to the children’s publishing industry, showcasing global illustration trends, literary prizes, and translation rights.',
    featuredImage: { url: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&q=80', publicId: 'fair-bologna' },
    isFeatured: true,
    stats: { totalVisitors: 30000, totalPublishers: 1500, totalBooksDisplayed: 90000 }
  },
  {
    name: 'Sharjah International Book Fair',
    fairSlug: 'sharjah-international-book-fair',
    startDate: new Date('2026-11-04T10:00:00.000Z'),
    endDate: new Date('2026-11-15T22:00:00.000Z'),
    location: {
      venue: 'Expo Centre Sharjah, Al Taawun Street',
      city: 'Sharjah',
      state: 'Sharjah',
      country: 'United Arab Emirates',
      coordinates: { lat: 25.3211, lng: 55.3725 }
    },
    website: 'https://www.sibf.com',
    description: 'An 11-day cultural extravaganza and major commercial hub connecting Arab-world publishing with global literary markets, hosting world-renowned authors and translation grants.',
    featuredImage: { url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80', publicId: 'fair-sharjah' },
    isFeatured: true,
    stats: { totalVisitors: 2170000, totalPublishers: 2000, totalBooksDisplayed: 300000 }
  },
  {
    name: 'Guadalajara International Book Fair (FIL)',
    fairSlug: 'guadalajara-international-book-fair',
    startDate: new Date('2026-11-28T09:00:00.000Z'),
    endDate: new Date('2026-12-06T21:00:00.000Z'),
    location: {
      venue: 'Expo Guadalajara, Av. Mariano Otero',
      city: 'Guadalajara',
      state: 'Jalisco',
      country: 'Mexico',
      coordinates: { lat: 20.6534, lng: -103.3917 }
    },
    website: 'https://www.fil.com.mx',
    description: 'Created by the University of Guadalajara, the largest market in the world for Spanish-language publications, combining significant business deals with a major cultural festival.',
    featuredImage: { url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80', publicId: 'fair-guadalajara' },
    isFeatured: true,
    stats: { totalVisitors: 850000, totalPublishers: 2200, totalBooksDisplayed: 450000 }
  }
];

/**
 * Fetch works from Open Library for a given author with error handling and caching.
 */
export const fetchOpenLibraryAuthorWorks = async (authorKey: string): Promise<any[]> => {
  const cacheKey = `ol_author_works_${authorKey}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await axios.get(`https://openlibrary.org/authors/${authorKey}/works.json?limit=6`, {
      timeout: 5000,
      headers: { 'User-Agent': 'BookVerse/1.0 (https://bookverse.org; contact@bookverse.org)' }
    });
    const works = (res.data.entries || []).map((work: any) => ({
      title: work.title,
      key: work.key,
      covers: work.covers || [],
      coverUrl: work.covers?.[0] ? `https://covers.openlibrary.org/b/id/${work.covers[0]}-M.jpg` : undefined
    }));
    setCached(cacheKey, works);
    return works;
  } catch (err: any) {
    console.warn(`[Open Library] Unable to fetch works for ${authorKey}:`, err.message);
    return [];
  }
};

/**
 * Compute real-time status of book fair based on verified dates.
 */
export const computeFairStatus = (startDate: Date | string, endDate: Date | string): 'UPCOMING' | 'ONGOING' | 'COMPLETED' => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > now) return 'UPCOMING';
  if (end < now) return 'COMPLETED';
  return 'ONGOING';
};
