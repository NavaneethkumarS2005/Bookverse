import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiHeart } from 'react-icons/fi';
import { Book } from '../types';
import { BOOK_IMAGE_FALLBACK } from '../utils/bookCompatibility';
import { useWishlist } from '../context/WishlistContext';

interface ProductCardProps {
    book: Book;
}

const ProductCard: React.FC<ProductCardProps> = ({ book }) => {
    const [imageSrc, setImageSrc] = useState(book.image || BOOK_IMAGE_FALLBACK);
    const { isWishlisted, toggleWishlist } = useWishlist();
    const [wishlistBusy, setWishlistBusy] = useState(false);

    useEffect(() => {
        setImageSrc(book.image || BOOK_IMAGE_FALLBACK);
    }, [book.image]);

    const bookId = String(book._id || book.id);
    const saved = isWishlisted(bookId);

    const handleWishlist = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (!localStorage.getItem('token')) {
            window.location.href = '/login';
            return;
        }

        if (wishlistBusy) return;
        setWishlistBusy(true);
        try {
            await toggleWishlist(book);
        } catch (error) {
            console.error('Wishlist update failed', error);
        } finally {
            setWishlistBusy(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-2 hover:border-indigo-500 hover:shadow-xl relative overflow-hidden group flex flex-col h-full">
            <div className="aspect-[2/3] w-full mb-4 overflow-hidden rounded-xl relative">
                <img
                    src={imageSrc}
                    alt={book.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={() => {
                        if (imageSrc !== BOOK_IMAGE_FALLBACK) setImageSrc(BOOK_IMAGE_FALLBACK);
                    }}
                />
                <span className="absolute top-2 right-2 bg-black/60 text-white backdrop-blur-sm px-2 py-1 rounded-md text-xs font-semibold">
                    {book.category}
                </span>
                <button
                    type="button"
                    onClick={handleWishlist}
                    disabled={wishlistBusy}
                    aria-label={saved ? `Remove ${book.title} from wishlist` : `Add ${book.title} to wishlist`}
                    title={saved ? 'Remove from wishlist' : 'Add to wishlist'}
                    className={`absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md shadow-lg transition-all ${saved ? 'bg-pink-500 text-white' : 'bg-white/90 text-slate-700 hover:bg-white hover:text-pink-500 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:text-pink-400'} disabled:cursor-wait disabled:opacity-60`}
                >
                    <FiHeart className={`text-lg ${saved ? 'fill-current' : ''}`} />
                </button>
            </div>

            <div className="flex flex-col flex-grow">
                <h3 className="text-lg font-outfit font-bold text-slate-900 dark:text-white mb-1 line-clamp-1" title={book.title}>{book.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{book.author}</p>

                <div className="mt-auto flex justify-between items-center">
                    <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                        {book.price === 0 ? 'Free' : `₹${book.price}`}
                    </span>
                    <Link to={`/book/${bookId}`} className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-indigo-600 text-white text-sm font-semibold hover:shadow-md transition-all">
                        View
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
