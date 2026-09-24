import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import DiscoveryCard from '../components/DiscoveryCard';
import { BookFairStatus, IBookFair } from '../types';

const STATUS_FILTERS: Array<'All' | BookFairStatus> = ['All', 'UPCOMING', 'ONGOING', 'COMPLETED'];
const formatRange = (start?: string, end?: string): string => {
    if (!start) return 'Dates TBA';
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startLabel = new Date(start).toLocaleDateString(undefined, options);
    if (!end) return startLabel;
    return `${startLabel} – ${new Date(end).toLocaleDateString(undefined, { ...options, year: 'numeric' })}`;
};
const locationOf = (fair: IBookFair): string => {
    if (fair.isVirtual) return 'Virtual event';
    const parts = [fair.location?.venue, fair.location?.city, fair.location?.country].filter(Boolean);
    return parts.length ? parts.join(', ') : 'Location to be announced';
};

const BookFairs: React.FC = () => {
    const [fairs, setFairs] = useState<IBookFair[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | BookFairStatus>('All');

    useEffect(() => {
        let active = true;
        const fetchBookFairs = async () => {
            setLoading(true); setError(null);
            try {
                const { data } = await axios.get(`${API_URL}/api/discovery/book-fairs`);
                if (!active) return;
                setFairs(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error fetching book fairs:', err);
                if (active) setError('Failed to load book fairs. Please try again later.');
            } finally { if (active) setLoading(false); }
        };
        fetchBookFairs();
        return () => { active = false; };
    }, []);

    const visibleFairs = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return fairs.filter(fair => {
            const matchesStatus = statusFilter === 'All' || fair.status === statusFilter;
            const matchesTerm = !term || [fair.name, fair.description, locationOf(fair)].filter(Boolean).join(' ').toLowerCase().includes(term);
            return matchesStatus && matchesTerm;
        });
    }, [fairs, searchTerm, statusFilter]);

    const usedImageUrls = new Set<string>();
    const uniqueFairImage = (fair: IBookFair): string | undefined => {
        const candidate = fair.featuredImage?.url?.trim();
        if (!candidate || usedImageUrls.has(candidate)) return undefined;
        usedImageUrls.add(candidate);
        return candidate;
    };

    return (
        <div className="min-h-screen pt-24 pb-12 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-5">
                <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-900 p-6 shadow-2xl shadow-slate-200/40 dark:border-slate-800 dark:shadow-none sm:p-8 lg:p-10">
                    <div className="absolute inset-0">
                        <img
                            src="https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80"
                            alt="Book fairs banner"
                            className="h-full w-full object-cover opacity-30"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-indigo-950/80" />
                    </div>

                    <div className="relative z-10 grid gap-6 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-indigo-300">Community events</p>
                            <h1 className="mb-3 text-4xl font-black tracking-tight text-white md:text-5xl">Meet the events shaping the reading culture.</h1>
                            <p className="max-w-xl text-base text-slate-300 md:text-lg">
                                Explore upcoming and ongoing book fairs, their locations, and the publishers and readers gathering around each event.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                            {[
                                { label: 'Events', value: `${fairs.length}+` },
                                { label: 'Cities', value: 'Global' },
                                { label: 'Format', value: 'Hybrid' }
                            ].map((stat) => (
                                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                                    <div className="text-2xl font-black text-white">{stat.value}</div>
                                    <div className="mt-1 text-sm text-slate-300">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <div className="mt-8 flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-500">Events</p>
                        <h2 className="font-outfit text-3xl font-bold text-slate-900 dark:text-white mb-2">Book Fairs</h2>
                    </div>
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search fairs or cities..." className="w-full md:w-72 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm" />
                </div>
                <div className="flex flex-wrap gap-2 mb-10">{STATUS_FILTERS.map(status => <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${statusFilter === status ? 'bg-indigo-500 border-indigo-500 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700'}`}>{status === 'All' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}</button>)}</div>
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-80 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />)}</div>
                ) : error ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm text-red-500">{error}</div>
                ) : visibleFairs.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border border-slate-200 dark:border-slate-800 shadow-sm"><div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-4xl mb-6 mx-auto">🎪</div><h3 className="font-outfit text-xl font-bold text-slate-900 dark:text-white mb-2">No book fairs found</h3><p className="text-slate-500 dark:text-slate-400">Try another status filter or check back later.</p></div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{visibleFairs.map((fair, index) => <DiscoveryCard key={fair._id} title={fair.name} subtitle={locationOf(fair)} description={fair.description || locationOf(fair)} image={uniqueFairImage(fair)} fallbackSeed={`book-fair:${fair._id}:${index}`} fallbackIndex={index} badge={fair.status ? fair.status.charAt(0) + fair.status.slice(1).toLowerCase() : 'Upcoming'} label={formatRange(fair.startDate, fair.endDate)} to={`/book-fairs/${fair._id}`} />)}</div>
                )}
            </div>
        </div>
    );
};

export default BookFairs;
