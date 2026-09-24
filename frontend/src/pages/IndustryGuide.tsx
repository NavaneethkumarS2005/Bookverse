import React, { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { FiArrowUpRight, FiCalendar, FiMapPin, FiRefreshCw, FiShield } from 'react-icons/fi';
import { API_URL } from '../config';

const IndustryGuide: React.FC = () => {
  const [focus, setFocus] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (event?: FormEvent) => {
    event?.preventDefault(); setLoading(true); setError('');
    try { const response = await axios.get(`${API_URL}/api/industry-guide`, { params: focus.trim() ? { focus: focus.trim() } : {} }); setData(response.data); }
    catch { setError('The publishing guide is unavailable right now. Please try again shortly.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-5 font-outfit text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>{children}</section>;

  return <main className="min-h-screen bg-slate-50 pb-16 pt-10 dark:bg-slate-950">
    <div className="mx-auto max-w-7xl px-5">
      <section className="overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-12 text-white shadow-2xl sm:px-10">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300"><FiShield /> Verified catalog intelligence</p>
        <h1 className="max-w-3xl font-outfit text-4xl font-bold leading-tight sm:text-5xl">Publishing intelligence for readers, collectors and curious minds.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">Explore upcoming releases, emerging authors, publishers and book fairs through one research-ready view.</p>
        <form onSubmit={load} className="mt-8 flex max-w-2xl gap-3"><input value={focus} onChange={event => setFocus(event.target.value)} placeholder="Try “Tamil fiction”, “fantasy”, or “Chennai”" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-400 focus:border-indigo-300" /><button className="rounded-xl bg-indigo-500 px-5 py-3 font-semibold transition hover:bg-indigo-400">Research</button></form>
      </section>
      {loading ? <div className="py-16 text-center text-slate-500"><FiRefreshCw className="mx-auto mb-3 animate-spin text-2xl" />Preparing guide…</div> : error ? <div className="mt-8 rounded-2xl bg-red-50 p-5 text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</div> : data && <>
        <p className="my-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">{data.verification.notice}</p>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Upcoming book recommendations"><div className="space-y-4">{data.upcomingBooks.length ? data.upcomingBooks.map((book: any) => <article key={book._id} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60"><h3 className="font-bold text-slate-900 dark:text-white">{book.title}</h3><p className="mt-1 text-sm text-indigo-600 dark:text-indigo-300">{book.authorId?.name || 'Author pending'} · {book.language || 'Language pending'}</p><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{book.metadata?.teaser || book.description || 'Synopsis pending.'}</p><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Expected: {book.expectedReleaseDate ? new Date(book.expectedReleaseDate).toLocaleDateString() : 'Pending'} · {book.isPreorderAvailable ? 'Pre-order open' : 'Pre-order status pending'}</p></article>) : <Empty />}</div></Card>
          <Card title="New & emerging authors"><div className="space-y-4">{data.emergingAuthors.length ? data.emergingAuthors.map((author: any) => <article key={author._id} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60"><h3 className="font-bold text-slate-900 dark:text-white">{author.name}</h3><p className="mt-1 text-sm text-indigo-600 dark:text-indigo-300">{(author.language || []).join(', ') || 'Language pending'} · {(author.genres || []).join(', ') || 'Genre pending'}</p><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{author.bio || 'Author profile pending.'}</p></article>) : <Empty />}</div></Card>
          <Card title="Publisher profiles"><div className="space-y-4">{data.publishers.length ? data.publishers.map((publisher: any) => <article key={publisher._id} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60"><h3 className="font-bold text-slate-900 dark:text-white">{publisher.name}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{[publisher.headquarters, publisher.country].filter(Boolean).join(' · ') || 'Headquarters pending'}</p><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{publisher.description || 'Publisher focus pending.'}</p>{publisher.website && <a className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600" href={publisher.website} target="_blank" rel="noreferrer">Official website <FiArrowUpRight /></a>}</article>) : <Empty />}</div></Card>
          <Card title="Upcoming book fair schedule"><div className="space-y-4">{data.fairs.length ? data.fairs.map((fair: any) => <article key={fair._id} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60"><h3 className="font-bold text-slate-900 dark:text-white">{fair.name}</h3><p className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><FiMapPin />{[fair.location?.venue, fair.location?.city, fair.location?.country].filter(Boolean).join(', ') || 'Venue pending'}</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><FiCalendar />{new Date(fair.startDate).toLocaleDateString()} – {new Date(fair.endDate).toLocaleDateString()}</p></article>) : <Empty />}</div></Card>
        </div>
        <Card title="Book fair map & publisher shop mapping"><div className="space-y-3">{data.boothMappings.length ? data.boothMappings.map((entry: any, index: number) => <div key={index} className="flex flex-col gap-1 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold text-slate-900 dark:text-white">{entry.booth.publisherId?.name || 'Publisher pending'} · Booth {entry.booth.boothNumber}</span><span className="text-slate-500">{entry.booth.fairId?.name || 'Fair pending'} · {entry.note}</span></div>) : <Empty message="No official booth allocation is currently available in the BookVerse catalog." />}</div></Card>
      </>}
    </div>
  </main>;
};
const Empty = ({ message = 'No verified catalog records match this focus yet.' }: { message?: string }) => <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700">{message}</p>;
export default IndustryGuide;
