import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import DiscoveryCard from '../components/DiscoveryCard';

interface UpcomingBook {
  _id: string;
  title: string;
  author: string;
  publisher?: string;
  coverImage?: string;
  description?: string;
  genre?: string;
  language?: string;
  publicationDate?: string;
  expectedPrice?: number;
  preOrderStatus?: string;
}

const UpcomingBooks: React.FC = () => {
  const [books, setBooks] = useState<UpcomingBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUpcomingBooks = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/discovery/upcoming-books`, {
          params: { sort: 'releaseDate', limit: 24 }
        });
        setBooks(res.data);
      } catch (err) {
        console.error('Failed to load upcoming books:', err);
        setError('Could not load upcoming books right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingBooks();
  }, []);

  return (
    <div className="min-h-screen pt-28 pb-16 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-5">
        <div className="mb-12 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 mb-3">Upcoming Discovery</p>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">Upcoming Books</h1>
          <p className="mt-4 text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">Browse the latest titles coming soon from publishers and new authors across languages and genres.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-72 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center text-slate-600 dark:text-slate-300">
            {error}
          </div>
        ) : books.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center text-slate-600 dark:text-slate-300">
            No upcoming books are available at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {books.map(book => (
              <DiscoveryCard
                key={book._id}
                title={book.title}
                subtitle={`${book.author}${book.publisher ? ` · ${book.publisher}` : ''}`}
                description={book.description}
                image={book.coverImage || '/images/upcoming-book-placeholder.jpg'}
                badge={book.language || 'Unknown'}
                label={book.preOrderStatus || 'Pre-order'}
                to={`/book/${book._id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingBooks;
