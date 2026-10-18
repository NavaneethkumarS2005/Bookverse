import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildOverpassBoundsQuery,
  buildOverpassQuery,
  createOverpassSearcher,
  formatOverpassError,
  parseOverpassResponse,
} from '../src/utils/overpassSearch.ts';

const center = { lat: 11.0016, lng: 76.9675 };
const emptyResponse = () => new Response(JSON.stringify({ elements: [] }), { status: 200 });

test('builds a radius query around the requested Coimbatore coordinates', () => {
  const query = buildOverpassQuery(center, 5);
  assert.match(query, /around:5000,11\.0016,76\.9675/);
  assert.match(query, /\["shop"="books"\]/);
  assert.match(query, /\["amenity"="bookstore"\]/);
  assert.match(query, /out center 20/);
});

test('builds a bounding-box query for area-based OSM fallback searches', () => {
  const query = buildOverpassBoundsQuery({ west: 76.8, south: 10.8, east: 77.1, north: 11.2 });
  assert.match(query, /\(10\.8,76\.8,11\.2,77\.1\)/);
  assert.match(query, /nwr\["shop"="books"\]/);
  assert.match(query, /nwr\["amenity"="bookstore"\]/);
  assert.doesNotMatch(query, /around:/);
});

test('rejects invalid bounds for OSM fallback searches', async () => {
  const searcher = createOverpassSearcher(['only'], async () => emptyResponse());
  await assert.rejects(searcher.searchBounds({ west: 5, south: 5, east: -5, north: 10 }), error => error.kind === 'malformed');
  await assert.rejects(searcher.searchBounds({ west: -10, south: -10, east: 10, north: 10 }), error => error.kind === 'area-too-large');
});

test('parses real bookstore elements and a valid empty response', () => {
  const stores = parseOverpassResponse({ elements: [
    { type: 'node', id: 1, lat: 11.01, lon: 76.97, tags: { shop: 'books', name: 'Local Books', 'addr:city': 'Coimbatore' } },
    { type: 'way', id: 2, center: { lat: 11.02, lon: 76.98 }, tags: { amenity: 'bookstore', brand: 'Reading House' } },
    { type: 'node', id: 3, lat: 11.03, lon: 76.99, tags: { shop: 'books' } },
  ] });
  assert.equal(stores.length, 2);
  assert.equal(stores[0].address, 'Coimbatore');
  assert.equal(stores[1].name, 'Reading House');
  assert.deepEqual(parseOverpassResponse({ elements: [] }), []);
  assert.throws(() => parseOverpassResponse({ remark: 'query failed' }), { kind: 'malformed' });
});

test('reports HTTP 429 without retrying another endpoint', async () => {
  let calls = 0;
  const searcher = createOverpassSearcher(['primary', 'fallback'], async () => {
    calls += 1;
    return new Response('', { status: 429, headers: { 'Retry-After': '30' } });
  });
  await assert.rejects(searcher.search(center, 5), error => error.kind === 'rate-limit' && error.retryAfter === '30');
  assert.equal(calls, 1);
});

test('encodes the bounded bookstore query and falls back once after HTTP 500', async () => {
  const calls = [];
  const searcher = createOverpassSearcher(['primary', 'fallback', 'third'], async (url, request) => {
    calls.push({ url, method: request.method, query: new URLSearchParams(request.body).get('data') });
    return calls.length === 1 ? new Response('', { status: 500 }) : emptyResponse();
  });
  assert.deepEqual(await searcher.search(center, 5), []);
  assert.deepEqual(calls.map(call => call.url), ['primary', 'fallback']);
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].query, buildOverpassQuery(center, 5));
  assert.match(calls[0].query, /nwr\["shop"="books"\]\(around:5000,11\.0016,76\.9675\)/);
  assert.match(calls[0].query, /nwr\["amenity"="bookstore"\]\(around:5000,11\.0016,76\.9675\)/);
  assert.equal(calls[1].query, calls[0].query);
});

test('falls back after a network failure and classifies invalid JSON as malformed', async () => {
  let calls = 0;
  const searcher = createOverpassSearcher(['primary', 'fallback'], async () => {
    calls += 1;
    if (calls === 1) throw new TypeError('Network unavailable');
    return emptyResponse();
  });
  assert.deepEqual(await searcher.search(center, 5), []);
  assert.equal(calls, 2);

  const malformedSearcher = createOverpassSearcher(['only'], async () => new Response('{', { status: 200 }));
  await assert.rejects(malformedSearcher.search(center, 5), error => error.kind === 'malformed');
});

test('reports the actual fetch/CORS failure after the bounded endpoint fallback', async () => {
  const calls = [];
  const searcher = createOverpassSearcher(['primary', 'fallback'], async endpoint => {
    calls.push(endpoint);
    throw new TypeError('Failed to fetch');
  });
  await assert.rejects(searcher.searchBounds({ west: 76.9, south: 10.9, east: 77, north: 11.1 }), error => {
    assert.equal(error.kind, 'network');
    assert.match(formatOverpassError(error), /CORS|network/i);
    return true;
  });
  assert.deepEqual(calls, ['primary', 'fallback']);
});

test('formats network errors across Vite hot-reload module identities', () => {
  const staleModuleError = { name: 'OverpassSearchError', kind: 'network', message: 'Failed to fetch' };
  assert.match(formatOverpassError(staleModuleError), /CORS|network/i);
});

test('distinguishes timeout from caller cancellation', async () => {
  const hangingFetch = (_url, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  });
  const searcher = createOverpassSearcher(['only'], hangingFetch);
  await assert.rejects(searcher.search(center, 5, { timeoutMs: 5 }), error => error.kind === 'timeout');

  let cancelledCalls = 0;
  const fallbackSearcher = createOverpassSearcher(['primary', 'fallback'], async (_url, { signal }) => {
    cancelledCalls += 1;
    return new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
  });
  const controller = new AbortController();
  const cancelled = fallbackSearcher.search(center, 6, { signal: controller.signal, timeoutMs: 1000 });
  controller.abort();
  await assert.rejects(cancelled, error => error.kind === 'aborted');
  assert.equal(cancelledCalls, 1);
});

test('does not issue duplicate concurrent requests for the same search', async () => {
  let calls = 0;
  let resolveFetch;
  const searcher = createOverpassSearcher(['only'], () => {
    calls += 1;
    return new Promise(resolve => { resolveFetch = resolve; });
  });
  const first = searcher.search(center, 5);
  const second = searcher.search(center, 5);
  assert.equal(first, second);
  assert.equal(calls, 1);
  resolveFetch(emptyResponse());
  await Promise.all([first, second]);
});