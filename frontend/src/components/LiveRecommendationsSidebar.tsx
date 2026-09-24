import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book } from '../types';
import ProductCard from './ProductCard';
import { API_URL } from '../config';

const LiveRecommendationsSidebar: React.FC = () => {
    const [recommendations, setRecommendations] = useState<Book[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        // In a real implementation, this connects to the actual SSE endpoint
        const eventSource = new EventSource(`${API_URL}/api/recommendations/live-stream`);
        
        eventSource.onmessage = (event) => {
            try {
                const newRecs = JSON.parse(event.data);
                if (Array.isArray(newRecs)) {
                    setRecommendations(newRecs);
                }
            } catch (err) {
                console.error("Failed to parse SSE data", err);
            }
        };

        eventSource.onerror = (err) => {
            console.error("SSE Error:", err);
            // Mock data fallback if endpoint doesn't exist yet
            if (recommendations.length === 0) {
                setRecommendations([
                    {
                        _id: "mock1",
                        title: "Dune",
                        author: "Frank Herbert",
                        price: 599,
                        category: "Sci-Fi",
                        image: "https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?auto=format&fit=crop&w=400&q=80",
                    } as unknown as Book,
                    {
                        _id: "mock2",
                        title: "Neuromancer",
                        author: "William Gibson",
                        price: 499,
                        category: "Sci-Fi",
                        image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80",
                    } as unknown as Book
                ]);
            }
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [isOpen]);

    return (
        <>
            {/* Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 transition-colors hover:bg-indigo-700"
            >
                <span className="text-2xl">✨</span>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm"
                        />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%', opacity: 0.5 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0.5 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 z-[101] h-full w-full max-w-sm border-l border-slate-200 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 sm:max-w-md"
                    >
                        <div className="flex h-full flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="relative flex h-3 w-3">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                                            <span className="relative inline-flex h-3 w-3 rounded-full bg-indigo-500"></span>
                                        </span>
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Live Recommendations</h2>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Updating based on your activity...</p>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                                {recommendations.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                                        <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                                        <p>Analyzing your interests...</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-6">
                                        {recommendations.map((book, idx) => (
                                            <motion.div
                                                key={book._id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className="h-[340px]"
                                            >
                                                <ProductCard book={book} />
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default LiveRecommendationsSidebar;
