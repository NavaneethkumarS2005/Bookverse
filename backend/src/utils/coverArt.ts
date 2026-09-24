const palettes = [
  ['#4f46e5', '#7c3aed', '#ec4899'],
  ['#0f766e', '#14b8a6', '#22c55e'],
  ['#f59e0b', '#f97316', '#ef4444'],
  ['#2563eb', '#38bdf8', '#8b5cf6'],
  ['#0f172a', '#475569', '#a855f7'],
  ['#9d174d', '#e11d48', '#f59e0b'],
] as const;

export const generateBookCoverSvg = (title: string, author = 'LuminaBook', category = 'Featured') => {
  const safeTitle = title?.trim() || 'Untitled';
  const safeAuthor = author?.trim() || 'LuminaBook';
  const safeCategory = category?.trim() || 'Featured';
  const initials = safeTitle
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.slice(0, 1).toUpperCase())
    .join('') || 'LB';

  const sum = [...safeTitle].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const [start, mid, end] = palettes[Math.abs(sum) % palettes.length];

  const displayTitle = safeTitle.length > 20 ? `${safeTitle.slice(0, 18)}…` : safeTitle;
  const displayAuthor = safeAuthor.length > 24 ? `${safeAuthor.slice(0, 22)}…` : safeAuthor;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800" viewBox="0 0 1200 1800">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="50%" stop-color="${mid}" />
          <stop offset="100%" stop-color="${end}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="1800" fill="url(#g)" />
      <circle cx="980" cy="220" r="240" fill="rgba(255,255,255,0.12)" />
      <circle cx="260" cy="1550" r="300" fill="rgba(255,255,255,0.10)" />
      <rect x="120" y="120" width="960" height="1560" rx="72" fill="rgba(15,23,42,0.16)" stroke="rgba(255,255,255,0.33)" />
      <text x="600" y="760" text-anchor="middle" font-size="300" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="rgba(255,255,255,0.95)">${initials}</text>
      <text x="600" y="1020" text-anchor="middle" font-size="92" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="#ffffff">${displayTitle}</text>
      <text x="600" y="1120" text-anchor="middle" font-size="52" font-family="Arial, Helvetica, sans-serif" fill="rgba(255,255,255,0.82)">${safeCategory}</text>
      <text x="600" y="1200" text-anchor="middle" font-size="46" font-family="Arial, Helvetica, sans-serif" fill="rgba(255,255,255,0.76)">${displayAuthor}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};
