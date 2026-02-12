import React from 'react';
import { Link } from 'react-router-dom';
import { Book } from '../types';

interface ProductCardProps {
    book: Book;
}

const ProductCard: React.FC<ProductCardProps> = ({ book }) => {
    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-2 hover:border-indigo-500 hover:shadow-xl relative overflow-hidden group flex flex-col h-full">
            <div className="aspect-[2/3] w-full mb-4 overflow-hidden rounded-xl relative">
                <img
                    src={book.image}
                    alt={book.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                />
                <span className="absolute top-2 right-2 bg-black/60 text-white backdrop-blur-sm px-2 py-1 rounded-md text-xs font-semibold">
                    {book.category}
                </span>
            </div>

            <div className="flex flex-col flex-grow">
                <h3 className="text-lg font-outfit font-bold text-slate-900 dark:text-white mb-1 line-clamp-1" title={book.title}>{book.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{book.author}</p>

                <div className="mt-auto flex justify-between items-center">
                    <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                        {book.price === 0 ? 'Free' : `₹${book.price}`}
                    </span>
                    <Link to={`/book/${book._id}`} className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-indigo-600 text-white text-sm font-semibold hover:shadow-md transition-all">
                        View
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
