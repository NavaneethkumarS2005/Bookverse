import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildPlacesSearchPlan,
  createGeoapifyClient,
  GeoapifyError,
  parseGeoapifyGeocodingResponse,
  parseGeoapifyPlacesResponse,
} from '../src/utils/geoapifySearch.ts';

const bookstoreCandidate = {
  result_type: 'amenity',
  category: 'commercial.books',
  name: 'Reader House',
  formatted: 'Reader House, 12 Main Road, Coimbatore, India',
  lat: 11.01,
  lon: 76.97,
  place_id: 'geoapify-bookshop-1',
};

const cityCandidate = {
  result_type: 'city',
  name: 'Coimbatore',
  formatted: 'Coimbatore, Tamil Nadu, India',
  lat: 11.0016,
  lon: 76.9675,
  city: 'Coimbatore',
  state: 'Tamil Nadu',
  country: 'India',
  country_code: 'in',
  place_id: 'geoapify-city-1',
  bbox: { lon1: 76.8, lat1: 10.8, lon2: 77.1, lat2: 11.2 },
  rank: { confidence: 0.98 },
};

const feature = (placeId, name, lon = 76.97, lat = 11.01) => ({
  type: 'Feature',
  id: placeId,
  properties: {
    place_id: placeId,
    name,
    formatted: `${name}, Coimbatore, India`,
    categories: ['commercial', 'commercial.books'],
    lon,
    lat,
    city: 'Coimbatore',
    country: 'India',
  },
  geometry: { type: 'Point', coordinates: [lon, lat] },
});

test('reads the exact Vite Geoapify key name without a hardcoded fallback and ignores local env files', () => {
  const config = readFileSync(new URL('../src/config.ts', import.meta.url), 'utf8');
  const gitignore = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');
  assert.match(config, /import\.meta\.env\.VITE_GEOAPIFY_API_KEY\s*\|\|\s*''/);
  assert.doesNotMatch(config, /VITE_GEOAPIFY_API_KEY\s*\|\|\s*['"][a-f\d]{20,}['"]/i);
  assert.match(gitignore, /^\*\.local\s*$/m);
});

test('parses multiple ranked matches and distinguishes a bookstore from an area', () => {
  const matches = parseGeoapifyGeocodingResponse({ results: [bookstoreCandidate, cityCandidate] });
  assert.equal(matches.length, 2);
  assert.equal(matches[0].isBookstore, true);
  assert.equal(matches[0].isArea, false);
  assert.equal(matches[0].placeId, bookstoreCandidate.place_id);
  assert.equal(matches[1].isBookstore, false);
  assert.equal(matches[1].isArea, true);
  assert.deepEqual(matches[1].bbox, { west: 76.8, south: 10.8, east: 77.1, north: 11.2 });
  assert.equal(matches[1].confidence, 0.98);
});

test('uses the Geoapify place boundary for cities and bbox searches for areas', () => {
  const city = parseGeoapifyGeocodingResponse({ results: [cityCandidate] })[0];
  assert.deepEqual(buildPlacesSearchPlan(city), [{
    filter: `place:${cityCandidate.place_id}`,
    bounds: city.bbox,
    scope: 'area-boundary',
    partial: true,
  }]);

  const bboxOnly = { ...city, placeId: null };
  assert.deepEqual(buildPlacesSearchPlan(bboxOnly), [{
    filter: 'rect:76.8,10.8,77.1,11.2',
    bounds: city.bbox,
    scope: 'area-bbox',
    partial: true,
  }]);
});

test('searches country, state, city, and neighbourhood bounding boxes', () => {
  for (const resultType of ['country', 'state', 'city', 'neighbourhood']) {
    const place = parseGeoapifyGeocodingResponse({ results: [{
      ...cityCandidate,
      result_type: resultType,
      place_id: `${resultType}-id`,
      bbox: { lon1: 76.8, lat1: 10.8, lon2: 77.1, lat2: 11.2 },
    }] })[0];
    const plans = buildPlacesSearchPlan(place);
    assert.equal(plans[0].scope, 'area-boundary');
    assert.equal(plans[0].filter, `place:${resultType}-id`);
  }
});

test('uses proximity bias for a point and a name-biased query for an individual bookstore', () => {
  const city = parseGeoapifyGeocodingResponse({ results: [cityCandidate] })[0];
  const point = { ...city, isArea: false, isBookstore: false, placeId: null, bbox: undefined };
  assert.deepEqual(buildPlacesSearchPlan(point), [{
    bias: `proximity:${point.location.lng},${point.location.lat}`,
    scope: 'nearby-point',
    partial: true,
  }]);

  const bookstore = parseGeoapifyGeocodingResponse({ results: [bookstoreCandidate] })[0];
  assert.equal(buildPlacesSearchPlan(bookstore)[0].name, 'Reader House');
  assert.equal(buildPlacesSearchPlan(bookstore)[0].scope, 'bookstore-match');

  const viewport = { ...point, bbox: { west: 76.8, south: 10.8, east: 77.1, north: 11.2 } };
  assert.deepEqual(buildPlacesSearchPlan(viewport), [{
    filter: 'rect:76.8,10.8,77.1,11.2',
    bounds: viewport.bbox,
    scope: 'map-view',
    partial: true,
  }]);
});

test('parses only valid commercial.books places and deduplicates by provider ID', () => {
  const data = {
    type: 'FeatureCollection',
    features: [
      feature('book-1', 'Reader House'),
      feature('book-1', 'Duplicate ID'),
      { ...feature('not-bookstore', 'Cafe'), properties: { ...feature('x', 'Cafe').properties, categories: ['catering.cafe'] } },
      feature('outside-bounds', 'Far shop', 77.5, 11.5),
      { ...feature('invalid-coordinate', 'Invalid shop'), properties: { ...feature('x', 'Invalid').properties, lat: 200 } },
      {
        ...feature('null-coordinate', 'Null shop'),
        properties: { ...feature('x', 'Null').properties, lat: null },
        geometry: { type: 'Point', coordinates: [null, null] },
      },
    ],
  };
  const results = parseGeoapifyPlacesResponse(data, {
    west: 76.8,
    south: 10.8,
    east: 77.1,
    north: 11.2,
  });
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 'book-1');
  assert.equal(results[0].name, 'Reader House');
  assert.equal(results[0].source, 'Geoapify');
  assert.deepEqual(results[0].categories, ['commercial', 'commercial.books']);
});

test('sends commercial.books boundary search and reports capped area results as partial', async () => {
  let requestUrl;
  const features = Array.from({ length: 20 }, (_, index) => feature(`book-${index}`, `Bookstore ${index}`));
  const client = createGeoapifyClient('test-public-key', async url => {
    requestUrl = new URL(url);
    return new Response(JSON.stringify({ type: 'FeatureCollection', features }), { status: 200 });
  }, 0);
  const city = parseGeoapifyGeocodingResponse({ results: [cityCandidate] })[0];
  const result = await client.searchBookstores(city);

  assert.equal(requestUrl.pathname, '/v2/places');
  assert.equal(requestUrl.searchParams.get('categories'), 'commercial.books');
  assert.equal(requestUrl.searchParams.get('filter'), `place:${cityCandidate.place_id}`);
  assert.equal(requestUrl.searchParams.get('limit'), '20');
  assert.equal(result.stores.length, 20);
  assert.equal(result.scope, 'area-boundary');
  assert.equal(result.partial, true);
  assert.equal(result.requestCount, 1);
});

test('searches an individual bookstore by its resolved name and location', async () => {
  let requestUrl;
  const bookstore = parseGeoapifyGeocodingResponse({ results: [bookstoreCandidate] })[0];
  const client = createGeoapifyClient('test-public-key', async url => {
    requestUrl = new URL(url);
    return new Response(JSON.stringify({
      type: 'FeatureCollection',
      features: [feature(bookstoreCandidate.place_id, bookstoreCandidate.name, bookstoreCandidate.lon, bookstoreCandidate.lat)],
    }), { status: 200 });
  }, 0);

  const result = await client.searchBookstores(bookstore);
  assert.equal(requestUrl.searchParams.get('categories'), 'commercial.books');
  assert.equal(requestUrl.searchParams.get('name'), bookstoreCandidate.name);
  assert.equal(requestUrl.searchParams.get('bias'), `proximity:${bookstoreCandidate.lon},${bookstoreCandidate.lat}`);
  assert.equal(result.scope, 'bookstore-match');
  assert.equal(result.stores[0].placeId, bookstoreCandidate.place_id);
});

test('does not call Geoapify without a key', async () => {
  let calls = 0;
  const client = createGeoapifyClient('', async () => {
    calls += 1;
    return new Response('{}', { status: 200 });
  }, 0);
  await assert.rejects(client.geocode('Coimbatore'), error => error.kind === 'missing-key');
  assert.equal(calls, 0);
});

test('classifies rate limits, exhausted quota, and provider failures', async () => {
  const rateLimited = createGeoapifyClient('test-key', async () => new Response(
    JSON.stringify({ message: 'Too many requests' }),
    { status: 429, headers: { 'Retry-After': '3' } },
  ), 0);
  await assert.rejects(rateLimited.geocode('Coimbatore'), error => (
    error.kind === 'rate-limit' && error.retryAfter === '3'
  ));

  const quota = createGeoapifyClient('test-key', async () => new Response(
    JSON.stringify({ message: 'Daily quota exceeded' }),
    { status: 429 },
  ), 0);
  await assert.rejects(quota.geocode('Coimbatore'), error => error.kind === 'quota-exhausted');

  const providerFailure = createGeoapifyClient('test-key', async () => new Response(
    JSON.stringify({ message: 'Unavailable' }),
    { status: 503 },
  ), 0);
  await assert.rejects(providerFailure.geocode('Coimbatore'), error => error.kind === 'http' && error.status === 503);
});

test('distinguishes invalid API keys from forbidden API access', async () => {
  const invalidKey = createGeoapifyClient('test-key', async () => new Response(
    JSON.stringify({ message: 'Invalid API key' }),
    { status: 401 },
  ), 0);
  await assert.rejects(invalidKey.geocode('Chennai'), error => error.kind === 'invalid-key');

  const forbidden = createGeoapifyClient('test-key', async () => new Response(
    JSON.stringify({ message: 'Referrer not allowed' }),
    { status: 403 },
  ), 0);
  await assert.rejects(forbidden.geocode('Chennai'), error => error.kind === 'forbidden');
});

test('splits moderately large areas into at most four bounded plans and refuses oversized bounds', async () => {
  const state = parseGeoapifyGeocodingResponse({ results: [{
    ...cityCandidate,
    result_type: 'state',
    place_id: 'state-large',
    bbox: { lon1: 76, lat1: 10, lon2: 77, lat2: 11 },
  }] })[0];
  const plans = buildPlacesSearchPlan(state);
  assert.equal(plans.length, 4);
  assert.ok(plans.every(plan => plan.scope === 'area-bbox' && plan.partial));

  const global = parseGeoapifyGeocodingResponse({ results: [{
    ...cityCandidate,
    result_type: 'country',
    place_id: 'country-global',
    bbox: { lon1: -180, lat1: -80, lon2: 180, lat2: 80 },
  }] })[0];
  assert.throws(() => buildPlacesSearchPlan(global), { kind: 'area-too-large' });

  const stateWithoutBounds = parseGeoapifyGeocodingResponse({ results: [{
    ...cityCandidate,
    result_type: 'state',
    place_id: 'state-no-bbox',
    bbox: undefined,
  }] })[0];
  assert.throws(() => buildPlacesSearchPlan(stateWithoutBounds), { kind: 'invalid-query' });
});

test('executes large-area cells sequentially and deduplicates stores across them', async () => {
  let active = 0;
  let maximumActive = 0;
  let calls = 0;
  const client = createGeoapifyClient('test-public-key', async () => {
    calls += 1;
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await Promise.resolve();
    active -= 1;
    return new Response(JSON.stringify({ type: 'FeatureCollection', features: [feature('shared-book', 'Reader House', 76.5, 10.5)] }), { status: 200 });
  }, 0);
  const state = parseGeoapifyGeocodingResponse({ results: [{
    ...cityCandidate,
    result_type: 'state',
    place_id: 'state-large',
    bbox: { lon1: 76, lat1: 10, lon2: 77, lat2: 11 },
  }] })[0];
  const result = await client.searchBookstores(state);
  assert.equal(calls, 4);
  assert.equal(maximumActive, 1);
  assert.equal(result.requestCount, 4);
  assert.equal(result.stores.length, 1);
  assert.equal(result.partial, true);
});

test('rejects malformed responses and invalid area candidates without issuing Places requests', async () => {
  assert.throws(() => parseGeoapifyGeocodingResponse({}), { kind: 'malformed' });
  assert.throws(() => parseGeoapifyPlacesResponse({ features: [] }), { kind: 'malformed' });
  const areaWithoutBounds = {
    ...parseGeoapifyGeocodingResponse({ results: [cityCandidate] })[0],
    placeId: null,
    bbox: undefined,
  };
  assert.throws(() => buildPlacesSearchPlan(areaWithoutBounds), { kind: 'invalid-query' });
});

test('retains the manual coordinate form and OpenStreetMap directions links', () => {
  const page = readFileSync(new URL('../src/pages/BookstoreExplorer.tsx', import.meta.url), 'utf8');
  assert.match(page, /const useManualLocation =/);
  assert.match(page, /Latitude/);
  assert.match(page, /Longitude/);
  assert.match(page, /openstreetmap\.org\/directions/);
  assert.match(page, /map\.flyTo\(\[selectedStore\.location\.lat, selectedStore\.location\.lng\]/);
});