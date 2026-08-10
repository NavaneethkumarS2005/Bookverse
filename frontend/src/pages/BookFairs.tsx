import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import DiscoveryCard from '../components/DiscoveryCard';

interface BookFair {
  _id: string;
  name: string;
  organizer?: string;
  city?: string;
  state?: string;
  country?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  status?: string;
}

const BookFairs: React.FC = () => {
  const [fairs, setFairs] = useState<BookFair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookFairs = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/discovery/book-fairs`, {
          params: { status: 'Upcoming' }
        });
        setFairs(res.data);
      } catch (err) {
        console.error('Failed to load book fairs:', err);
        setError('Could not load book fairs right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchBookFairs();
  }, []);

  return (
    <div className="min-h-screen pt-28 pb-16 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-5">
        <div className="mb-12 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 mb-3">Book Fair Discovery</p>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">Book Fairs & Events</h1>
          <p className="mt-4 text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">Explore upcoming book fairs, participating publishers, and event locations across India.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-72 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center text-slate-600 dark:text-slate-300">
            {error}
          </div>
        ) : fairs.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center text-slate-600 dark:text-slate-300">
            No book fairs are available right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {fairs.map(fair => (
              <DiscoveryCard
                key={fair._id}
                title={fair.name}
                subtitle={`${fair.city || fair.state || fair.country || 'Location unknown'}`}
                description={fair.description}
                badge={fair.status || 'Upcoming'}
                label={fair.startDate ? new Date(fair.startDate).toLocaleDateString() : 'Date TBD'}
                to={`/book-fairs/${fair._id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookFairs;
