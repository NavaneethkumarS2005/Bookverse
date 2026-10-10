export type CatalogFulfillment = 'internal' | 'external';

// These IDs are the explicitly documented sections in data/seedBooks.ts.
// Legacy records are classified only when their numeric seed ID is known.
export const INTERNAL_DEMO_SEED_IDS = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
]);

export const EXTERNAL_ONLY_SEED_IDS = new Set([
  11, 12, 13, 14,
  36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53,
]);

export const resolveCatalogFulfillment = (book: unknown): CatalogFulfillment | undefined => {
  if (!book || typeof book !== 'object') return undefined;
  const value = book as Record<string, unknown>;
  if (value.fulfillment === 'internal' || value.fulfillment === 'external') return value.fulfillment;

  const id = Number(value.id);
  if (!Number.isInteger(id)) return undefined;
  if (INTERNAL_DEMO_SEED_IDS.has(id)) return 'internal';
  if (EXTERNAL_ONLY_SEED_IDS.has(id)) return 'external';
  return undefined;
};

export const isCheckoutEligibleBook = (book: unknown): boolean => resolveCatalogFulfillment(book) === 'internal';
