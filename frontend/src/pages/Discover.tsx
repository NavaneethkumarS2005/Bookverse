import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowUpRight,
  FiBook,
  FiCalendar,
  FiCompass,
  FiPackage,
  FiRefreshCw,
  FiShield,
  FiUsers,
} from 'react-icons/fi';
import { API_URL } from '../config';
import DiscoveryCard from '../components/DiscoveryCard';
import { IAuthor, IPublisher, IUpcomingBook, IBookFair } from '../types';
import { normalizeUpcomingBook } from '../utils/discoveryCompatibility';

// ---------------------------------------------------------------------------
// Types matching the actual /api/discovery/overview response contract
// ---------------------------------------------------------------------------

interface IIndustryResource {
  id: string;
  title: string;
  category: string;
  description: string;
  sourceUrl: string;
  organization: string;
  region: string;
  verifiedAt: string;
  keyTopics: string[];
}

interface OverviewMeta {
  title: string;
  subtitle: string;
  lastVerifiedAt: string;
  sources: string[];
}

interface OverviewStats {
  upcomingReleases: number;
  verifiedAuthors: number;
  verifiedPublishers: number;
  globalBookFairs: number;
  industryResources: number;
  catalogBooks: number;
}

interface OverviewData {
  meta: OverviewMeta;
  stats: OverviewStats;
  upcomingBooks: IUpcomingBook[];
  authors: IAuthor[];
  publishers: IPublisher[];
  bookFairs: IBookFair[];
  industryResources: IIndustryResource[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const nameOf = (ref?: string | IAuthor | IPublisher): string =>
  typeof ref === 'object' && ref !== null ? (ref as IAuthor | IPublisher).name : '';

const formatDate = (value?: string): string =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Date TBA';

const CATEGORY_ACCENT: Record<string, string> = {
  ISBN: 'bg-sky-50 text-sky-700  ',
  COPYRIGHT: 'bg-violet-50 text-violet-700  ',
  SUBMISSIONS: 'bg-emerald-50 text-emerald-700  ',
  ORGANIZATIONS: 'bg-amber-50 text-amber-700  ',
  STANDARDS: 'bg-rose-50 text-rose-700  ',
};

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

interface SectionProps {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  href: string;
  viewAllLabel?: string;
  empty: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({
  icon,
  eyebrow,
  title,
  href,
  viewAllLabel = 'View all →',
  empty,
  emptyMessage = 'No records available yet.',
  children,
}) => (
  <section>
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-500 ">
          {icon} {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900 ">{title}</h2>
      </div>
      <Link
        to={href}
        className="hidden shrink-0 text-sm font-semibold text-indigo-600 hover:text-indigo-500   sm:inline-block"
      >
        {viewAllLabel}
      </Link>
    </div>

    {empty ? (
      <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/60 py-12 text-center  ">
        <p className="text-slate-500 ">{emptyMessage}</p>
        <Link
          to={href}
          className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:underline "
        >
          {viewAllLabel}
        </Link>
      </div>
    ) : (
      children
    )}

    <div className="mt-4 sm:hidden">
      <Link
        to={href}
        className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 "
      >
        {viewAllLabel}
      </Link>
    </div>
  </section>
);

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const Discover: React.FC = () => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await axios.get<OverviewData>(`${API_URL}/api/discovery/overview`);
      // Normalise upcoming books so coverImage is always IImageAsset shape
      res.upcomingBooks = res.upcomingBooks.map(normalizeUpcomingBook);
      setData(res);
    } catch {
      setError('Unable to load Discover overview. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const statsItems = data
    ? [
        { label: 'Upcoming', value: data.stats.upcomingReleases },
        { label: 'Authors', value: data.stats.verifiedAuthors },
        { label: 'Publishers', value: data.stats.verifiedPublishers },
        { label: 'Book Fairs', value: data.stats.globalBookFairs },
        { label: 'Resources', value: data.stats.industryResources },
        { label: 'In Catalog', value: data.stats.catalogBooks },
      ]
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-slate-50 pb-20 pt-24 "
    >
      <div className="mx-auto max-w-7xl px-5">

        {/* ----------------------------------------------------------------- */}
        {/* Hero banner                                                        */}
        {/* ----------------------------------------------------------------- */}
        <section className="relative mb-14 overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900 shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.28),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.2),transparent_60%)]" />

          <div className="relative z-10 px-8 py-12 sm:px-12 lg:px-16">
            <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-indigo-300">
              <FiCompass className="text-sm" /> BookVerse Discover
            </p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              {loading ? 'Discover Hub' : (data?.meta.title ?? 'Discover Hub')}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              {loading
                ? 'Loading literary intelligence…'
                : (data?.meta.subtitle ??
                    'Explore verified author profiles, upcoming releases, major publishers, and global book fairs.')}
            </p>

            {/* Stats bar */}
            {data && (
              <div className="mt-10 grid grid-cols-3 gap-3 sm:grid-cols-6">
                {statsItems.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm"
                  >
                    <div className="text-2xl font-black text-white">
                      {stat.value.toLocaleString()}
                    </div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sources footnote */}
            {data?.meta.sources && (
              <p className="mt-6 text-xs text-slate-500">
                Data sources: {data.meta.sources.join(' · ')}
              </p>
            )}
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* Loading state                                                      */}
        {/* ----------------------------------------------------------------- */}
        {loading && (
          <div className="flex flex-col items-center gap-4 py-24 text-slate-400">
            <FiRefreshCw className="animate-spin text-4xl text-indigo-500" />
            <p className="text-sm font-medium">Loading discovery data…</p>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Error state                                                        */}
        {/* ----------------------------------------------------------------- */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6  ">
            <p className="font-semibold text-red-700 ">{error}</p>
            <button
              id="discover-retry-btn"
              type="button"
              onClick={load}
              className="mt-3 rounded-xl bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-200   "
            >
              Retry
            </button>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Sections                                                           */}
        {/* ----------------------------------------------------------------- */}
        {!loading && !error && data && (
          <div className="space-y-16">

            {/* ── Upcoming Books ─────────────────────────────────────────── */}
            <Section
              icon={<FiBook />}
              eyebrow="Upcoming Releases"
              title="On the reading radar"
              href="/upcoming-books"
              viewAllLabel="Browse all upcoming →"
              empty={data.upcomingBooks.length === 0}
              emptyMessage="No upcoming releases are currently in the catalog. Run seed with SEED_DISCOVERY_DATA=true to populate."
            >
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {data.upcomingBooks.map((book, index) => (
                  <DiscoveryCard
                    key={book._id}
                    title={book.title}
                    subtitle={nameOf(book.authorId) || 'Author TBA'}
                    description={book.metadata?.teaser ?? book.description ?? ''}
                    image={book.coverImage}
                    badge={book.status?.replace('_', ' ') ?? 'ANNOUNCED'}
                    label={formatDate(book.expectedReleaseDate)}
                    to="/upcoming-books"
                    fallbackSeed={`discover-upcoming:${book._id}`}
                    fallbackIndex={index}
                    bookCover
                  />
                ))}
              </div>
            </Section>

            {/* ── Authors ────────────────────────────────────────────────── */}
            <Section
              icon={<FiUsers />}
              eyebrow="Authors & Voices"
              title="Meet the minds behind the stories"
              href="/authors"
              viewAllLabel="Explore all authors →"
              empty={data.authors.length === 0}
              emptyMessage="No author records in the catalog yet. Run seed with SEED_DISCOVERY_DATA=true to populate."
            >
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {data.authors.map((author, index) => (
                  <DiscoveryCard
                    key={author._id}
                    title={author.name}
                    subtitle={
                      author.nationality ??
                      (author.language?.join(', ') ?? 'Region not listed')
                    }
                    description={author.bio}
                    image={author.photo ?? author.avatarUrl}
                    badge={
                      author.isFeatured ? 'Featured' : (author.genres?.[0] ?? 'Author')
                    }
                    label={author.language?.slice(0, 2).join(', ')}
                    to={`/authors/${author._id}`}
                    fallbackSeed={`discover-author:${author._id}`}
                    fallbackIndex={index}
                  />
                ))}
              </div>
            </Section>

            {/* ── Publishers ─────────────────────────────────────────────── */}
            <Section
              icon={<FiPackage />}
              eyebrow="Publishing Houses"
              title="The publishers shaping the shelf"
              href="/publishers"
              viewAllLabel="All publishers →"
              empty={data.publishers.length === 0}
              emptyMessage="No publisher records in the catalog yet. Run seed with SEED_DISCOVERY_DATA=true to populate."
            >
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {data.publishers.map((publisher, index) => (
                  <DiscoveryCard
                    key={publisher._id}
                    title={publisher.name}
                    subtitle={
                      publisher.headquarters ?? publisher.country ?? 'Location not listed'
                    }
                    description={publisher.description}
                    image={publisher.logo ?? publisher.logoUrl}
                    badge={
                      publisher.isVerified
                        ? 'Verified'
                        : (publisher.genres?.[0] ?? 'Publisher')
                    }
                    label={
                      publisher.establishedYear
                        ? `Est. ${publisher.establishedYear}`
                        : undefined
                    }
                    to={`/publishers/${publisher._id}`}
                    fallbackSeed={`discover-publisher:${publisher._id}`}
                    fallbackIndex={index}
                  />
                ))}
              </div>
            </Section>

            {/* ── Book Fairs ─────────────────────────────────────────────── */}
            <Section
              icon={<FiCalendar />}
              eyebrow="Global Events"
              title="Book fairs shaping reading culture"
              href="/book-fairs"
              viewAllLabel="All book fairs →"
              empty={data.bookFairs.length === 0}
              emptyMessage="No book fair records in the catalog yet. Run seed with SEED_DISCOVERY_DATA=true to populate."
            >
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {data.bookFairs.map((fair, index) => {
                  const loc = [fair.location?.city, fair.location?.country]
                    .filter(Boolean)
                    .join(', ');
                  return (
                    <DiscoveryCard
                      key={fair._id}
                      title={fair.name}
                      subtitle={loc || 'Location TBA'}
                      description={fair.description}
                      image={fair.featuredImage}
                      badge={fair.status}
                      label={
                        fair.startDate
                          ? new Date(fair.startDate).toLocaleDateString(undefined, {
                              month: 'short',
                              year: 'numeric',
                            })
                          : undefined
                      }
                      to={`/book-fairs/${fair._id}`}
                      fallbackSeed={`discover-fair:${fair._id}`}
                      fallbackIndex={index}
                    />
                  );
                })}
              </div>
            </Section>

            {/* ── Industry Resources preview ──────────────────────────────── */}
            {data.industryResources.length > 0 && (
              <section>
                <div className="mb-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-500 ">
                      <FiShield /> Industry Guide
                    </p>
                    <h2 className="mt-2 text-3xl font-bold text-slate-900 ">
                      Verified publishing resources
                    </h2>
                  </div>
                  <Link
                    to="/industry-guide"
                    className="hidden shrink-0 text-sm font-semibold text-indigo-600 hover:text-indigo-500   sm:inline-block"
                  >
                    Full guide →
                  </Link>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {data.industryResources.map((resource) => {
                    const accentClass =
                      CATEGORY_ACCENT[resource.category] ??
                      'bg-slate-100 text-slate-700  ';
                    return (
                      <a
                        key={resource.id}
                        id={`discover-resource-${resource.id}`}
                        href={resource.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md   "
                      >
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] ${accentClass}`}
                          >
                            {resource.category}
                          </span>
                          <FiArrowUpRight className="shrink-0 text-slate-400 transition-colors group-hover:text-indigo-500" />
                        </div>
                        <h3 className="text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-indigo-600  ">
                          {resource.title}
                        </h3>
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 line-clamp-3 ">
                          {resource.description}
                        </p>
                        <p className="mt-4 text-xs font-semibold text-slate-500 ">
                          {resource.organization} · {resource.region}
                        </p>
                      </a>
                    );
                  })}
                </div>

                <div className="mt-4 sm:hidden">
                  <Link
                    to="/industry-guide"
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 "
                  >
                    Full guide →
                  </Link>
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Discover;
