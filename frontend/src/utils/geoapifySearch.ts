import type { Coordinates } from './overpassSearch';

export type GeoBounds = { west: number; south: number; east: number; north: number };

export type GeoapifyLocation = {
  id: string;
  placeId: string | null;
  name: string;
  formatted: string;
  location: Coordinates;
  resultType: string;
  category?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  confidence?: number;
  bbox?: GeoBounds;
  isArea: boolean;
  isBookstore: boolean;
};

export type GeoapifyBookstore = {
  id: string;
  placeId: string;
  name: string;
  address: string;
  location: Coordinates;
  categories: string[];
  distance?: number;
  city?: string;
  state?: string;
  country?: string;
  website?: string;
  phone?: string;
  openingHours?: string;
  source: 'Geoapify';
};

export type GeoapifySearchResult = {
  stores: GeoapifyBookstore[];
  partial: boolean;
  scope: 'area-boundary' | 'area-bbox' | 'map-view' | 'nearby-point' | 'bookstore-match';
  requestCount: number;
};

export type GeoapifyErrorKind =
  | 'missing-key'
  | 'rate-limit'
  | 'quota-exhausted'
  | 'invalid-key'
  | 'forbidden'
  | 'invalid-query'
  | 'area-too-large'
  | 'http'
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'malformed';

export class GeoapifyError extends Error {
  readonly kind: GeoapifyErrorKind;
  readonly status?: number;
  readonly retryAfter?: string;

  constructor(kind: GeoapifyErrorKind, message: string, status?: number, retryAfter?: string) {
    super(message);
    this.name = 'GeoapifyError';
    this.kind = kind;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

const GEOCODING_URL = 'https://api.geoapify.com/v1/geocode/search';
const PLACES_URL = 'https://api.geoapify.com/v2/places';
const BOOKSTORE_CATEGORY = 'commercial.books';
const MAX_RESULTS = 20;
const MAX_TOTAL_RESULTS = 80;
const MAX_AREA_REQUESTS = 4;
const SPLIT_AREA_KM2 = 5000;
const MAX_AREA_KM2 = 80000;
const MAX_AREA_SPAN_KM = 1000;
const REQUEST_TIMEOUT_MS = 15000;
const MIN_REQUEST_INTERVAL_MS = 250;
const AREA_RESULT_TYPES = new Set([
  'city', 'county', 'country', 'district', 'locality', 'neighbourhood', 'postcode',
  'region', 'state', 'suburb',
]);

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export type PlacesRequestPlan = {
  filter?: string;
  bias?: string;
  name?: string;
  bounds?: GeoBounds;
  scope: GeoapifySearchResult['scope'];
  partial: boolean;
};

const boundsDimensionsKm = (bounds: GeoBounds) => {
  const middleLatitude = (bounds.south + bounds.north) / 2;
  const width = (bounds.east - bounds.west) * 111.32 * Math.cos(middleLatitude * Math.PI / 180);
  const height = (bounds.north - bounds.south) * 110.574;
  return { width, height, area: width * height };
};

const splitBounds = (bounds: GeoBounds): GeoBounds[] => {
  const middleLongitude = (bounds.west + bounds.east) / 2;
  const middleLatitude = (bounds.south + bounds.north) / 2;
  return [
    { west: bounds.west, south: bounds.south, east: middleLongitude, north: middleLatitude },
    { west: middleLongitude, south: bounds.south, east: bounds.east, north: middleLatitude },
    { west: bounds.west, south: middleLatitude, east: middleLongitude, north: bounds.north },
    { west: middleLongitude, south: middleLatitude, east: bounds.east, north: bounds.north },
  ];
};

const rectFilter = ({ west, south, east, north }: GeoBounds) => `rect:${west},${south},${east},${north}`;

export const buildPlacesSearchPlan = (place: GeoapifyLocation): PlacesRequestPlan[] => {
  if (place.isArea) {
    if (!place.bbox) {
      if (['country', 'state', 'region', 'county'].includes(place.resultType)) {
        throw new GeoapifyError('invalid-query', 'This large area has no usable bounding box. Choose a smaller city or neighbourhood.');
      }
      if (place.placeId) {
        return [{ filter: `place:${place.placeId}`, scope: 'area-boundary', partial: true }];
      }
      throw new GeoapifyError('invalid-query', 'This area has no searchable boundary. Choose a smaller area or a different match.');
    }

    const dimensions = boundsDimensionsKm(place.bbox);
    if (dimensions.area > MAX_AREA_KM2 || dimensions.width > MAX_AREA_SPAN_KM || dimensions.height > MAX_AREA_SPAN_KM) {
      throw new GeoapifyError('area-too-large', 'This area is too large for a bounded bookstore search. Choose a smaller region or city.');
    }

    if (dimensions.area > SPLIT_AREA_KM2 && place.bbox.west !== place.bbox.east && place.bbox.south !== place.bbox.north) {
      return splitBounds(place.bbox).slice(0, MAX_AREA_REQUESTS).map(bounds => ({
        filter: rectFilter(bounds),
        bounds,
        scope: 'area-bbox',
        partial: true,
      }));
    }

    if (place.placeId) {
      return [{ filter: `place:${place.placeId}`, bounds: place.bbox, scope: 'area-boundary', partial: true }];
    }
    return [{ filter: rectFilter(place.bbox), bounds: place.bbox, scope: 'area-bbox', partial: true }];
  }

  if (place.isBookstore) {
    return [{
      bias: `proximity:${place.location.lng},${place.location.lat}`,
      name: place.name,
      bounds: place.bbox,
      scope: 'bookstore-match',
      partial: true,
    }];
  }

  if (place.bbox) {
    return [{ filter: rectFilter(place.bbox), bounds: place.bbox, scope: 'map-view', partial: true }];
  }

  return [{
    bias: `proximity:${place.location.lng},${place.location.lat}`,
    scope: 'nearby-point',
    partial: true,
  }];
};

const validCoordinates = (lat: unknown, lon: unknown): Coordinates | null => {
  const isCoordinateValue = (value: unknown) => (typeof value === 'number'
    || (typeof value === 'string' && value.trim() !== ''));
  if (!isCoordinateValue(lat) || !isCoordinateValue(lon)) return null;
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  return { lat: latitude, lng: longitude };
};

const parseBounds = (value: unknown): GeoBounds | undefined => {
  if (!isRecord(value)) return undefined;
  const lon1 = Number(value.lon1);
  const lon2 = Number(value.lon2);
  const lat1 = Number(value.lat1);
  const lat2 = Number(value.lat2);
  if (![lon1, lon2, lat1, lat2].every(Number.isFinite)
    || lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180
    || lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90
    || lon1 > lon2 || lat1 > lat2) return undefined;
  return { west: lon1, south: lat1, east: lon2, north: lat2 };
};

export const parseGeoapifyGeocodingResponse = (value: unknown): GeoapifyLocation[] => {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new GeoapifyError('malformed', 'Geoapify returned an invalid geocoding response.');
  }

  return value.results.flatMap((raw): GeoapifyLocation[] => {
    if (!isRecord(raw)) return [];
    const location = validCoordinates(raw.lat, raw.lon);
    if (!location) return [];

    const resultType = typeof raw.result_type === 'string' ? raw.result_type : 'unknown';
    const placeId = typeof raw.place_id === 'string' && raw.place_id ? raw.place_id : null;
    const name = typeof raw.name === 'string' && raw.name
      ? raw.name
      : typeof raw.address_line1 === 'string' && raw.address_line1
        ? raw.address_line1
        : typeof raw.formatted === 'string' && raw.formatted
          ? raw.formatted
          : 'Unnamed location';
    const formatted = typeof raw.formatted === 'string' && raw.formatted ? raw.formatted : name;
    const category = typeof raw.category === 'string' ? raw.category : undefined;
    const rank = isRecord(raw.rank) ? raw.rank : undefined;
    const confidence = rank && Number.isFinite(Number(rank.confidence)) ? Number(rank.confidence) : undefined;

    return [{
      id: placeId ?? `${resultType}:${location.lat}:${location.lng}:${formatted}`,
      placeId,
      name,
      formatted,
      location,
      resultType,
      category,
      city: typeof raw.city === 'string' ? raw.city : undefined,
      county: typeof raw.county === 'string' ? raw.county : undefined,
      state: typeof raw.state === 'string' ? raw.state : undefined,
      country: typeof raw.country === 'string' ? raw.country : undefined,
      countryCode: typeof raw.country_code === 'string' ? raw.country_code : undefined,
      confidence,
      bbox: parseBounds(raw.bbox),
      isArea: AREA_RESULT_TYPES.has(resultType),
      isBookstore: category === BOOKSTORE_CATEGORY,
    }];
  });
};

const isBookstoreCategory = (category: unknown) => Array.isArray(category)
  && category.some(item => typeof item === 'string'
    && (item === BOOKSTORE_CATEGORY || item.startsWith(`${BOOKSTORE_CATEGORY}.`)));

export const parseGeoapifyPlacesResponse = (
  value: unknown,
  bounds?: GeoBounds,
): GeoapifyBookstore[] => {
  if (!isRecord(value) || value.type !== 'FeatureCollection' || !Array.isArray(value.features)) {
    throw new GeoapifyError('malformed', 'Geoapify returned an invalid Places response.');
  }

  const stores = new Map<string, GeoapifyBookstore>();
  for (const feature of value.features) {
    if (!isRecord(feature) || !isRecord(feature.properties)) continue;
    const properties = feature.properties;
    const rawCategories = properties.categories;
    if (!Array.isArray(rawCategories) || !isBookstoreCategory(rawCategories)) continue;
    const categories = rawCategories.filter((item: unknown): item is string => typeof item === 'string');
    const contact = isRecord(properties.contact) ? properties.contact : undefined;

    const geometry = isRecord(feature.geometry) ? feature.geometry : undefined;
    const coordinates = geometry && Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
    const location = validCoordinates(properties.lat ?? coordinates[1], properties.lon ?? coordinates[0]);
    if (!location) continue;
    if (bounds && (location.lng < bounds.west || location.lng > bounds.east
      || location.lat < bounds.south || location.lat > bounds.north)) continue;

    const placeId = typeof properties.place_id === 'string' && properties.place_id
      ? properties.place_id
      : typeof feature.id === 'string' && feature.id
        ? feature.id
        : null;
    if (!placeId || stores.has(placeId)) continue;
    const name = typeof properties.name === 'string' && properties.name
      ? properties.name
      : typeof properties.address_line1 === 'string' && properties.address_line1
        ? properties.address_line1
        : null;
    if (!name) continue;

    const address = typeof properties.formatted === 'string' && properties.formatted
      ? properties.formatted
      : [properties.address_line1, properties.address_line2].filter(value => typeof value === 'string' && value).join(', ');
    stores.set(placeId, {
      id: placeId,
      placeId,
      name,
      address,
      location,
      categories,
      distance: Number.isFinite(Number(properties.distance)) ? Number(properties.distance) : undefined,
      city: typeof properties.city === 'string' ? properties.city : undefined,
      state: typeof properties.state === 'string' ? properties.state : undefined,
      country: typeof properties.country === 'string' ? properties.country : undefined,
      website: typeof properties.website === 'string' ? properties.website : undefined,
      phone: typeof contact?.phone === 'string' ? contact.phone : undefined,
      openingHours: typeof properties.opening_hours === 'string' ? properties.opening_hours : undefined,
      source: 'Geoapify',
    });
  }
  return [...stores.values()].slice(0, MAX_RESULTS);
};

const responseErrorMessage = async (response: Response) => {
  try {
    const body: unknown = await response.clone().json();
    if (!isRecord(body)) return '';
    return [body.message, body.error, body.description]
      .filter((part): part is string => typeof part === 'string')
      .join(' ')
      .toLowerCase();
  } catch {
    return '';
  }
};

const delayWithSignal = (milliseconds: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
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

export const createGeoapifyClient = (
  apiKey: string,
  fetcher: typeof fetch = fetch,
  minimumIntervalMs = MIN_REQUEST_INTERVAL_MS,
) => {
  const inFlight = new Map<string, Promise<unknown>>();
  let requestQueue = Promise.resolve();
  let nextRequestAt = 0;

  const requestJson = <T>(key: string, url: URL, signal: AbortSignal | undefined, parse: (data: unknown) => T) => {
    if (!apiKey.trim()) {
      return Promise.reject(new GeoapifyError('missing-key', 'Configure VITE_GEOAPIFY_API_KEY to use Geoapify search.'));
    }
    const existing = inFlight.get(key);
    if (existing) return existing as Promise<T>;

    const request = (async () => {
      let releaseQueue = () => {};
      const previous = requestQueue;
      requestQueue = new Promise<void>(resolve => { releaseQueue = resolve; });
      await previous;
      try {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        const waitMs = Math.max(0, nextRequestAt - Date.now());
        if (waitMs) await delayWithSignal(waitMs, signal);
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        nextRequestAt = Date.now() + minimumIntervalMs;
      } finally {
        releaseQueue();
      }

      const controller = new AbortController();
      let timedOut = false;
      const abortRequest = () => controller.abort();
      signal?.addEventListener('abort', abortRequest, { once: true });
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, REQUEST_TIMEOUT_MS);

      try {
        const response = await fetcher(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
        if (!response.ok) {
          const details = await responseErrorMessage(response);
          const retryAfter = response.headers.get('Retry-After') ?? undefined;
          if (response.status === 429) {
            const kind = /quota|daily limit|monthly limit/.test(details) ? 'quota-exhausted' : 'rate-limit';
            throw new GeoapifyError(kind, 'Geoapify rejected the request due to usage limits.', response.status, retryAfter);
          }
          if (response.status === 401) {
            throw new GeoapifyError('invalid-key', 'Geoapify rejected the API key.', response.status);
          }
          if (response.status === 403) {
            throw new GeoapifyError('forbidden', 'Geoapify denied this request. Check API permissions and allowed referrers.', response.status);
          }
          if (response.status === 400) {
            throw new GeoapifyError('invalid-query', 'Geoapify could not accept this search request.', response.status);
          }
          throw new GeoapifyError('http', `Geoapify returned HTTP ${response.status}.`, response.status, retryAfter);
        }

        let data: unknown;
        try {
          data = await response.json();
        } catch {
          throw new GeoapifyError('malformed', 'Geoapify returned invalid JSON.');
        }
        return parse(data);
      } catch (error) {
        if (error instanceof GeoapifyError) throw error;
        if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
          if (timedOut && !signal?.aborted) throw new GeoapifyError('timeout', 'Geoapify search timed out. Try again shortly.');
          throw new GeoapifyError('aborted', 'Geoapify search was cancelled.');
        }
        if (timedOut) throw new GeoapifyError('timeout', 'Geoapify search timed out. Try again shortly.');
        throw new GeoapifyError('network', 'Could not connect to Geoapify. Check your connection and try again.');
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abortRequest);
      }
    })();

    inFlight.set(key, request);
    const clearRequest = () => {
      if (inFlight.get(key) === request) inFlight.delete(key);
    };
    void request.then(clearRequest, clearRequest);
    return request;
  };

  const geocode = (query: string, options: { signal?: AbortSignal } = {}) => {
    const normalizedQuery = query.trim().replace(/\s+/g, ' ');
    if (!normalizedQuery) return Promise.reject(new GeoapifyError('invalid-query', 'Enter a place or bookstore name.'));
    const url = new URL(GEOCODING_URL);
    url.searchParams.set('text', normalizedQuery);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '5');
    url.searchParams.set('lang', 'en');
    url.searchParams.set('bias', 'countrycode:none');
    url.searchParams.set('apiKey', apiKey);
    return requestJson(`geocode:${normalizedQuery.toLocaleLowerCase()}`, url, options.signal, parseGeoapifyGeocodingResponse);
  };

  const searchBookstores = (
    place: GeoapifyLocation,
    options: { signal?: AbortSignal } = {},
  ): Promise<GeoapifySearchResult> => {
    if (!validCoordinates(place.location.lat, place.location.lng)) {
      return Promise.reject(new GeoapifyError('invalid-query', 'Choose a valid location before searching.'));
    }

    const plans = buildPlacesSearchPlan(place);
    const storesById = new Map<string, GeoapifyBookstore>();
    let partial = plans.some(plan => plan.partial);
    let requestCount = 0;

    const search = async () => {
      for (const plan of plans) {
        const url = new URL(PLACES_URL);
        url.searchParams.set('categories', BOOKSTORE_CATEGORY);
        if (plan.filter) url.searchParams.set('filter', plan.filter);
        if (plan.bias) url.searchParams.set('bias', plan.bias);
        if (plan.name) url.searchParams.set('name', plan.name);
        url.searchParams.set('limit', String(MAX_RESULTS));
        url.searchParams.set('lang', 'en');
        url.searchParams.set('apiKey', apiKey);

        const requestKey = `places:${plan.filter ?? plan.bias}:${plan.name ?? ''}:${BOOKSTORE_CATEGORY}`;
        const stores = await requestJson(requestKey, url, options.signal, data => (
          parseGeoapifyPlacesResponse(data, plan.bounds)
        ));
        requestCount += 1;
        if (stores.length >= MAX_RESULTS) partial = true;
        for (const store of stores) {
          if (!storesById.has(store.placeId)) storesById.set(store.placeId, store);
        }
        if (storesById.size >= MAX_TOTAL_RESULTS) {
          partial = true;
          break;
        }
      }

      if (place.isBookstore && place.placeId && !storesById.has(place.placeId)) {
        storesById.set(place.placeId, {
          id: place.placeId,
          placeId: place.placeId,
          name: place.name,
          address: place.formatted,
          location: place.location,
          categories: place.category ? [place.category] : [BOOKSTORE_CATEGORY],
          city: place.city,
          state: place.state,
          country: place.country,
          source: 'Geoapify',
        });
      }

      return {
        stores: [...storesById.values()].slice(0, MAX_TOTAL_RESULTS),
        scope: plans[0].scope,
        partial,
        requestCount,
      };
    };

    return search();
  };

  return { geocode, searchBookstores };
};

export const formatGeoapifyError = (error: unknown) => {
  if (!(error instanceof GeoapifyError)) return 'Geoapify search failed unexpectedly. Please try again.';
  switch (error.kind) {
    case 'missing-key':
      return 'Add VITE_GEOAPIFY_API_KEY to frontend/.env.local and restart Vite to enable Geoapify search.';
    case 'rate-limit':
      return `Geoapify rate limit reached (HTTP 429).${error.retryAfter ? ` Retry after ${error.retryAfter}.` : ' Wait briefly before trying again.'}`;
    case 'quota-exhausted':
      return 'Geoapify daily quota is exhausted. Try again after the quota resets or review your Geoapify plan.';
    case 'invalid-key':
      return 'Geoapify rejected the API key. Check that it is active and copied to frontend/.env.local.';
    case 'forbidden':
      return 'Geoapify denied this request. Check that Geocoding and Places are enabled and this site is an allowed referrer.';
    case 'invalid-query':
      return error.message;
    case 'area-too-large':
      return error.message;
    case 'http':
      return `Geoapify returned HTTP ${error.status}. Please try again later.`;
    case 'network':
      return error.message;
    case 'timeout':
    case 'aborted':
      return error.message;
    case 'malformed':
      return error.message;
  }
};