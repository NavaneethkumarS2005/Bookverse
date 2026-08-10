import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import DiscoveryCard from '../components/DiscoveryCard';

interface Publisher {
  _id: string;
  name: string;
  description?: string;
  country?: string;
  website?: string;
  languages?: string[];
  genres?: string[];
  logo?: string;
}

const Publishers: React.FC = () => {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublishers = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/discovery/publishers`, {
          params: { sort: 'featured' }
        });
        setPublishers(res.data);
      } catch (err) {
        console.error('Failed to load publishers:', err);
        setError('Could not load publishers right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchPublishers();
  }, []);

  return (
    <div className="min-h-screen pt-28 pb-16 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-5">
        <div className="mb-12 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 mb-3">Publisher Intelligence</p>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">Publishers</h1>
          <p className="mt-4 text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">Explore publishers, their language focus, genres, and upcoming titles in BookVerse.</p>
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
        ) : publishers.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center text-slate-600 dark:text-slate-300">
            No publishers are available right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {publishers.map(publisher => (
              <DiscoveryCard
                key={publisher._id}
                title={publisher.name}
                subtitle={publisher.country || 'Country not set'}
                description={publisher.description}
                image={publisher.logo || '/images/publisher-placeholder.jpg'}
                badge={publisher.genres?.slice(0, 2).join(', ') || 'Genres unknown'}
                label={publisher.languages?.join(', ') || 'Languages unknown'}
                to={`/publishers/${publisher._id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Publishers;
