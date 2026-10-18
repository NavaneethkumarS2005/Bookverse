export type Coordinates = { lat: number; lng: number };
export type BoundingBox = { west: number; south: number; east: number; north: number };

export type Store = {
  id: string;
  name: string;
  address: string;
  location: Coordinates;
  source: 'OpenStreetMap';
};

export type OverpassErrorKind = 'rate-limit' | 'http' | 'network' | 'timeout' | 'aborted' | 'malformed' | 'area-too-large';

export class OverpassSearchError extends Error {
  readonly kind: OverpassErrorKind;
  readonly status?: number;
  readonly retryAfter?: string;

  constructor(
    kind: OverpassErrorKind,
    message: string,
    status?: number,
    retryAfter?: string,
  ) {
    super(message);
    this.name = 'OverpassSearchError';
    this.kind = kind;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

const MAX_RESULTS = 20;
const MAX_BOUNDS_AREA_KM2 = 20000;
const MAX_BOUNDS_SPAN_KM = 500;
const DEFAULT_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const REQUEST_TIMEOUT_MS = 18000;

export const buildOverpassQuery = (searchCenter: Coordinates, radiusKm: number) => {
  const radiusMeters = Math.min(Math.max(Math.round(radiusKm * 1000), 500), 25000);
  return `[out:json][timeout:25];(
    nwr["shop"="books"](around:${radiusMeters},${searchCenter.lat},${searchCenter.lng});
    nwr["amenity"="bookstore"](around:${radiusMeters},${searchCenter.lat},${searchCenter.lng});
  );out center ${MAX_RESULTS};`;
};

export const buildOverpassBoundsQuery = (bounds: BoundingBox) => `[out:json][timeout:25];(
  nwr["shop"="books"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  nwr["amenity"="bookstore"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
);out center ${MAX_RESULTS};`;

const parseAddress = (tags: Record<string, string>) => {
  const street = tags['addr:street'];
  const city = tags['addr:city'];
  const state = tags['addr:state'];
  const country = tags['addr:country'];
  return [street, city, state, country].filter(Boolean).join(', ') || 'Address not provided';
};

const getStoreLocation = (element: any): Coordinates | null => {
  const coordinates = element?.lat != null && element?.lon != null
    ? { lat: Number(element.lat), lng: Number(element.lon) }
    : element?.center?.lat != null && element?.center?.lon != null
      ? { lat: Number(element.center.lat), lng: Number(element.center.lon) }
      : null;

  if (!coordinates || !Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng)
    || coordinates.lat < -90 || coordinates.lat > 90 || coordinates.lng < -180 || coordinates.lng > 180) {
    return null;
  }
  return coordinates;
};

export const parseOverpassResponse = (data: unknown): Store[] => {
  if (!data || typeof data !== 'object' || !Array.isArray((data as { elements?: unknown }).elements)) {
    throw new OverpassSearchError('malformed', 'Overpass response did not contain a valid elements list.');
  }

  const elements = (data as { elements: any[] }).elements;
  const stores = elements
    .filter(element => {
      const tags = element?.tags;
      return ['node', 'way', 'relation'].includes(element?.type)
        && (typeof element?.id === 'number' || typeof element?.id === 'string')
        && tags && typeof tags === 'object'
        && (tags.shop === 'books' || tags.amenity === 'bookstore')
        && Boolean(tags.name || tags.brand)
        && getStoreLocation(element);
    })
    .map(element => {
      const tags = element.tags as Record<string, string>;
      return {
        id: `overpass-${element.type}-${element.id}`,
        name: tags.name || tags.brand,
        address: parseAddress(tags),
        location: getStoreLocation(element)!,
        source: 'OpenStreetMap' as const,
      };
    });

  const seenLocations = new Set<string>();
  return stores.filter(store => {
    const key = `${store.location.lat.toFixed(5)}:${store.location.lng.toFixed(5)}`;
    if (seenLocations.has(key)) return false;
    seenLocations.add(key);
    return true;
  }).slice(0, MAX_RESULTS);
};

const isRetryable = (error: OverpassSearchError) => error.kind === 'network'
  || error.kind === 'timeout'
  || error.kind === 'malformed'
  || (error.kind === 'http' && [500, 502, 503, 504].includes(error.status ?? 0));

const requestEndpoint = async (
  endpoint: string,
  query: string,
  signal: AbortSignal | undefined,
  timeoutMs: number,
  fetcher: typeof fetch,
) => {
  const controller = new AbortController();
  let timedOut = false;
  const abortRequest = () => controller.abort();
  signal?.addEventListener('abort', abortRequest, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    if (signal?.aborted) throw new OverpassSearchError('aborted', 'The bookstore search was cancelled.');
    const response = await fetcher(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json',
      },
      body: new URLSearchParams({ data: query }).toString(),
      signal: controller.signal,
    });

    if (!response.ok) {
      const retryAfter = response.headers.get('Retry-After') ?? undefined;
      const kind = response.status === 429 ? 'rate-limit' : 'http';
      throw new OverpassSearchError(kind, `Overpass returned HTTP ${response.status}.`, response.status, retryAfter);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new OverpassSearchError('malformed', 'Overpass returned invalid JSON.');
    }
    return parseOverpassResponse(data);
  } catch (error) {
    if (error instanceof OverpassSearchError) throw error;
    if (signal?.aborted) throw new OverpassSearchError('aborted', 'The bookstore search was cancelled.');
    if (timedOut) throw new OverpassSearchError('timeout', 'The Overpass request timed out.');
    if (error instanceof Error && error.name === 'AbortError') {
      throw new OverpassSearchError('aborted', 'The bookstore search was cancelled.');
    }
    throw new OverpassSearchError('network', 'Could not connect to the Overpass service.');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortRequest);
  }
};

export const createOverpassSearcher = (
  endpoints: string[] = DEFAULT_ENDPOINTS,
  fetcher: typeof fetch = fetch,
) => {
  const inFlight = new Map<string, Promise<Store[]>>();

  const execute = (query: string, options: { signal?: AbortSignal; timeoutMs?: number } = {}) => {
    const key = `${query}\n${endpoints.join(',')}`;
    const existing = inFlight.get(key);
    if (existing) return existing;

    const request = (async () => {
      let lastError: OverpassSearchError | undefined;
      for (let index = 0; index < endpoints.length; index += 1) {
        try {
          return await requestEndpoint(
            endpoints[index], query, options.signal, options.timeoutMs ?? REQUEST_TIMEOUT_MS, fetcher,
          );
        } catch (error) {
          const normalized = error instanceof OverpassSearchError
            ? error
            : new OverpassSearchError('network', 'Could not connect to the Overpass service.');
          if (normalized.kind === 'aborted' || normalized.kind === 'rate-limit'
            || index === endpoints.length - 1 || !isRetryable(normalized)) {
            throw normalized;
          }
          lastError = normalized;
        }
      }
      throw lastError ?? new OverpassSearchError('network', 'No Overpass endpoint is configured.');
    })();

    inFlight.set(key, request);
    const clearRequest = () => {
      if (inFlight.get(key) === request) inFlight.delete(key);
    };
    void request.then(clearRequest, clearRequest);
    return request;
  };

  const search = (center: Coordinates, radiusKm: number, options: { signal?: AbortSignal; timeoutMs?: number } = {}) => (
    execute(buildOverpassQuery(center, radiusKm), options)
  );

  const searchBounds = (bounds: BoundingBox, options: { signal?: AbortSignal; timeoutMs?: number } = {}) => {
    if (![bounds.west, bounds.south, bounds.east, bounds.north].every(Number.isFinite)
      || bounds.west < -180 || bounds.east > 180 || bounds.south < -90 || bounds.north > 90
      || bounds.west > bounds.east || bounds.south > bounds.north) {
      return Promise.reject(new OverpassSearchError('malformed', 'The selected map bounds are invalid.'));
    }
    const middleLatitude = (bounds.south + bounds.north) / 2;
    const widthKm = (bounds.east - bounds.west) * 111.32 * Math.cos(middleLatitude * Math.PI / 180);
    const heightKm = (bounds.north - bounds.south) * 110.574;
    if (widthKm > MAX_BOUNDS_SPAN_KM || heightKm > MAX_BOUNDS_SPAN_KM || widthKm * heightKm > MAX_BOUNDS_AREA_KM2) {
      return Promise.reject(new OverpassSearchError('area-too-large', 'Zoom in to a smaller map area before searching OpenStreetMap.'));
    }
    return execute(buildOverpassBoundsQuery(bounds), options);
  };

  return { search, searchBounds };
};

export const formatOverpassError = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('kind' in error)) {
    return 'The bookstore search failed unexpectedly. Please try again.';
  }

  const errorDetails = error as { kind?: unknown; status?: unknown; retryAfter?: unknown; message?: unknown };
  const kind = typeof errorDetails.kind === 'string' ? errorDetails.kind : '';
  const status = typeof errorDetails.status === 'number' ? errorDetails.status : undefined;
  const retryAfter = typeof errorDetails.retryAfter === 'string' ? errorDetails.retryAfter : undefined;
  const message = typeof errorDetails.message === 'string' ? errorDetails.message : '';

  switch (kind) {
    case 'rate-limit':
      return `The Overpass service rate-limited this search (HTTP 429).${retryAfter ? ` Try again after ${retryAfter}.` : ' Please wait before trying again.'}`;
    case 'http':
      return `The Overpass service returned HTTP ${status}. It may be temporarily unavailable; please try again later.`;
    case 'network':
      return 'The Overpass request failed before a readable HTTP response. The endpoint may be offline, timed out, or blocked by browser CORS.';
    case 'timeout':
      return 'The Overpass search timed out. The service may be busy; try again shortly.';
    case 'aborted':
      return 'The bookstore search was cancelled.';
    case 'malformed':
      return 'The Overpass service returned an invalid response. Please try again later.';
    case 'area-too-large':
      return message || 'Zoom in to a smaller map area before searching OpenStreetMap.';
    default:
      return 'The bookstore search failed unexpectedly. Please try again.';
  }
};