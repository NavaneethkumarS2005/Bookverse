import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

type Publisher = {
    _id: string;
    name: string;
    description?: string;
    contactEmail?: string;
    contactPhone?: string;
    website?: string;
    headquarters?: string;
    country?: string;
    applicationStatus: 'pending' | 'approved' | 'rejected';
    isActive?: boolean;
    rejectionReason?: string;
};

type BookSubmission = {
    _id: string;
    title: string;
    author: string;
    genre: string;
    price: number;
    isbn?: string;
    stock: number;
    publicationStatus: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
};

const tabs = ['pending', 'approved', 'rejected', 'all'] as const;

const AdminPublisherManagement: React.FC = () => {
    const [status, setStatus] = useState<(typeof tabs)[number]>('pending');
    const [publishers, setPublishers] = useState<Publisher[]>([]);
    const [expandedId, setExpandedId] = useState('');
    const [booksByPublisher, setBooksByPublisher] = useState<Record<string, BookSubmission[]>>({});
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const loadPublishers = async () => {
        setLoading(true); setError('');
        try {
            const { data } = await axios.get(`${API_URL}/api/admin/publishers`, { params: { status }, withCredentials: true });
            setPublishers(Array.isArray(data) ? data : []);
        } catch (requestError: any) {
            setError(requestError.response?.data?.message || 'Unable to load publisher records.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadPublishers(); }, [status]);

    const loadBooks = async (publisherId: string) => {
        if (expandedId === publisherId) { setExpandedId(''); return; }
        setExpandedId(publisherId);
        if (booksByPublisher[publisherId]) return;
        setBusyId(publisherId); setError('');
        try {
            const { data } = await axios.get(`${API_URL}/api/admin/publishers/${publisherId}/books`, { withCredentials: true });
            setBooksByPublisher(current => ({ ...current, [publisherId]: Array.isArray(data) ? data : [] }));
        } catch (requestError: any) {
            setError(requestError.response?.data?.message || 'Unable to load publisher books.');
        } finally {
            setBusyId('');
        }
    };

    const reviewPublisher = async (publisher: Publisher, nextStatus: 'approved' | 'rejected') => {
        const rejectionReason = nextStatus === 'rejected' ? window.prompt('Reason for rejecting this application:')?.trim() || '' : '';
        if (nextStatus === 'rejected' && !rejectionReason) return;
        setBusyId(publisher._id); setError(''); setNotice('');
        try {
            const { data } = await axios.patch(`${API_URL}/api/admin/publishers/${publisher._id}/status`, { status: nextStatus, rejectionReason }, { withCredentials: true });
            setNotice(data.message);
            await loadPublishers();
        } catch (requestError: any) {
            setError(requestError.response?.data?.message || 'Publisher status could not be updated.');
        } finally {
            setBusyId('');
        }
    };

    const setActive = async (publisher: Publisher, isActive: boolean) => {
        setBusyId(publisher._id); setError(''); setNotice('');
        try {
            const { data } = await axios.patch(`${API_URL}/api/admin/publishers/${publisher._id}/active`, { isActive }, { withCredentials: true });
            setNotice(data.message);
            await loadPublishers();
        } catch (requestError: any) {
            setError(requestError.response?.data?.message || 'Publisher availability could not be changed.');
        } finally {
            setBusyId('');
        }
    };

    const reviewBook = async (publisherId: string, book: BookSubmission, nextStatus: 'approved' | 'rejected') => {
        const reason = nextStatus === 'rejected' ? window.prompt('Reason for rejecting this book:')?.trim() || '' : '';
        if (nextStatus === 'rejected' && !reason) return;
        const stockText = nextStatus === 'approved' ? window.prompt('Initial stock quantity (required; use 0 if unavailable):', '0') : '0';
        if (stockText === null) return;
        setBusyId(book._id); setError(''); setNotice('');
        try {
            const { data } = await axios.patch(`${API_URL}/api/admin/publishers/books/${book._id}/status`, {
                status: nextStatus,
                rejectionReason: reason,
                initialStock: Number(stockText),
            }, { withCredentials: true });
            setNotice(data.message);
            setBooksByPublisher(current => ({ ...current, [publisherId]: current[publisherId].map(item => item._id === book._id ? data.book : item) }));
        } catch (requestError: any) {
            setError(requestError.response?.data?.message || 'Book submission could not be reviewed.');
        } finally {
            setBusyId('');
        }
    };

    return <section className="space-y-5">
        <header><h2 className="text-2xl font-bold text-slate-900 dark:text-white">Publisher management</h2><p className="mt-1 text-sm text-slate-500">Review account applications and book submissions. Approval actions are checked by the backend.</p></header>
        {notice && <div role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</div>}
        {error && <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</div>}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Publisher application status">
            {tabs.map(tab => <button key={tab} role="tab" aria-selected={status === tab} onClick={() => setStatus(tab)} className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${status === tab ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>{tab}</button>)}
        </div>
        {loading ? <div role="status" className="py-10 text-center text-slate-500">Loading publishers…</div> : publishers.length === 0 ? <div className="border-y border-slate-200 py-10 text-center text-slate-500 dark:border-slate-800">No {status === 'all' ? '' : `${status} `}publisher applications.</div> : <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {publishers.map(publisher => <article key={publisher._id} className="py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0"><h3 className="text-lg font-bold text-slate-900 dark:text-white">{publisher.name}</h3><p className="mt-1 text-sm text-slate-500">{publisher.contactEmail}{publisher.contactPhone ? ` · ${publisher.contactPhone}` : ''}</p><p className="mt-1 text-sm text-slate-500">{[publisher.headquarters, publisher.country].filter(Boolean).join(', ') || 'Location not supplied'}</p>{publisher.description && <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{publisher.description}</p>}{publisher.rejectionReason && <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">Reason: {publisher.rejectionReason}</p>}</div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={busyId === publisher._id} onClick={() => loadBooks(publisher._id)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700">{busyId === publisher._id ? 'Loading…' : expandedId === publisher._id ? 'Hide books' : 'View books'}</button>
                        {publisher.applicationStatus === 'pending' && <><button type="button" disabled={busyId === publisher._id} onClick={() => reviewPublisher(publisher, 'approved')} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">Approve</button><button type="button" disabled={busyId === publisher._id} onClick={() => reviewPublisher(publisher, 'rejected')} className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">Reject</button></>}
                        {publisher.applicationStatus === 'approved' && <button type="button" disabled={busyId === publisher._id} onClick={() => setActive(publisher, publisher.isActive === false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700">{publisher.isActive === false ? 'Reactivate' : 'Deactivate'}</button>}
                    </div>
                </div>
                {expandedId === publisher._id && <div className="mt-4 border-l-2 border-indigo-300 pl-4 dark:border-indigo-800">
                    {booksByPublisher[publisher._id]?.length ? booksByPublisher[publisher._id].map(book => <div key={book._id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 py-3 last:border-0 dark:border-slate-800">
                        <div><p className="font-semibold text-slate-900 dark:text-white">{book.title} <span className="font-normal text-slate-500">by {book.author}</span></p><p className="text-xs text-slate-500">{book.genre} · ₹{book.price}{book.isbn ? ` · ISBN ${book.isbn}` : ''} · Stock {book.stock ?? 0} · <span className="capitalize">{book.publicationStatus}</span></p>{book.rejectionReason && <p className="text-sm text-rose-700">{book.rejectionReason}</p>}</div>
                        {book.publicationStatus === 'pending' && <div className="flex gap-2"><button type="button" disabled={busyId === book._id} onClick={() => reviewBook(publisher._id, book, 'approved')} className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Approve & set stock</button><button type="button" disabled={busyId === book._id} onClick={() => reviewBook(publisher._id, book, 'rejected')} className="rounded-md bg-rose-700 px-3 py-2 text-xs font-bold text-white">Reject</button></div>}
                    </div>) : <p className="py-3 text-sm text-slate-500">{booksByPublisher[publisher._id] ? 'No books submitted.' : 'Loading books…'}</p>}
                </div>}
            </article>)}
        </div>}
    </section>;
};

export default AdminPublisherManagement;