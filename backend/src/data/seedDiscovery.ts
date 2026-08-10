import Author from '../models/Author';
import Publisher from '../models/Publisher';
import UpcomingBook from '../models/UpcomingBook';
import BookFair from '../models/BookFair';
import Booth from '../models/Booth';

// Safe starter content: it runs only for empty collections and never overwrites admin data.
export const seedDiscovery = async (): Promise<void> => {
    const [authorCount, publisherCount, upcomingCount, fairCount] = await Promise.all([
        Author.countDocuments(), Publisher.countDocuments(), UpcomingBook.countDocuments(), BookFair.countDocuments()
    ]);

    if (!publisherCount) await Publisher.insertMany([
        { name: 'Riverstone Press', description: 'Independent fiction and literary voices from India.', country: 'India', languages: ['English', 'Hindi'], genres: ['Fiction', 'Literary Fiction'], featured: true },
        { name: 'Paper Lantern Books', description: 'Thoughtful books for curious young readers.', country: 'India', languages: ['English'], genres: ['Fantasy', 'Young Adult'], featured: true },
        { name: 'Saffron Leaf Publishing', description: 'Non-fiction, history and contemporary ideas.', country: 'India', languages: ['English', 'Tamil'], genres: ['History', 'Non-Fiction'] }
    ]);

    if (!authorCount) await Author.insertMany([
        { name: 'Ananya Rao', biography: 'A Bengaluru-based writer exploring memory, family and modern city life.', country: 'India', languages: ['English', 'Kannada'], genres: ['Fiction'], classification: 'Emerging Author', publisher: 'Riverstone Press', featured: true },
        { name: 'Kabir Mehta', biography: 'A debut storyteller writing warm, character-led speculative fiction.', country: 'India', languages: ['English', 'Hindi'], genres: ['Sci-Fi', 'Fantasy'], classification: 'Debut Author', publisher: 'Paper Lantern Books', featured: true },
        { name: 'Mira Sen', biography: 'Essayist and researcher focused on culture, food and everyday histories.', country: 'India', languages: ['English', 'Bengali'], genres: ['History', 'Non-Fiction'], classification: 'Emerging Author', publisher: 'Saffron Leaf Publishing', featured: true }
    ]);

    if (!upcomingCount) await UpcomingBook.insertMany([
        { title: 'Monsoon Letters', author: 'Ananya Rao', publisher: 'Riverstone Press', description: 'A tender novel about a family reunited during one unforgettable monsoon.', genre: 'Fiction', language: 'English', publicationDate: new Date('2026-09-15'), expectedPrice: 499, preOrderStatus: 'Pre-order open', featured: true },
        { title: 'The Lantern Atlas', author: 'Kabir Mehta', publisher: 'Paper Lantern Books', description: 'A young cartographer discovers maps that redraw the future.', genre: 'Fantasy', language: 'English', publicationDate: new Date('2026-10-10'), expectedPrice: 599, preOrderStatus: 'Pre-order open', featured: true },
        { title: 'Streets That Remember', author: 'Mira Sen', publisher: 'Saffron Leaf Publishing', description: 'An illustrated journey through the living histories of Indian cities.', genre: 'History', language: 'English', publicationDate: new Date('2026-11-05'), expectedPrice: 699, preOrderStatus: 'Coming soon', featured: true }
    ]);

    if (!fairCount) {
        const fairs = await BookFair.insertMany([
            { name: 'BookVerse Readers Fair', organizer: 'BookVerse', startDate: new Date('2026-09-25'), endDate: new Date('2026-09-27'), venue: 'Bangalore International Centre', city: 'Bengaluru', state: 'Karnataka', country: 'India', description: 'A weekend of new voices, publisher showcases and reader meet-ups.', status: 'Upcoming', featured: true },
            { name: 'Pages & Perspectives', organizer: 'BookVerse', startDate: new Date('2026-11-14'), endDate: new Date('2026-11-16'), venue: 'India Habitat Centre', city: 'New Delhi', state: 'Delhi', country: 'India', description: 'A book fair celebrating fiction, ideas and independent publishing.', status: 'Upcoming', featured: true }
        ]);
        const publishers = await Publisher.find().limit(2);
        if (publishers.length) await Booth.insertMany(publishers.map((publisher, index) => ({ fairId: fairs[0]._id, publisherId: publisher._id, boothNumber: `A-${index + 12}`, location: 'Hall A', description: `Meet the team from ${publisher.name} and explore their featured titles.` })));
    }
    console.log('🌱 Discovery starter data checked.');
};
