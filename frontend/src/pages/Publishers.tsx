import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import DiscoveryCard from '../components/DiscoveryCard';
import { IPublisher } from '../types';

const Publishers: React.FC = () => {
    const [publishers, setPublishers] = useState<IPublisher[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        let active = true;
        const fetchPublishers = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data } = await axios.get(`${API_URL}/api/discovery/publishers`);
                if (!active) return;
                setPublishers(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error fetching publishers:', err);
                if (active) setError('Failed to load publishers. Please try again later.');
            } finally {
                if (active) setLoading(false);
            }
        };
        fetchPublishers();
        return () => { active = false; };
    }, []);

    const visiblePublishers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return publishers;
        return publishers.filter(publisher => [publisher.name, publisher.description, publisher.headquarters, publisher.country, ...(publisher.genres || [])]
            .filter(Boolean).join(' ').toLowerCase().includes(term));
    }, [publishers, searchTerm]);

    const usedImageUrls = new Set<string>();
    const uniquePublisherImage = (publisher: IPublisher): string | undefined => {
        const candidate = publisher.logo?.url?.trim() || publisher.logoUrl?.trim();
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
                            src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80"
                            alt="Publishers banner"
                            className="h-full w-full object-cover opacity-30"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-indigo-950/80" />
                    </div>

                    <div className="relative z-10 grid gap-6 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-indigo-300">Publishing houses</p>
                            <h1 className="mb-3 text-4xl font-black tracking-tight text-white md:text-5xl">Discover the publishers shaping the shelf.</h1>
                            <p className="max-w-xl text-base text-slate-300 md:text-lg">
                                Explore catalogues, key imprint identities, and the publishing houses behind the titles readers love and revisit.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                            {[
                                { label: 'Profiles', value: `${publishers.length}+` },
                                { label: 'Imprints', value: 'Curated' },
                                { label: 'Trust', value: 'Verified' }
                            ].map((stat) => (
                                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                                    <div className="text-2xl font-black text-white">{stat.value}</div>
                                    <div className="mt-1 text-sm text-slate-300">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <div className="mt-8 flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-500">Houses</p>
                        <h2 className="font-outfit text-3xl font-bold text-slate-900 dark:text-white mb-2">Publishers</h2>
                    </div>
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search publishers..." className="w-full md:w-72 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm" />
                </div>
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-80 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />)}</div>
                ) : error ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm text-red-500">{error}</div>
                ) : visiblePublishers.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border border-slate-200 dark:border-slate-800 shadow-sm"><div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-4xl mb-6 mx-auto">🏢</div><h3 className="font-outfit text-xl font-bold text-slate-900 dark:text-white mb-2">No publishers found</h3><p className="text-slate-500 dark:text-slate-400">Publisher profiles will appear here once they are onboarded.</p></div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {visiblePublishers.map((publisher, index) => <DiscoveryCard key={publisher._id} title={publisher.name} subtitle={publisher.headquarters || publisher.country || 'Location not listed'} description={publisher.description} image={uniquePublisherImage(publisher)} fallbackSeed={`publisher:${publisher._id}:${index}`} fallbackIndex={index} badge={publisher.isVerified ? 'Verified' : publisher.genres?.[0] || 'Publisher'} label={publisher.establishedYear ? `Est. ${publisher.establishedYear}` : undefined} to={`/publishers/${publisher._id}`} />)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Publishers;
