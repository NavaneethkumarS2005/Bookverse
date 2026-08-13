import React from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiShoppingBag } from 'react-icons/fi';
import ProductCard from '../components/ProductCard';
import { useWishlist } from '../context/WishlistContext';

const Wishlist: React.FC = () => {
    const { wishlist, loading } = useWishlist();
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-28 pb-16">
                <div className="mx-auto max-w-3xl px-5 text-center">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                        <FiHeart className="text-3xl" />
                    </div>
                    <h1 className="font-outfit text-4xl font-bold text-slate-900 dark:text-white">Your Wishlist</h1>
                    <p className="mt-3 text-slate-500 dark:text-slate-400">Sign in to save books and come back to them anytime.</p>
                    <Link to="/login" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700">
                        Sign in <FiShoppingBag />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-28 pb-16 transition-colors">
            <div className="mx-auto max-w-7xl px-5">
                <div className="mb-10 flex items-end justify-between gap-4">
                    <div>
                        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-400">Saved for later</p>
                        <h1 className="font-outfit text-4xl font-bold text-slate-900 dark:text-white">My Wishlist</h1>
                        <p className="mt-2 text-slate-500 dark:text-slate-400">Keep the books you love close until you are ready to buy.</p>
                    </div>
                    {wishlist.length > 0 && <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">{wishlist.length} {wishlist.length === 1 ? 'book' : 'books'}</span>}
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[430px] animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
                    </div>
                ) : wishlist.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {wishlist.map(book => <ProductCard key={String(book._id || book.id)} book={book} />)}
                    </div>
                ) : (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-700 dark:bg-slate-900">
                        <FiHeart className="mx-auto mb-5 text-4xl text-slate-300 dark:text-slate-600" />
                        <h2 className="font-outfit text-2xl font-bold text-slate-900 dark:text-white">Nothing saved yet</h2>
                        <p className="mx-auto mt-2 max-w-md text-slate-500 dark:text-slate-400">Tap the heart on any marketplace book to build your personal reading shortlist.</p>
                        <Link to="/marketplace" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700">Browse books <FiShoppingBag /></Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Wishlist;
