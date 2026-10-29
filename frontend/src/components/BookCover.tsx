import React, { useEffect, useState } from 'react';
import { Book } from '../types';
import { resolveBookImage } from '../utils/bookCompatibility';

interface BookCoverProps {
    book?: Partial<Book>;
    image?: string;
    title?: string;
    author?: string;
    category?: string;
    className?: string;
    imageClassName?: string;
    alt?: string;
}

const BookCover: React.FC<BookCoverProps> = ({
    book,
    image,
    title,
    author,
    category,
    className = '',
    imageClassName = '',
    alt,
}) => {
    const coverTitle = title || book?.title || 'Book cover';
    const coverAuthor = author || book?.author;
    const coverCategory = category || book?.category || book?.genre;
    const requestedImage = image || book?.image;
    const fallbackImage = resolveBookImage(undefined, coverTitle, coverAuthor, coverCategory);
    const [imageSrc, setImageSrc] = useState(() => resolveBookImage(requestedImage, coverTitle, coverAuthor, coverCategory));

    useEffect(() => {
        setImageSrc(resolveBookImage(requestedImage, coverTitle, coverAuthor, coverCategory));
    }, [requestedImage, coverTitle, coverAuthor, coverCategory]);

    return (
        <div className={`relative isolate [perspective:1000px] ${className}`}>
            <div className="relative h-full w-full overflow-hidden rounded-[0.9rem] border border-slate-200/80 bg-[#f5efe7] shadow-[0_22px_32px_rgba(41,36,58,0.12),inset_0_0_0_1px_rgba(255,255,255,0.4)] transition-transform duration-300 group-hover:-translate-y-0.5">
                <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[7%] bg-gradient-to-r from-black/20 via-black/0 to-transparent" />
                <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[5%] bg-gradient-to-l from-white/25 to-transparent" />
                <img
                    src={imageSrc}
                    alt={alt || coverTitle}
                    className={`relative z-[1] h-full w-full object-cover ${imageClassName}`}
                    loading="lazy"
                    decoding="async"
                    onError={() => {
                        if (imageSrc !== fallbackImage) setImageSrc(fallbackImage);
                    }}
                />
            </div>
            <span aria-hidden="true" className="absolute -bottom-1 left-[8%] right-[4%] -z-10 h-2 rounded-full bg-[#29243A]/15 blur-[4px]" />
        </div>
    );
};

export default BookCover;
