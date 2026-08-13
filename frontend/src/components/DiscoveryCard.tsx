import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { IImageAsset } from '../types';
import { getDiscoveryFallback, resolveDiscoveryImage } from '../utils/discoveryCompatibility';

interface DiscoveryCardProps {
  title: string;
  subtitle: string;
  description?: string;
  image?: string | IImageAsset | null;
  badge?: string;
  label?: string;
  to: string;
}

const DiscoveryCard: React.FC<DiscoveryCardProps> = ({ title, subtitle, description, image, badge, label, to }) => {
  const seed = useMemo(() => `${title}:${subtitle}`, [title, subtitle]);
  const fallbackImage = useMemo(() => getDiscoveryFallback(seed), [seed]);
  const resolvedImage = resolveDiscoveryImage(image, fallbackImage);
  const [imageSrc, setImageSrc] = useState(resolvedImage);

  useEffect(() => {
    setImageSrc(resolvedImage);
  }, [resolvedImage]);

  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-discovery-image-url]'));
    const usedImages = new Set(cards.map(card => card.dataset.discoveryImageUrl).filter(Boolean) as string[]);
    usedImages.delete(resolvedImage);
    if (!usedImages.has(resolvedImage)) return;
    setImageSrc(getDiscoveryFallback(seed, usedImages));
  }, [resolvedImage, seed]);

  const handleImageError = () => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-discovery-image-url]'));
    const usedImages = new Set(cards.map(card => card.dataset.discoveryImageUrl).filter(Boolean) as string[]);
    usedImages.delete(imageSrc);
    setImageSrc(getDiscoveryFallback(seed, usedImages));
  };

  return (
    <Link to={to} className="group block rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl transition-shadow duration-300">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={imageSrc}
          alt={title}
          data-discovery-image-url={imageSrc}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={handleImageError}
        />
        {badge && (
          <span className="absolute left-4 top-4 rounded-full bg-indigo-600 text-white text-xs px-3 py-1 font-semibold shadow-lg">
            {badge}
          </span>
        )}
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate">{title}</h3>
          {label && <span className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">{label}</span>}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-3">{description || subtitle}</p>
        <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">View Details →</div>
      </div>
    </Link>
  );
};

export default DiscoveryCard;
