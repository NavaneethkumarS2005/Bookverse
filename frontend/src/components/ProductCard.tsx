import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiHeart } from 'react-icons/fi';
import { Book } from '../types';
import { useWishlist } from '../context/WishlistContext';
import BookCover from './BookCover';

interface ProductCardProps {
    book: Book;
}

const ProductCard: React.FC<ProductCardProps> = ({ book }) => {
    const { isWishlisted, toggleWishlist } = useWishlist();
    const [wishlistBusy, setWishlistBusy] = useState(false);

    const bookId = String(book._id || book.id);
    const saved = isWishlisted(bookId);
    const categoryLabel = book.category || book.genre || 'Featured';

    const handleWishlist = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (!localStorage.getItem('user')) {
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

    const getRetailerInfo = (url?: string) => {
        if (!url) return null;
        try {
            const parsed = new URL(url);
            const host = parsed.hostname.toLowerCase();
            if (host.includes('amazon')) {
                return { label: 'Buy from Amazon', shortLabel: 'Amazon', title: 'Buy on Amazon' };
            }
            if (host.includes('flipkart')) {
                return { label: 'Buy from Flipkart', shortLabel: 'Flipkart', title: 'Buy on Flipkart' };
            }
            if (host.includes('google')) {
                return { label: 'Google Books', shortLabel: 'Google Books', title: 'View on Google Books' };
            }
            return { label: 'Visit Store', shortLabel: 'Store', title: 'Visit External Retailer Store' };
        } catch {
            return null;
        }
    };

    const retailer = getRetailerInfo(book.buyLink);

    return (
        <div className="lumina-product-card group relative flex h-full flex-col">
            <div className="relative mb-5 overflow-hidden rounded-[2px] bg-[#ece6d9]">
                <BookCover book={book} className="aspect-[2/3]" imageClassName="transition-transform duration-700 ease-out group-hover:scale-[1.04]" />

                <button
                    type="button"
                    onClick={handleWishlist}
                    disabled={wishlistBusy}
                    aria-label={saved ? `Remove ${book.title} from wishlist` : `Add ${book.title} to wishlist`}
                    title={saved ? 'Remove from wishlist' : 'Add to wishlist'}
                    className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition-all hover:bg-white ${saved ? 'text-[#7d2428]' : 'text-[#171713] hover:text-[#7d2428]'} disabled:cursor-wait disabled:opacity-60`}
                >
                    <FiHeart className={`text-base ${saved ? 'fill-current' : ''}`} />
                </button>

                <div className="absolute left-3 top-3 bg-[#fffdf8]/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#68675f]">
                    {categoryLabel}
                </div>
            </div>

            <div className="flex flex-1 flex-col">
                <h3 className="line-clamp-2 font-serif text-xl leading-snug text-[#171713]" title={book.title}>{book.title}</h3>
                <p className="mt-1 text-sm text-[#68675f]">{book.author}</p>

                <div className="min-h-[3.5rem] grow" />

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#e8e1d4] pt-3.5">
                    <span className="font-medium text-[#171713]">
                        {book.price === 0 ? 'Free' : `₹${book.price}`}
                    </span>

                    <div className="flex shrink-0 items-center gap-2">
                        {retailer && book.buyLink && (
                            <a
                                href={book.buyLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title={retailer.title}
                                className="border-b border-transparent pb-0.5 text-xs font-medium text-[#68675f] transition-colors hover:border-[#7d2428] hover:text-[#7d2428]"
                            >
                                {retailer.shortLabel}
                            </a>
                        )}

                        <Link
                            to={`/book/${bookId}`}
                            className="border-b border-[#cec5b7] pb-0.5 text-xs font-semibold tracking-wide text-[#171713] transition-colors hover:border-[#7d2428] hover:text-[#7d2428]"
                        >
                            View book
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
