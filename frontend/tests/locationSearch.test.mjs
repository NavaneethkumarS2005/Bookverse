import assert from 'node:assert/strict';
import test from 'node:test';
import { createNominatimGeocoder, GeocodingError } from '../src/utils/locationSearch.ts';

const place = { lat: '11.0168', lon: '76.9558', display_name: 'Gandhipuram, Coimbatore, Tamil Nadu, India' };

test('submits an explicit place query and returns real coordinates', async () => {
  let requestUrl;
  const geocoder = createNominatimGeocoder(async url => {
    requestUrl = new URL(url);
    return new Response(JSON.stringify([place]), { status: 200 });
  });

  const result = await geocoder.geocode('Gandhipuram, Coimbatore');
  assert.equal(requestUrl.pathname, '/search');
  assert.equal(requestUrl.searchParams.get('q'), 'Gandhipuram, Coimbatore');
  assert.equal(requestUrl.searchParams.get('format'), 'jsonv2');
  assert.equal(requestUrl.searchParams.get('limit'), '1');
  assert.deepEqual(result, {
    location: { lat: 11.0168, lng: 76.9558 },
    displayName: place.display_name,
  });
});

test('rejects empty submissions without making a request and returns null for no matches', async () => {
  let calls = 0;
  const geocoder = createNominatimGeocoder(async () => {
    calls += 1;
    return new Response('[]', { status: 200 });
  });

  await assert.rejects(geocoder.geocode('   '), error => error instanceof GeocodingError);
  assert.equal(await geocoder.geocode('unknown place'), null);
  assert.equal(calls, 1);
});

test('surfaces rate limits and network failures distinctly', async () => {
  const rateLimited = createNominatimGeocoder(async () => new Response('', {
    status: 429,
    headers: { 'Retry-After': '10' },
  }));
  await assert.rejects(rateLimited.geocode('Coimbatore'), error => (
    error.kind === 'rate-limit' && error.retryAfter === '10'
  ));

  const offline = createNominatimGeocoder(async () => { throw new TypeError('offline'); });
  await assert.rejects(offline.geocode('Coimbatore'), error => error.kind === 'network');
});

test('does not issue duplicate concurrent place lookups', async () => {
  let calls = 0;
  let resolveFetch;
  let markStarted;
  const started = new Promise(resolve => { markStarted = resolve; });
  const geocoder = createNominatimGeocoder(() => {
    calls += 1;
    markStarted();
    return new Promise(resolve => { resolveFetch = resolve; });
  });
  const first = geocoder.geocode('Gandhipuram');
  const duplicate = geocoder.geocode('  gandhipuram  ');
  assert.equal(first, duplicate);
  await started;
  assert.equal(calls, 1);
  resolveFetch(new Response(JSON.stringify([place]), { status: 200 }));
  await Promise.all([first, duplicate]);
});