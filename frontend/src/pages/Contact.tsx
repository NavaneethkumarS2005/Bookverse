import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';

interface PopupState {
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
}

const Contact: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [popup, setPopup] = useState<PopupState>({ show: false, message: '', type: 'success' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const showPopupMessage = (msg: string, type: 'success' | 'error' | 'info') => {
        setPopup({ show: true, message: msg, type });
        setTimeout(() => {
            setPopup({ show: false, message: '', type: 'success' });
        }, 3000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        showPopupMessage("Sending...", "info");

        try {
            const res = await axios.post(`${API_URL}/api/contact`, formData);

            if (res.status === 201 || res.status === 200) {
                showPopupMessage("Message sent successfully ✔", "success");
                setFormData({ name: '', email: '', message: '' });
            }
        } catch (error) {
            console.error(error);
            showPopupMessage("Server error. Try again later ❌", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-28 pb-20 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative">

            {/* TOAST POPUP */}
            {popup.show && (
                <div className={`fixed bottom-5 right-5 z-50 px-6 py-4 rounded-xl shadow-xl font-bold text-white transition-all transform animate-slide-in-up ${popup.type === 'error' ? 'bg-red-500' : (popup.type === 'info' ? 'bg-amber-500' : 'bg-green-500')
                    }`}>
                    {popup.message}
                </div>
            )}

            <div className="max-w-4xl mx-auto px-5">
                <header className="text-center mb-16">
                    <h1 className="font-outfit text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
                        Get in <span className="bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">Touch</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg">Have a question about an order or a listing? We're here to help.</p>
                </header>

                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 md:p-12">
                    <form id="contactForm" onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Name</label>
                            <input
                                type="text"
                                id="name"
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="Your Name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Email</label>
                            <input
                                type="email"
                                id="email"
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="your@email.com"
                                required
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Message</label>
                            <textarea
                                id="message"
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[150px]"
                                placeholder="How can we help?"
                                required
                                value={formData.message}
                                onChange={handleChange}
                            ></textarea>
                        </div>
                        <button
                            type="submit"
                            className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-pink-600 hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Sending...
                                </span>
                            ) : "Send Message"}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <Link to="/" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
                            ← Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contact;
