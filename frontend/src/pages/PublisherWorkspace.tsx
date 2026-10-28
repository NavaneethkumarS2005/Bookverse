import React, { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';

type Publisher = {
    _id: string;
    name: string;
    description?: string;
    contactEmail: string;
    contactPhone?: string;
    website?: string;
    headquarters?: string;
    country?: string;
    logoUrl?: string;
    applicationStatus: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    isActive?: boolean;
};

type PublisherBook = {
    _id: string;
    title: string;
    author: string;
    genre: string;
    price: number;
    isbn?: string;
    image?: string;
    description?: string;
    publicationStatus: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
};

type StallBooking = {
    _id: string;
    boothId: string | { _id: string; boothNumber: string; price?: number };
    fairId: string | { _id: string; name: string; startDate: string };
    bookingReference: string;
    quotedPrice: number;
    currency: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    paymentStatus: 'not_integrated';
    rejectionReason?: string;
};

type PublisherForm = Omit<Publisher, '_id' | 'applicationStatus' | 'isActive' | 'rejectionReason'>;
type BookForm = { title: string; author: string; genre: string; price: string; isbn: string; image: string; description: string };

const emptyPublisher: PublisherForm = { name: '', description: '', contactEmail: '', contactPhone: '', website: '', headquarters: '', country: '', logoUrl: '' };
const emptyBook: BookForm = { title: '', author: '', genre: '', price: '', isbn: '', image: '', description: '' };
const statusStyle: Record<string, string> = {
    approved: 'bg-emerald-100 text-emerald-800  ',
    pending: 'bg-amber-100 text-amber-800  ',
    rejected: 'bg-rose-100 text-rose-800  ',
    cancelled: 'bg-slate-100 text-slate-700  ',
};

const PublisherWorkspace: React.FC = () => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const [publisher, setPublisher] = useState<Publisher | null>(null);
    const [publisherForm, setPublisherForm] = useState<PublisherForm>(emptyPublisher);
    const [books, setBooks] = useState<PublisherBook[]>([]);
    const [stallBookings, setStallBookings] = useState<StallBooking[]>([]);
    const [bookForm, setBookForm] = useState<BookForm>(emptyBook);
    const [editingBookId, setEditingBookId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const loadWorkspace = async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await axios.get(`${API_URL}/api/publishers/me`, { withCredentials: true });
            setPublisher(data);
            setPublisherForm({
                name: data.name || '', description: data.description || '', contactEmail: data.contactEmail || '',
                contactPhone: data.contactPhone || '', website: data.website || '', headquarters: data.headquarters || '',
                country: data.country || '', logoUrl: data.logoUrl || '',
            });
            if (data.applicationStatus === 'approved') {
                const [booksResponse, bookingsResponse] = await Promise.all([
                    axios.get(`${API_URL}/api/publishers/me/books`, { withCredentials: true }),
                    axios.get(`${API_URL}/api/booth-bookings/me`, { withCredentials: true }),
                ]);
                setBooks(Array.isArray(booksResponse.data) ? booksResponse.data : []);
                setStallBookings(Array.isArray(bookingsResponse.data) ? bookingsResponse.data : []);
            } else {
                setBooks([]);
                setStallBookings([]);
            }
        } catch (requestError: any) {
            if (requestError.response?.status !== 404) setError(requestError.response?.data?.message || 'Unable to load the publisher workspace.');
            setPublisher(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadWorkspace(); }, []);

    const savePublisher = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true); setError(''); setNotice('');
        try {
            if (publisher) {
                const { data } = await axios.patch(`${API_URL}/api/publishers/me`, publisherForm, { withCredentials: true });
                setPublisher(data.publisher);
                setNotice(data.message);
            } else {
                const { data } = await axios.post(`${API_URL}/api/publishers`, publisherForm, { withCredentials: true });
                setPublisher(data.publisher);
                setNotice(data.message);
            }
            await loadWorkspace();
        } catch (requestError: any) {
            setError(requestError.response?.data?.message || 'Publisher application could not be saved.');
        } finally {
            setSaving(false);
        }
    };

    const submitBook = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true); setError(''); setNotice('');
        const payload = { ...bookForm, price: Number(bookForm.price) };
        try {
            const { data } = editingBookId
                ? await axios.patch(`${API_URL}/api/publishers/me/books/${editingBookId}`, payload, { withCredentials: true })
                : await axios.post(`${API_URL}/api/publishers/me/books`, payload, { withCredentials: true });
            setNotice(data.message);
            setBookForm(emptyBook); setEditingBookId(null);
            await loadWorkspace();
        } catch (requestError: any) {
            setError(requestError.response?.data?.message || 'Book submission could not be saved.');
        } finally {
            setSaving(false);
        }
    };

    const editBook = (book: PublisherBook) => {
        setEditingBookId(book._id);
        setBookForm({ title: book.title, author: book.author, genre: book.genre, price: String(book.price), isbn: book.isbn || '', image: book.image || '', description: book.description || '' });
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    };

    if (!user) return <main className="mx-auto min-h-screen max-w-4xl px-5 pb-16 pt-32 text-center"><h1 className="text-3xl font-bold text-slate-900 ">Publisher workspace</h1><p className="mt-3 text-slate-600 ">Sign in to apply or manage a publisher profile.</p><Link className="mt-6 inline-flex rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white" to="/login">Sign in</Link></main>;

    return <main className="min-h-screen bg-slate-50 px-5 pb-16 pt-28 ">
        <div className="mx-auto max-w-5xl">
            <header className="mb-8 border-b border-slate-200 pb-6 ">
                <p className="text-sm font-bold uppercase tracking-widest text-indigo-600 ">BookVerse partners</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900 ">Publisher workspace</h1>
                <p className="mt-2 text-slate-600 ">Submit a publisher profile for review, then manage book submissions from this account.</p>
            </header>

            {error && <div role="alert" className="mb-5 rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-800   ">{error}</div>}
            {notice && <div role="status" className="mb-5 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-800   ">{notice}</div>}
            {loading ? <div className="py-14 text-center text-slate-500" role="status">Loading publisher workspace…</div> : <>
                {publisher && <section className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6 ">
                    <div><h2 className="text-xl font-bold text-slate-900 ">{publisher.name}</h2><p className="mt-1 text-sm text-slate-500">{publisher.contactEmail}</p></div>
                    <span className={`rounded-full px-3 py-1 text-sm font-bold capitalize ${statusStyle[publisher.applicationStatus]}`}>{publisher.applicationStatus}</span>
                    {publisher.rejectionReason && <p className="w-full text-sm text-rose-700 ">Review note: {publisher.rejectionReason}</p>}
                </section>}

                <form onSubmit={savePublisher} className="grid gap-4 border-b border-slate-200 pb-8 ">
                    <h2 className="text-xl font-bold text-slate-900 ">{publisher ? 'Publisher profile' : 'Apply as a publisher'}</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Publisher name" required value={publisherForm.name} onChange={name => setPublisherForm({ ...publisherForm, name })} />
                        <Field label="Contact email" type="email" required value={publisherForm.contactEmail} onChange={contactEmail => setPublisherForm({ ...publisherForm, contactEmail })} />
                        <Field label="Phone" value={publisherForm.contactPhone || ''} onChange={contactPhone => setPublisherForm({ ...publisherForm, contactPhone })} />
                        <Field label="Website" type="url" value={publisherForm.website || ''} onChange={website => setPublisherForm({ ...publisherForm, website })} />
                        <Field label="Headquarters" value={publisherForm.headquarters || ''} onChange={headquarters => setPublisherForm({ ...publisherForm, headquarters })} />
                        <Field label="Country" value={publisherForm.country || ''} onChange={country => setPublisherForm({ ...publisherForm, country })} />
                        <Field label="Logo URL" type="url" value={publisherForm.logoUrl || ''} onChange={logoUrl => setPublisherForm({ ...publisherForm, logoUrl })} />
                    </div>
                    <label className="grid gap-1 text-sm font-semibold text-slate-700 ">Description<textarea maxLength={2000} rows={4} value={publisherForm.description || ''} onChange={event => setPublisherForm({ ...publisherForm, description: event.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal  " /></label>
                    <div className="flex flex-wrap items-center gap-3"><button disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : publisher ? 'Save profile' : 'Submit application'}</button>{publisher?.applicationStatus === 'pending' && <span className="text-sm text-slate-500">Your application is awaiting admin review.</span>}</div>
                </form>

                {publisher?.applicationStatus === 'approved' && <>
                    <section className="border-b border-slate-200 py-8 ">
                        <h2 className="mb-2 text-xl font-bold text-slate-900 ">Stall requests</h2>
                        <p className="mb-4 text-sm text-slate-600 ">Admin approval is separate from payment. Payment processing is not integrated; no payment has been collected.</p>
                        {stallBookings.length === 0 ? <p className="py-3 text-slate-500">No stall requests.</p> : <div className="divide-y divide-slate-200 ">{stallBookings.map(booking => {
                            const booth = typeof booking.boothId === 'object' ? booking.boothId : null;
                            const fair = typeof booking.fairId === 'object' ? booking.fairId : null;
                            return <article key={booking._id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                                <div><h3 className="font-semibold text-slate-900 ">{fair?.name || 'Book fair'}{booth ? ` · Stall ${booth.boothNumber}` : ''}</h3><p className="text-sm text-slate-500">{fair?.startDate ? new Date(fair.startDate).toLocaleDateString() : 'Date not available'} · ₹{booking.quotedPrice.toLocaleString('en-IN')} {booking.currency}</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusStyle[booking.status]}`}>{booking.status}</span><p className="mt-1 text-xs text-slate-500">Payment status: not integrated · {booking.bookingReference}</p>{booking.rejectionReason && <p className="mt-1 text-sm text-rose-700 ">{booking.rejectionReason}</p>}</div>
                                {booking.status === 'pending' && <Link to={`/booths/${booth?._id || ''}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700  ">View request</Link>}
                            </article>;
                        })}</div>}
                    </section>
                    <section className="border-b border-slate-200 py-8 ">
                        <h2 className="mb-4 text-xl font-bold text-slate-900 ">Your book submissions</h2>
                        {books.length === 0 ? <p className="py-4 text-slate-500">No books submitted yet.</p> : <div className="divide-y divide-slate-200 ">{books.map(book => <article key={book._id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                            <div><h3 className="font-semibold text-slate-900 ">{book.title}</h3><p className="text-sm text-slate-500">{book.author} · {book.genre} · ₹{book.price}</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusStyle[book.publicationStatus]}`}>{book.publicationStatus}</span>{book.rejectionReason && <p className="mt-2 text-sm text-rose-700 ">Review note: {book.rejectionReason}</p>}</div>
                            <button type="button" onClick={() => editBook(book)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700  ">Edit / resubmit</button>
                        </article>)}</div>}
                    </section>
                    <form onSubmit={submitBook} className="grid gap-4 pt-8">
                        <h2 className="text-xl font-bold text-slate-900 ">{editingBookId ? 'Edit book submission' : 'Submit a book'}</h2>
                        <p className="text-sm text-slate-600 ">New submissions and edits are reviewed by BookVerse before appearing in the public catalog. Stock is set by an admin after review.</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Title" required value={bookForm.title} onChange={title => setBookForm({ ...bookForm, title })} />
                            <Field label="Author" required value={bookForm.author} onChange={author => setBookForm({ ...bookForm, author })} />
                            <Field label="Genre" required value={bookForm.genre} onChange={genre => setBookForm({ ...bookForm, genre })} />
                            <Field label="Price" type="number" min="0" required value={bookForm.price} onChange={price => setBookForm({ ...bookForm, price })} />
                            <Field label="ISBN (optional)" value={bookForm.isbn} onChange={isbn => setBookForm({ ...bookForm, isbn })} />
                            <Field label="Cover image URL" type="url" value={bookForm.image} onChange={image => setBookForm({ ...bookForm, image })} />
                        </div>
                        <label className="grid gap-1 text-sm font-semibold text-slate-700 ">Description<textarea maxLength={5000} rows={4} value={bookForm.description} onChange={event => setBookForm({ ...bookForm, description: event.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal  " /></label>
                        <div className="flex gap-3"><button disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : editingBookId ? 'Resubmit changes' : 'Submit for review'}</button>{editingBookId && <button type="button" onClick={() => { setEditingBookId(null); setBookForm(emptyBook); }} className="rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-700  ">Cancel</button>}</div>
                    </form>
                </>}
            </>}</div>
    </main>;
};

const Field = ({ label, value, onChange, type = 'text', required = false, min }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; min?: string }) => <label className="grid gap-1 text-sm font-semibold text-slate-700 ">{label}<input type={type} min={min} required={required} value={value} onChange={event => onChange(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal  " /></label>;

export default PublisherWorkspace;