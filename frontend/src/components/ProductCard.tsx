import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiHeart } from 'react-icons/fi';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Book } from '../types';
import { resolveBookImage } from '../utils/bookCompatibility';
import { useWishlist } from '../context/WishlistContext';

interface ProductCardProps {
    book: Book;
}

const ProductCard: React.FC<ProductCardProps> = ({ book }) => {
    const [imageSrc, setImageSrc] = useState(resolveBookImage(book.image, book.title, book.author, book.category));
    const { isWishlisted, toggleWishlist } = useWishlist();
    const [wishlistBusy, setWishlistBusy] = useState(false);

    useEffect(() => {
        setImageSrc(resolveBookImage(book.image, book.title, book.author, book.category));
    }, [book.image, book.title, book.author, book.category]);

    const bookId = String(book._id || book.id);
    const saved = isWishlisted(bookId);
    const categoryLabel = book.category || book.genre || 'Featured';

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

    const rating = Number(book.rating) > 0 ? Number(book.rating) : 4.8;

    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x, { stiffness: 300, damping: 40 });
    const mouseYSpring = useSpring(y, { stiffness: 300, damping: 40 });

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div 
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-3.5 shadow-sm transition-colors duration-300 hover:border-indigo-400 hover:shadow-[0_20px_45px_rgba(99,102,241,0.16)] dark:border-slate-700 dark:bg-slate-800/90"
        >
            <div className="relative mb-4 overflow-hidden rounded-[1.25rem] bg-slate-100 dark:bg-slate-700" style={{ transform: "translateZ(50px)" }}>
                <div className="aspect-[2/3]">
                    <img
                        src={imageSrc}
                        alt={book.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                        onError={() => {
                            const nextValue = resolveBookImage(undefined, book.title, book.author, book.category);
                            if (imageSrc !== nextValue) setImageSrc(nextValue);
                        }}
                    />
                </div>

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

                <div className="absolute right-3 top-3 rounded-full bg-slate-950/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white backdrop-blur-sm">
                    {categoryLabel}
                </div>
            </div>

            <div className="flex flex-1 flex-col">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                        {book.genre || 'Bestseller'}
                    </span>
                    <div className="flex items-center gap-1 text-xs font-medium text-amber-500">
                        <span>★</span>
                        <span>{rating.toFixed(1)}</span>
                    </div>
                </div>

                <div className="min-h-[3.5rem]">
                    <h3 className="line-clamp-2 font-outfit text-lg font-bold text-slate-900 dark:text-white" title={book.title}>{book.title}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{book.author}</p>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Price</p>
                        <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                            {book.price === 0 ? 'Free' : `₹${book.price}`}
                        </span>
                    </div>

                    <Link to={`/book/${bookId}`} className="rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl">
                        View
                    </Link>
                </div>
            </div>
        </motion.div>
    );
};

export default ProductCard;
