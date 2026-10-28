import React from 'react';
import { Link } from 'react-router-dom';

interface SectionHeaderProps {
    eyebrow: string;
    title: React.ReactNode;
    linkTo?: string;
    linkLabel?: string;
    className?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ eyebrow, title, linkTo, linkLabel, className = '' }) => (
    <div className={`mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}>
        <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#78806a]">{eyebrow}</p>
            <h2 className="mt-3 font-serif text-4xl leading-[1.05] text-[#171713] sm:text-5xl">{title}</h2>
        </div>
        {linkTo && linkLabel && (
            <Link
                to={linkTo}
                className="group inline-flex shrink-0 items-center gap-2 border-b border-[#cec5b7] pb-1 text-sm font-medium text-[#171713] transition-colors hover:border-[#7d2428] hover:text-[#7d2428]"
            >
                {linkLabel}
                <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
        )}
    </div>
);

export default SectionHeader;
