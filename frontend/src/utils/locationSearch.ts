import type { Coordinates } from './overpassSearch';

export type GeocodingResult = {
  location: Coordinates;
  displayName: string;
};

type GeocodingErrorKind = 'rate-limit' | 'http' | 'network' | 'timeout' | 'aborted' | 'malformed';

export class GeocodingError extends Error {
  readonly kind: GeocodingErrorKind;
  readonly status?: number;
  readonly retryAfter?: string;

  constructor(kind: GeocodingErrorKind, message: string, status?: number, retryAfter?: string) {
    super(message);
    this.name = 'GeocodingError';
    this.kind = kind;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const REQUEST_TIMEOUT_MS = 12000;

const parseLocation = (value: unknown, query: string): GeocodingResult | null => {
  if (!Array.isArray(value)) {
    throw new GeocodingError('malformed', 'The place search returned an invalid response.');
  }

  const match = value.find(result => {
    if (!result || typeof result !== 'object') return false;
    const latitude = Number((result as { lat?: unknown }).lat);
    const longitude = Number((result as { lon?: unknown }).lon);
    return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
      && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
  }) as { lat: string; lon: string; display_name?: string } | undefined;

  if (!match) return null;
  return {
    location: { lat: Number(match.lat), lng: Number(match.lon) },
    displayName: match.display_name?.trim() || query,
  };
};

const abortableDelay = (milliseconds: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal?.aborted) {
    reject(new DOMException('Aborted', 'AbortError'));
    return;
  }
  const timeout = setTimeout(() => {
    signal?.removeEventListener('abort', cancel);
    resolve();
  }, milliseconds);
  const cancel = () => {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
    reject(new DOMException('Aborted', 'AbortError'));
  };
  signal?.addEventListener('abort', cancel, { once: true });
});

export const createNominatimGeocoder = (
  fetcher: typeof fetch = fetch,
  minimumIntervalMs = 1000,
) => {
  const inFlight = new Map<string, Promise<GeocodingResult | null>>();
  let queue = Promise.resolve();
  let nextRequestAt = 0;

  const geocode = (rawQuery: string, options: { signal?: AbortSignal; timeoutMs?: number } = {}) => {
    const query = rawQuery.trim().replace(/\s+/g, ' ');
    if (!query) return Promise.reject(new GeocodingError('malformed', 'Enter a place name to search.'));

    const key = query.toLocaleLowerCase();
    const existing = inFlight.get(key);
    if (existing) return existing;

    const request = (async () => {
      let releaseQueue = () => {};
      const previous = queue;
      queue = new Promise<void>(resolve => { releaseQueue = resolve; });
      await previous;

      try {
        if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        const waitMs = Math.max(0, nextRequestAt - Date.now());
        if (waitMs > 0) await abortableDelay(waitMs, options.signal);
        if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        nextRequestAt = Date.now() + minimumIntervalMs;
      } finally {
        releaseQueue();
      }

      const controller = new AbortController();
      let timedOut = false;
      const abortRequest = () => controller.abort();
      options.signal?.addEventListener('abort', abortRequest, { once: true });
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, options.timeoutMs ?? REQUEST_TIMEOUT_MS);

      try {
        const url = new URL(ENDPOINT);
        url.searchParams.set('format', 'jsonv2');
        url.searchParams.set('limit', '1');
        url.searchParams.set('q', query);
        const response = await fetcher(url, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        if (!response.ok) {
          const retryAfter = response.headers.get('Retry-After') ?? undefined;
          const kind = response.status === 429 ? 'rate-limit' : 'http';
          throw new GeocodingError(kind, `Nominatim returned HTTP ${response.status}.`, response.status, retryAfter);
        }

        let data: unknown;
        try {
          data = await response.json();
        } catch {
          throw new GeocodingError('malformed', 'Nominatim returned invalid JSON.');
        }
        return parseLocation(data, query);
      } catch (error) {
        if (error instanceof GeocodingError) throw error;
        if (options.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
          if (timedOut && !options.signal?.aborted) {
            throw new GeocodingError('timeout', 'The place search timed out. Try again shortly.');
          }
          throw new GeocodingError('aborted', 'The place search was cancelled.');
        }
        if (timedOut) throw new GeocodingError('timeout', 'The place search timed out. Try again shortly.');
        throw new GeocodingError('network', 'Could not connect to the OpenStreetMap place search.');
      } finally {
        clearTimeout(timeout);
        options.signal?.removeEventListener('abort', abortRequest);
      }
    })();

    inFlight.set(key, request);
    const clearRequest = () => {
      if (inFlight.get(key) === request) inFlight.delete(key);
    };
    void request.then(clearRequest, clearRequest);
    return request;
  };

  return { geocode };
};

export const formatGeocodingError = (error: unknown) => {
  if (!(error instanceof GeocodingError)) {
    return 'The place search failed unexpectedly. Please try again.';
  }

  switch (error.kind) {
    case 'rate-limit':
      return `OpenStreetMap place search is rate-limited (HTTP 429).${error.retryAfter ? ` Try again after ${error.retryAfter}.` : ' Please wait before trying again.'}`;
    case 'http':
      return `OpenStreetMap place search returned HTTP ${error.status}. Please try again later.`;
    case 'network':
      return 'Could not connect to the OpenStreetMap place search. Check your connection and try again.';
    case 'timeout':
      return 'The place search timed out. Try again shortly.';
    case 'aborted':
      return 'The place search was cancelled.';
    case 'malformed':
      return 'OpenStreetMap returned an invalid place-search response. Please try again.';
  }
};