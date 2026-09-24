import React, { useEffect, useState } from 'react';
import { FiMessageCircle, FiX } from 'react-icons/fi';

const WHATSAPP_URL = 'https://wa.me/918015050605?text=Hello%20LuminaBook%20AI%2C%20I%20need%20help%20finding%20a%20book.';

/** A session-scoped, dismissible support prompt. It never blocks checkout or navigation. */
const LiveSupport: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('bookverse-support-dismissed')) return;
    const timer = window.setTimeout(() => setShowPrompt(true), 2200);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('bookverse-support-dismissed', 'true');
  };

  return <div className="fixed bottom-6 left-5 z-40 flex items-end gap-3 sm:left-6">
    {showPrompt && <div className="relative max-w-[270px] rounded-2xl border border-emerald-100 bg-white p-4 pr-9 shadow-xl dark:border-emerald-900/60 dark:bg-slate-900">
      <button onClick={dismiss} className="absolute right-2 top-2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="Dismiss live support prompt"><FiX /></button>
      <p className="text-sm font-bold text-slate-900 dark:text-white">Need a book recommendation?</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Chat with LuminaBook AI support on WhatsApp for quick help.</p>
    </div>}
    <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" onClick={dismiss} className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition hover:-translate-y-1 hover:bg-emerald-600" aria-label="Chat with LuminaBook AI on WhatsApp" title="WhatsApp LuminaBook AI support"><FiMessageCircle className="text-2xl" /></a>
  </div>;
};

export default LiveSupport;
