import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import DiscoveryCard from '../components/DiscoveryCard';

interface Author {
  _id: string;
  name: string;
  biography?: string;
  country?: string;
  languages?: string[];
  genres?: string[];
  classification?: string;
  profileImage?: string;
}

const Authors: React.FC = () => {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/discovery/authors`, {
          params: { classification: 'Emerging Author' }
        });
        setAuthors(res.data);
      } catch (err) {
        console.error('Failed to load authors:', err);
        setError('Could not load authors right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchAuthors();
  }, []);

  return (
    <div className="min-h-screen pt-28 pb-16 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-5">
        <div className="mb-12 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 mb-3">Discover Authors</p>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">New & Emerging Authors</h1>
          <p className="mt-4 text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">Meet authors with upcoming titles, new voices across languages, and emerging storytellers shaping the next chapter of BookVerse.</p>
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
        ) : authors.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center text-slate-600 dark:text-slate-300">
            No authors are available right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {authors.map(author => (
              <DiscoveryCard
                key={author._id}
                title={author.name}
                subtitle={author.country || 'Unknown region'}
                description={author.biography}
                image={author.profileImage || '/images/author-placeholder.jpg'}
                badge={author.classification || 'Author'}
                label={author.languages?.join(', ') || 'Language unknown'}
                to={`/authors/${author._id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Authors;
