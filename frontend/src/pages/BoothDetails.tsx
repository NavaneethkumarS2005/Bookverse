import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { API_URL } from '../config';
import ProductCard from '../components/ProductCard';
import { Book, IBookFair, IPublisher } from '../types';
import { IDiscoveryBooth } from '../types/discovery';

interface BoothDetail extends IDiscoveryBooth {
    books?: Book[];
}

const STATUS_STYLES: Record<string, string> = {
    AVAILABLE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    BOOKED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    RESERVED: 'bg-amber-50 text-amber-700 border-amber-200',
    MAINTENANCE: 'bg-slate-100 text-slate-700 border-slate-200'
};

const populated = <T extends { _id: string }>(ref?: string | T): T | null => typeof ref === 'object' && ref !== null ? ref : null;

const BoothDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [booth, setBooth] = useState<BoothDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        const fetchBooth = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data } = await axios.get(`${API_URL}/api/discovery/booths/${id}`);
                if (!active) return;
                setBooth(data && typeof data === 'object' ? data : null);
            } catch (err) {
                console.error('Error fetching booth:', err);
                if (active) setError('Failed to load this booth. Please try again later.');
            } finally {
                if (active) setLoading(false);
            }
        };
        if (id) fetchBooth();
        return () => { active = false; };
    }, [id]);

    const fair = populated<IBookFair>(booth?.fairId);
    const publisher = populated<IPublisher>(booth?.publisherId);
    const books = booth?.books || [];

    return (
        <div className="min-h-screen pt-24 pb-12 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="max-w-6xl mx-auto px-5">
                <Link to="/book-fairs" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">← Back to book fairs</Link>
                {loading ? (
                    <div className="mt-6 space-y-6"><div className="h-56 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" /><div className="h-40 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" /></div>
                ) : error ? (
                    <div className="mt-6 bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm text-red-500">{error}</div>
                ) : !booth ? (
                    <div className="mt-6 bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border border-slate-200 dark:border-slate-800 shadow-sm"><div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-4xl mb-6 mx-auto">🏷️</div><h3 className="font-outfit text-xl font-bold text-slate-900 dark:text-white mb-2">Booth not found</h3><p className="text-slate-500 dark:text-slate-400">This booth may have been removed or is not published yet.</p></div>
                ) : (
                    <>
                        <section className="mt-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 mb-2">Booth</p><h1 className="font-outfit text-4xl font-bold text-slate-900 dark:text-white">{booth.boothNumber || 'Unnumbered booth'}</h1><p className="mt-3 text-slate-600 dark:text-slate-300">{publisher ? publisher.name : 'Publisher to be announced'}{fair ? ` · ${fair.name}` : ''}</p></div>{booth.status && <span className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${STATUS_STYLES[booth.status] || STATUS_STYLES.MAINTENANCE}`}>{booth.status.charAt(0) + booth.status.slice(1).toLowerCase()}</span>}</div>
                            <dl className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">{[{ label: 'Section', value: booth.section || '—' }, { label: 'Floor', value: booth.floor || '—' }, { label: 'Size', value: booth.size?.width && booth.size?.height ? `${booth.size.width} × ${booth.size.height} ${booth.size.unit || 'm'}` : '—' }, { label: 'Capacity', value: booth.capacity ? `${booth.capacity} visitors` : '—' }].map(item => <div key={item.label} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4"><dt className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{item.label}</dt><dd className="mt-1 font-semibold text-slate-900 dark:text-white">{item.value}</dd></div>)}</dl>
                            {booth.amenities && booth.amenities.length > 0 && <div className="mt-6 flex flex-wrap gap-2">{booth.amenities.map(amenity => <span key={amenity} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">{amenity}</span>)}</div>}
                            {booth.specialNotes && <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">{booth.specialNotes}</p>}
                            <div className="mt-8 flex flex-wrap gap-3">{fair && <Link to={`/book-fairs/${fair._id}`} className="px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-indigo-600 hover:shadow-lg transition-all">View fair</Link>}{publisher && <Link to={`/publishers/${publisher._id}`} className="px-5 py-2.5 rounded-full text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">View publisher</Link>}</div>
                        </section>
                        <section className="mt-10"><h2 className="font-outfit text-2xl font-bold text-slate-900 dark:text-white mb-5">Featured books</h2>{books.length === 0 ? <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm text-slate-500 dark:text-slate-400">No featured books have been listed for this booth yet.</div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{books.map(book => <ProductCard key={book._id} book={book} />)}</div>}</section>
                    </>
                )}
            </div>
        </div>
    );
};

export default BoothDetails;
