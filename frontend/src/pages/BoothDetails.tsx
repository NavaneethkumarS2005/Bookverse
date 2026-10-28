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

interface BoothBooking {
    _id: string;
    boothId: string | IDiscoveryBooth;
    fairId: string | IBookFair;
    bookingReference: string;
    quotedPrice: number;
    currency: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    paymentStatus: 'not_integrated';
    rejectionReason?: string;
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
    const [bookings, setBookings] = useState<BoothBooking[]>([]);
    const [bookingBusy, setBookingBusy] = useState(false);
    const [bookingMessage, setBookingMessage] = useState('');
    const [bookingError, setBookingError] = useState('');
    const isSignedIn = Boolean(localStorage.getItem('user'));

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

    useEffect(() => {
        if (!isSignedIn) return;
        let active = true;
        axios.get(`${API_URL}/api/booth-bookings/me`, { withCredentials: true })
            .then(({ data }) => { if (active) setBookings(Array.isArray(data) ? data : []); })
            .catch(() => { if (active) setBookingError('Unable to load your stall requests.'); });
        return () => { active = false; };
    }, [isSignedIn]);

    const requestBooking = async () => {
        if (!booth) return;
        setBookingBusy(true); setBookingError(''); setBookingMessage('');
        try {
            const { data } = await axios.post(`${API_URL}/api/booth-bookings`, { boothId: booth._id }, { withCredentials: true });
            setBookingMessage(data.message);
            const [{ data: updatedBooth }, { data: updatedBookings }] = await Promise.all([
                axios.get(`${API_URL}/api/discovery/booths/${booth._id}`),
                axios.get(`${API_URL}/api/booth-bookings/me`, { withCredentials: true }),
            ]);
            setBooth(updatedBooth);
            setBookings(Array.isArray(updatedBookings) ? updatedBookings : []);
        } catch (requestError: any) {
            setBookingError(requestError.response?.data?.message || 'Unable to request this stall.');
        } finally {
            setBookingBusy(false);
        }
    };

    const cancelBooking = async (bookingId: string) => {
        setBookingBusy(true); setBookingError(''); setBookingMessage('');
        try {
            const { data } = await axios.patch(`${API_URL}/api/booth-bookings/${bookingId}/cancel`, {}, { withCredentials: true });
            setBookingMessage(data.message);
            const [{ data: updatedBooth }, { data: updatedBookings }] = await Promise.all([
                axios.get(`${API_URL}/api/discovery/booths/${booth?._id}`),
                axios.get(`${API_URL}/api/booth-bookings/me`, { withCredentials: true }),
            ]);
            setBooth(updatedBooth);
            setBookings(Array.isArray(updatedBookings) ? updatedBookings : []);
        } catch (requestError: any) {
            setBookingError(requestError.response?.data?.message || 'Unable to cancel this request.');
        } finally {
            setBookingBusy(false);
        }
    };
    const fair = populated<IBookFair>(booth?.fairId);
    const publisher = populated<IPublisher>(booth?.publisherId);
    const books = booth?.books || [];
    const boothFacts = booth ? [
        { label: 'Section', value: booth.section || '—' },
        { label: 'Floor', value: booth.floor || '—' },
        { label: 'Size', value: booth.size?.width && booth.size?.height ? `${booth.size.width} × ${booth.size.height} ${booth.size.unit || 'm'}` : '—' },
        { label: 'Capacity', value: booth.capacity ? `${booth.capacity} visitors` : '—' },
        { label: 'Stall price', value: typeof booth.price === 'number' ? `₹${booth.price.toLocaleString('en-IN')}` : 'Not configured' },
    ] : [];

    return (
        <div className="min-h-screen pt-24 pb-12 bg-slate-50  transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-5">
                <Link to="/book-fairs" className="text-sm font-semibold text-indigo-600  hover:underline">← Back to book fairs</Link>
                {loading ? (
                    <div className="mt-6 space-y-6"><div className="h-56 rounded-3xl bg-slate-200  animate-pulse" /><div className="h-40 rounded-3xl bg-slate-200  animate-pulse" /></div>
                ) : error ? (
                    <div className="mt-6 bg-white  rounded-3xl p-12 text-center border border-slate-200  shadow-sm text-red-500">{error}</div>
                ) : !booth ? (
                    <div className="mt-6 bg-white  rounded-3xl p-16 text-center border border-slate-200  shadow-sm"><div className="w-20 h-20 bg-slate-100  rounded-full flex items-center justify-center text-4xl mb-6 mx-auto">🏷️</div><h3 className="font-outfit text-xl font-bold text-slate-900  mb-2">Booth not found</h3><p className="text-slate-500 ">This booth may have been removed or is not published yet.</p></div>
                ) : (
                    <>
                        <section className="mt-5 rounded-3xl border border-slate-200  bg-white  p-8 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm uppercase tracking-[0.3em] text-indigo-600  mb-2">Booth</p><h1 className="font-outfit text-4xl font-bold text-slate-900 ">{booth.boothNumber || 'Unnumbered booth'}</h1><p className="mt-3 text-slate-600 ">{publisher ? publisher.name : 'Publisher to be announced'}{fair ? ` · ${fair.name}` : ''}</p></div>{booth.status && <span className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${STATUS_STYLES[booth.status] || STATUS_STYLES.MAINTENANCE}`}>{booth.status.charAt(0) + booth.status.slice(1).toLowerCase()}</span>}</div>
                                <dl className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">{boothFacts.map(item => <div key={item.label} className="rounded-2xl border border-slate-200  bg-slate-50  p-4"><dt className="text-xs uppercase tracking-wider text-slate-500 ">{item.label}</dt><dd className="mt-1 font-semibold text-slate-900 ">{item.value}</dd></div>)}</dl>
                            {booth.specialNotes && <p className="mt-6 text-sm text-slate-600 ">{booth.specialNotes}</p>}
                                                        <section className="mt-8 border-t border-slate-200 pt-6 " aria-labelledby="stall-request-heading">
                                                            <h2 id="stall-request-heading" className="text-lg font-bold text-slate-900 ">Stall request</h2>
                                                            <p className="mt-2 text-sm text-slate-600 ">Requests are reviewed by BookVerse administrators. Payment processing is not integrated; no payment is collected.</p>
                                                            {bookingMessage && <p role="status" className="mt-3 text-sm text-emerald-700 ">{bookingMessage}</p>}
                                                            {bookingError && <p role="alert" className="mt-3 text-sm text-rose-700 ">{bookingError}</p>}
                                                            {isSignedIn ? booth.status === 'AVAILABLE' && typeof booth.price === 'number' ? <button type="button" onClick={requestBooking} disabled={bookingBusy} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{bookingBusy ? 'Submitting…' : 'Request this stall'}</button> : <p className="mt-3 text-sm text-slate-500">This stall is not currently available to request.</p> : <Link to="/login" className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">Sign in to request a stall</Link>}
                                                        </section>
                            <div className="mt-8 flex flex-wrap gap-3">{fair && <Link to={`/book-fairs/${fair._id}`} className="px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-indigo-600 hover:shadow-lg transition-all">View fair</Link>}{publisher && <Link to={`/publishers/${publisher._id}`} className="px-5 py-2.5 rounded-full text-sm font-semibold text-slate-700  border border-slate-300  hover:bg-slate-100  transition-all">View publisher</Link>}</div>
                        </section>
                        <section className="mt-10"><h2 className="font-outfit text-2xl font-bold text-slate-900  mb-5">Featured books</h2>{books.length === 0 ? <div className="bg-white  rounded-3xl p-12 text-center border border-slate-200  shadow-sm text-slate-500 ">No featured books have been listed for this booth yet.</div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{books.map(book => <ProductCard key={book._id} book={book} />)}</div>}</section>
                                            {isSignedIn && <section className="mt-10"><h2 className="font-outfit text-2xl font-bold text-slate-900  mb-4">Your stall requests</h2>{bookings.filter(booking => typeof booking.boothId === 'object' && booking.boothId?._id === booth._id).length === 0 ? <p className="text-sm text-slate-500">No requests for this stall from your publisher account.</p> : <div className="divide-y divide-slate-200 ">{bookings.filter(booking => typeof booking.boothId === 'object' && booking.boothId?._id === booth._id).map(booking => <article key={booking._id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold capitalize text-slate-900 ">{booking.status} · ₹{booking.quotedPrice.toLocaleString('en-IN')} {booking.currency}</p><p className="text-xs text-slate-500">Payment: not integrated · Reference {booking.bookingReference}</p>{booking.rejectionReason && <p className="mt-1 text-sm text-rose-700">{booking.rejectionReason}</p>}</div>{booking.status === 'pending' && <button type="button" onClick={() => cancelBooking(booking._id)} disabled={bookingBusy} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60  ">Cancel request</button>}</article>)}</div>}</section>}
                    </>
                )}
            </div>
        </div>
    );
};

export default BoothDetails;
