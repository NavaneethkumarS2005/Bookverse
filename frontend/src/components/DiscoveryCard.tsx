import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { IImageAsset } from '../types';
import { DISCOVERY_FALLBACKS, getDiscoveryFallback, resolveDiscoveryImage } from '../utils/discoveryCompatibility';
import { motion } from 'framer-motion';
import BookCover from './BookCover';

interface DiscoveryCardProps {
  title: string;
  subtitle: string;
  description?: string;
  image?: string | IImageAsset | null;
  badge?: string;
  label?: string;
  to: string;
  /** Stable per-card seed used when the backend does not provide a usable image. */
  fallbackSeed?: string;
  /** Optional position within a discovery grid. This guarantees distinct local fallbacks. */
  fallbackIndex?: number;
  /** Renders the image as a physical book cover for book-specific discovery cards. */
  bookCover?: boolean;
}

const DiscoveryCard: React.FC<DiscoveryCardProps> = ({
  title,
  subtitle,
  description,
  image,
  badge,
  label,
  to,
  fallbackSeed,
  fallbackIndex,
  bookCover = false,
}) => {
  const seed = useMemo(() => fallbackSeed || `${title}:${subtitle}`, [fallbackSeed, title, subtitle]);
  const accentPalette = useMemo(() => {
    const source = `${seed}${title}${subtitle}`;
    let hash = 0;
    for (let index = 0; index < source.length; index += 1) {
      hash = (hash * 31 + source.charCodeAt(index)) | 0;
    }
    const palettes = [
      ['from-indigo-600 via-violet-600 to-pink-500', 'bg-indigo-500/15 text-indigo-100', 'text-indigo-600 '],
      ['from-emerald-600 via-teal-500 to-cyan-500', 'bg-emerald-500/15 text-emerald-100', 'text-emerald-600 '],
      ['from-amber-500 via-orange-500 to-rose-500', 'bg-amber-500/15 text-amber-100', 'text-amber-600 '],
      ['from-fuchsia-600 via-pink-500 to-rose-500', 'bg-fuchsia-500/15 text-fuchsia-100', 'text-fuchsia-600 '],
      ['from-sky-600 via-cyan-500 to-indigo-500', 'bg-sky-500/15 text-sky-100', 'text-sky-600 '],
    ];
    return palettes[Math.abs(hash) % palettes.length];
  }, [seed, subtitle, title]);

  const fallbackImage = useMemo(() => {
    if (typeof fallbackIndex === 'number' && DISCOVERY_FALLBACKS.length > 0) {
      return getDiscoveryFallback(seed, title, subtitle, new Set([DISCOVERY_FALLBACKS[fallbackIndex % DISCOVERY_FALLBACKS.length]]));
    }
    return getDiscoveryFallback(seed, title, subtitle);
  }, [fallbackIndex, seed, subtitle, title]);
  const resolvedImage = resolveDiscoveryImage(image, fallbackImage);
  const [imageSrc, setImageSrc] = useState(resolvedImage);

  useEffect(() => {
    setImageSrc(resolvedImage);
  }, [resolvedImage]);

  const handleImageError = () => {
    const usedImages = new Set<string>();
    const current = imageSrc;
    if (current) usedImages.add(current);
    setImageSrc(getDiscoveryFallback(seed, title, subtitle, usedImages));
  };

  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="group relative h-full w-full min-h-[420px]" 
      style={{ perspective: 1000 }}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
      onTouchStart={() => setIsFlipped(current => !current)}
    >
      <motion.div
        className="relative h-full w-full shadow-sm transition-shadow hover:shadow-xl rounded-[1.8rem]"
        style={{ transformStyle: 'preserve-3d' }}
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
      >
        {/* Front Face */}
        <Link 
          to={to} 
          aria-label={`View details for ${title}`}
          className="absolute inset-0 block overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2  "
          style={{ backfaceVisibility: 'hidden' }}
        >
      <div className={`relative aspect-[4/3] overflow-hidden bg-gradient-to-br ${accentPalette[0]}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_30%)]" />
      {bookCover ? (
        <BookCover image={imageSrc} title={title} author={subtitle} className="mx-auto h-full w-2/5 py-5" />
      ) : (
        <img
          src={imageSrc}
          alt={title}
          data-discovery-image-url={imageSrc}
          className="relative h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={handleImageError}
        />
      )}
        {badge && (
          <span className={`absolute left-4 top-4 rounded-full border border-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg backdrop-blur-sm ${accentPalette[1]}`}>
            {badge}
          </span>
        )}
      </div>

      <div className="flex min-h-[216px] flex-col space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 min-h-[3.5rem] text-xl font-bold leading-7 text-slate-900 ">{title}</h3>
            <p className="mt-1 text-sm text-slate-500 ">{subtitle}</p>
          </div>
          {label && (
            <span className={`shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]  ${accentPalette[2]}`}>
              {label}
            </span>
          )}
        </div>

        <p className="line-clamp-3 text-sm leading-6 text-slate-600 ">{description || subtitle}</p>

        <div className="mt-auto flex items-center justify-between border-t border-slate-200 pt-4 ">
          <span className="text-sm font-semibold text-slate-500 ">View details</span>
          <span className={`inline-flex items-center gap-1 text-sm font-bold ${accentPalette[2]} transition-transform group-hover:translate-x-1`}>
            Explore →
          </span>
        </div>
      </div>
      </Link>

      {/* Back Face */}
      <div 
        className="absolute inset-0 block overflow-hidden rounded-[1.8rem] border border-indigo-300 bg-white shadow-xl  "
        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
      >
        <div className="flex h-full flex-col p-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5  " />
          <div className="relative z-10 flex h-full flex-col">
            <h3 className="mb-2 text-2xl font-bold text-slate-900 ">{title}</h3>
            <p className="mb-4 text-sm font-semibold text-indigo-600 ">{subtitle}</p>
            
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 ">
              <p className="text-sm leading-relaxed text-slate-600 ">
                {description || subtitle}
              </p>
            </div>

            <Link 
              to={to} 
              className="btn btn-primary mt-6 w-full py-3.5 text-sm active:scale-95"
            >
              Explore Now <span>→</span>
            </Link>
          </div>
        </div>
      </div>
      </motion.div>
    </div>
  );
};

export default DiscoveryCard;
