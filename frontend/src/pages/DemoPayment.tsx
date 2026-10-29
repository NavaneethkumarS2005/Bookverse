import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { API_URL } from '../config';

type DemoState = 'CREATED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED';

interface DemoSession {
    state: DemoState;
    amount: number;
    expiresAt: string;
    sessionReference: string;
}

const DemoPayment: React.FC = () => {
    const { sessionKey } = useParams<{ sessionKey: string }>();
    const [session, setSession] = useState<DemoSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadSession = async () => {
            if (!sessionKey) {
                setError('This demo session link is invalid.');
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`${API_URL}/api/payment/demo-session/${sessionKey}/public`);
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Demo session could not be loaded.');
                setSession(data);
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : 'Demo session could not be loaded.');
            } finally {
                setLoading(false);
            }
        };

        void loadSession();
    }, [sessionKey]);

    const simulate = async (outcome: 'succeed' | 'fail') => {
        if (!sessionKey || !session || processing || session.state !== 'CREATED') return;
        setProcessing(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/api/payment/demo-session/${sessionKey}/${outcome}`, {
                method: 'POST',
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Demo payment could not be updated.');
            setSession(data);
        } catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : 'Demo payment could not be updated.');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <main className="min-h-screen pt-32 text-center text-slate-500">Loading demo payment...</main>;

    return (
        <main className="min-h-screen bg-slate-50 px-5 pb-20 pt-32 ">
            <section className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl  ">
                <p className="mb-3 text-xs font-black tracking-[0.3em] text-indigo-600">BOOKVERSE</p>
                <h1 className="mb-4 text-3xl font-bold text-slate-900 ">DEMO PAYMENT</h1>
                <div className="mb-6 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-4 ">
                    <p className="font-black tracking-widest text-amber-800 ">DEMO MODE</p>
                    <p className="text-sm font-bold text-amber-700 ">NO REAL MONEY WILL BE CHARGED</p>
                </div>

                {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
                {session && (
                    <>
                        <p className="text-sm text-slate-500 ">Amount</p>
                        <p className="mb-2 text-4xl font-black text-slate-900 ">₹{session.amount}</p>
                        <p className="mb-6 text-xs text-slate-500">Reference: {session.sessionReference}</p>
                        <p className="mb-6 text-sm font-semibold text-slate-600 ">Status: {session.state}</p>

                        {session.state === 'CREATED' && (
                            <div className="grid gap-3">
                                <button type="button" onClick={() => void simulate('succeed')} disabled={processing} className="rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                                    {processing ? 'Processing...' : 'Simulate Success'}
                                </button>
                                <button type="button" onClick={() => void simulate('fail')} disabled={processing} className="rounded-xl bg-rose-600 px-4 py-3 font-bold text-white hover:bg-rose-700 disabled:opacity-50">
                                    Simulate Failure
                                </button>
                            </div>
                        )}
                        {session.state === 'SUCCEEDED' && <p className="font-bold text-emerald-700">Demo success confirmed by BookVerse.</p>}
                        {session.state === 'FAILED' && <p className="font-bold text-rose-700">Demo failure recorded. No order was created.</p>}
                        {session.state === 'EXPIRED' && <p className="font-bold text-amber-700">This demo session has expired.</p>}
                    </>
                )}
                <Link to="/cart" className="mt-8 inline-block text-sm font-semibold text-indigo-600 hover:underline">Return to checkout</Link>
            </section>
        </main>
    );
};

export default DemoPayment;
