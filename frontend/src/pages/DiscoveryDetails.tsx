import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { API_URL } from '../config';
import ProductCard from '../components/ProductCard';

type DetailKind = 'authors' | 'publishers' | 'book-fairs' | 'booths';
const labels: Record<DetailKind, string> = { authors: 'Author', publishers: 'Publisher', 'book-fairs': 'Book fair', booths: 'Booth' };

const DiscoveryDetails: React.FC<{ kind: DetailKind }> = ({ kind }) => {
  const { id } = useParams();
  const [item, setItem] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => { axios.get(`${API_URL}/api/discovery/${kind}/${id}`).then(r => setItem(r.data)).catch(() => setError(`Unable to load this ${labels[kind].toLowerCase()}.`)); }, [id, kind]);
  if (error) return <div className="min-h-screen pt-28 text-center text-red-500">{error}</div>;
  if (!item) return <div className="min-h-screen pt-28 text-center text-slate-500">Loading…</div>;
  const title = item.name || `Booth ${item.boothNumber || ''}`;
  const description = item.biography || item.description || item.location || 'More details will be announced soon.';
  const related = item.books || item.booths || [];
  return <main className="min-h-screen bg-slate-50 px-5 pb-12 pt-28 dark:bg-slate-950"><div className="mx-auto max-w-6xl">
    <Link to={`/${kind}`} className="text-sm font-semibold text-indigo-600">← Back to {kind.replace('-', ' ')}</Link>
    <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h1 className="text-4xl font-bold text-slate-900 dark:text-white">{title}</h1><p className="mt-4 max-w-3xl text-slate-600 dark:text-slate-300">{description}</p>
      {(item.city || item.venue || item.publisherId?.name || item.fairId?.name) && <p className="mt-4 text-sm text-indigo-600">{[item.city, item.venue, item.publisherId?.name, item.fairId?.name].filter(Boolean).join(' · ')}</p>}
    </section>
    {related.length > 0 && <section className="mt-10"><h2 className="mb-5 text-2xl font-bold text-slate-900 dark:text-white">{kind === 'book-fairs' ? 'Booths' : 'Books'}</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{related.map((entry: any) => entry.title ? <ProductCard key={entry._id || entry.id} book={entry} /> : <Link key={entry._id} to={`/booths/${entry._id}`} className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">Booth {entry.boothNumber || 'details'} →</Link>)}</div>
    </section>}
  </div></main>;
};
export default DiscoveryDetails;
