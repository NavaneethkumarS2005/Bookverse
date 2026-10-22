import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

type Booking = {
    _id: string;
    bookingReference: string;
    quotedPrice: number;
    currency: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    paymentStatus: 'not_integrated';
    rejectionReason?: string;
    publisherId?: { name: string; contactEmail?: string };
    fairId?: { name: string; startDate: string; location?: { venue?: string; city?: string } };
    boothId?: { _id: string; boothNumber: string; section?: string; floor?: string; price?: number };
};

const statuses = ['pending', 'approved', 'rejected', 'cancelled', 'all'] as const;

const AdminBoothBookingManagement: React.FC = () => {
    const [status, setStatus] = useState<(typeof statuses)[number]>('pending');
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const loadBookings = async () => {
        setLoading(true); setError('');
        try {
            const { data } = await axios.get(`${API_URL}/api/admin/booth-bookings`, { params: { status }, withCredentials: true });
            setBookings(Array.isArray(data) ? data : []);
        } catch (requestError: any) {
            setError(requestError.response?.data?.message || 'Unable to load stall booking requests.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadBookings(); }, [status]);

    const review = async (booking: Booking, nextStatus: 'approved' | 'rejected') => {
        const rejectionReason = nextStatus === 'rejected' ? window.prompt('Reason for rejecting this stall request:')?.trim() || '' : '';
        if (nextStatus === 'rejected' && !rejectionReason) return;
        setBusyId(booking._id); setError(''); setNotice('');
        try {
            const { data } = await axios.patch(`${API_URL}/api/admin/booth-bookings/${booking._id}/review`, { status: nextStatus, rejectionReason }, { withCredentials: true });
            setNotice(data.message);
            await loadBookings();
        } catch (requestError: any) {
            setError(requestError.response?.data?.message || 'Booking review failed.');
        } finally {
            setBusyId('');
        }
    };

    return <section className="space-y-5">
        <header><h2 className="text-2xl font-bold text-slate-900 dark:text-white">Expo stall requests</h2><p className="mt-1 text-sm text-slate-500">Review publisher requests for configured available stalls. Payment processing is not integrated.</p></header>
        {notice && <div role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</div>}
        {error && <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</div>}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Stall request status">
            {statuses.map(item => <button key={item} role="tab" aria-selected={status === item} onClick={() => setStatus(item)} className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${status === item ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>{item}</button>)}
        </div>
        {loading ? <div role="status" className="py-10 text-center text-slate-500">Loading stall requests…</div> : bookings.length === 0 ? <div className="border-y border-slate-200 py-10 text-center text-slate-500 dark:border-slate-800">No {status === 'all' ? '' : `${status} `}stall requests.</div> : <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {bookings.map(booking => <article key={booking._id} className="flex flex-wrap items-start justify-between gap-4 py-5">
                <div><h3 className="font-bold text-slate-900 dark:text-white">{booking.fairId?.name || 'Book fair'} · Stall {booking.boothId?.boothNumber || '—'}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{booking.publisherId?.name || 'Publisher unavailable'}{booking.publisherId?.contactEmail ? ` · ${booking.publisherId.contactEmail}` : ''}</p><p className="mt-1 text-sm text-slate-500">{[booking.fairId?.location?.venue, booking.fairId?.location?.city].filter(Boolean).join(', ')} · {booking.fairId?.startDate ? new Date(booking.fairId.startDate).toLocaleDateString() : 'Date unavailable'}</p><p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">Configured quote: ₹{booking.quotedPrice.toLocaleString('en-IN')} {booking.currency}</p><p className="mt-1 text-xs text-slate-500">Status: {booking.status} · Payment: not integrated · {booking.bookingReference}</p>{booking.rejectionReason && <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">Review note: {booking.rejectionReason}</p>}</div>
                {booking.status === 'pending' && <div className="flex gap-2"><button type="button" disabled={busyId === booking._id} onClick={() => review(booking, 'approved')} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">Approve request</button><button type="button" disabled={busyId === booking._id} onClick={() => review(booking, 'rejected')} className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">Reject</button></div>}
            </article>)}
        </div>}
    </section>;
};

export default AdminBoothBookingManagement;