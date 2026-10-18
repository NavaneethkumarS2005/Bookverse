import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { FiCompass, FiExternalLink, FiLoader, FiMapPin, FiNavigation, FiSearch } from 'react-icons/fi';
import { GEOAPIFY_API_KEY, OVERPASS_ENDPOINTS } from '../config';
import { createGeoapifyClient, formatGeoapifyError, type GeoapifyBookstore, type GeoapifyLocation, type GeoBounds } from '../utils/geoapifySearch';
import { createOverpassSearcher, formatOverpassError, OverpassSearchError, type Coordinates, type Store as OpenStreetMapStore } from '../utils/overpassSearch';
import { createNominatimGeocoder, formatGeocodingError } from '../utils/locationSearch';

type ExplorerStore = OpenStreetMapStore | GeoapifyBookstore;

const defaultIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const MapFocus: React.FC<{
  center: Coordinates;
  selectedStore: ExplorerStore | null;
  areaBounds?: GeoapifyLocation['bbox'];
}> = ({ center, selectedStore, areaBounds }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedStore) {
      map.flyTo([selectedStore.location.lat, selectedStore.location.lng], 14, { duration: 0.8 });
      return;
    }
    if (areaBounds) {
      map.fitBounds([[areaBounds.south, areaBounds.west], [areaBounds.north, areaBounds.east]]);
      return;
    }
    map.setView([center.lat, center.lng], 13);
  }, [areaBounds, center, map, selectedStore]);

  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </>
  );
};

const MapViewportBounds: React.FC<{
  onChange: (bounds: GeoBounds | null, center: Coordinates | null) => void;
}> = ({ onChange }) => {
  const map = useMap();
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const updateBounds = () => {
      const bounds = map.getBounds();
      const west = bounds.getWest();
      const east = bounds.getEast();
      if (west > east) {
        onChangeRef.current(null, null);
        return;
      }
      const mapCenter = map.getCenter();
      onChangeRef.current(
        { west, south: bounds.getSouth(), east, north: bounds.getNorth() },
        { lat: mapCenter.lat, lng: mapCenter.lng },
      );
    };

    updateBounds();
    map.on('moveend zoomend', updateBounds);
    return () => {
      map.off('moveend zoomend', updateBounds);
    };
  }, [map]);

  return null;
};

const BookstoreExplorer: React.FC = () => {
  const requestId = useRef(0);
  const activeSearch = useRef<{ key: string; controller: AbortController } | null>(null);
  const placeRequestId = useRef(0);
  const activePlaceSearch = useRef<{ query: string; controller: AbortController } | null>(null);
  const searcher = useRef(createOverpassSearcher(OVERPASS_ENDPOINTS)).current;
  const geoapify = useRef(createGeoapifyClient(GEOAPIFY_API_KEY)).current;
  const geocoder = useRef(createNominatimGeocoder()).current;
  const [center, setCenter] = useState<Coordinates | null>(null);
  const [viewportBounds, setViewportBounds] = useState<GeoBounds | null>(null);
  const viewportRef = useRef<{ bounds: GeoBounds; center: Coordinates } | null>(null);
  const pendingViewportSearch = useRef<GeoapifyLocation | null>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeMatches, setPlaceMatches] = useState<GeoapifyLocation[]>([]);
  const [searchLocation, setSearchLocation] = useState<GeoapifyLocation | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [stores, setStores] = useState<ExplorerStore[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading-map' | 'geocoding' | 'searching' | 'error' | 'permission-denied'>('idle');
  const [message, setMessage] = useState(
    GEOAPIFY_API_KEY
      ? 'Choose a location to search Geoapify for nearby bookstores.'
      : 'Choose a location to see bookstores mapped in OpenStreetMap for that area.',
  );

  const selectedStore = useMemo(
    () => stores.find(store => store.id === selectedId) ?? null,
    [selectedId, stores],
  );

  const searchNearby = useCallback(async (
    searchCenter: Coordinates,
    location: GeoapifyLocation | null = null,
    useViewport = false,
    viewportOverride?: GeoBounds | null,
  ) => {
    const searchKey = `${searchCenter.lat},${searchCenter.lng},${location?.placeId ?? location?.id ?? 'point'}`;
    if (activeSearch.current?.key === searchKey) return;

    activeSearch.current?.controller.abort();
    const activeRequest = ++requestId.current;
    const controller = new AbortController();
    activeSearch.current = { key: searchKey, controller };
    setStatus('searching');
    setMessage(GEOAPIFY_API_KEY
      ? 'Searching Geoapify for nearby bookstores…'
      : 'Searching OpenStreetMap data for nearby bookstores…');
    setSelectedId(null);
    setStores([]);

    try {
      let nextStores: ExplorerStore[];
      let nextMessage: string;
      if (GEOAPIFY_API_KEY) {
        const searchLocation = location ?? {
          id: `point:${searchCenter.lat}:${searchCenter.lng}`,
          placeId: null,
          name: 'Selected coordinates',
          formatted: `${searchCenter.lat}, ${searchCenter.lng}`,
          location: searchCenter,
          resultType: 'point',
          isArea: false,
          isBookstore: false,
        } satisfies GeoapifyLocation;
        const activeViewport = viewportOverride ?? viewportBounds;
        const boundedLocation = useViewport && activeViewport && !searchLocation.isArea && !searchLocation.isBookstore
          ? { ...searchLocation, bbox: activeViewport }
          : searchLocation;
        const result = await geoapify.searchBookstores(boundedLocation, { signal: controller.signal });
        nextStores = result.stores;
        const scopeLabel = result.scope === 'nearby-point'
          ? 'near the selected point'
          : result.scope === 'bookstore-match'
            ? 'for this bookstore match'
            : 'within the selected area';
        const locationLabel = location ? ` for ${location.formatted}` : '';
        nextMessage = nextStores.length
          ? `${nextStores.length} bookstore${nextStores.length === 1 ? '' : 's'} found ${scopeLabel}${locationLabel}.${result.partial ? ' Coverage may be partial because the provider limits results for this search area.' : ''}`
          : `No bookstores were returned ${scopeLabel}${locationLabel}.${result.partial ? ' Coverage may be partial because the provider limits results for this search area.' : ''}`;
      } else {
        const fallbackBounds = location?.bbox ?? (useViewport ? viewportOverride ?? viewportBounds : null);
        if (!fallbackBounds) {
          throw new OverpassSearchError('malformed', 'Map bounds are not ready. Choose a place or search again after the map centers.');
        }
        nextStores = await searcher.searchBounds(fallbackBounds, { signal: controller.signal });
        nextMessage = nextStores.length
          ? `${nextStores.length} bookstore${nextStores.length === 1 ? '' : 's'} mapped in OpenStreetMap for this area.`
          : 'No bookstores were returned for this area. Results depend on mapped OpenStreetMap data and may be limited in some neighborhoods.';
      }
      if (activeRequest !== requestId.current) return;

      setStores(nextStores);
      setSelectedId(location?.isBookstore && nextStores.some(store => store.id === location.placeId)
        ? location.placeId
        : null);
      setStatus('idle');
      setMessage(nextMessage);
    } catch (error) {
      if (activeRequest !== requestId.current) return;
      if (controller.signal.aborted) {
        setStatus('idle');
        setMessage('The bookstore search was cancelled.');
        return;
      }
      console.error('Nearby bookstore search failed:', error);
      setStatus('error');
      setMessage(GEOAPIFY_API_KEY ? formatGeoapifyError(error) : formatOverpassError(error));
    } finally {
      if (activeRequest === requestId.current) activeSearch.current = null;
    }
  }, [geoapify, searcher, viewportBounds]);

  const handleViewportChange = (bounds: GeoBounds | null, mapCenter: Coordinates | null) => {
    if (!bounds || !mapCenter) {
      viewportRef.current = null;
      setViewportBounds(null);
      return;
    }
    viewportRef.current = { bounds, center: mapCenter };
    setViewportBounds(bounds);

    const pending = pendingViewportSearch.current;
    if (!pending || Math.abs(mapCenter.lat - pending.location.lat) > 0.00001
      || Math.abs(mapCenter.lng - pending.location.lng) > 0.00001) return;

    pendingViewportSearch.current = null;
    const boundedLocation = { ...pending, bbox: bounds };
    setSearchLocation(boundedLocation);
    void searchNearby(pending.location, boundedLocation, true, bounds);
  };

  const searchPointInMapView = (location: GeoapifyLocation) => {
    const viewport = viewportRef.current;
    if (viewport && Math.abs(viewport.center.lat - location.location.lat) <= 0.00001
      && Math.abs(viewport.center.lng - location.location.lng) <= 0.00001) {
      const boundedLocation = { ...location, bbox: viewport.bounds };
      setSearchLocation(boundedLocation);
      void searchNearby(location.location, boundedLocation, true, viewport.bounds);
      return;
    }

    pendingViewportSearch.current = location;
    activeSearch.current?.controller.abort();
    requestId.current += 1;
    setSearchLocation(location);
    setCenter(location.location);
    setStatus('searching');
    setMessage('Centering the map before searching its visible area…');
  };

  const selectGeoapifyLocation = (location: GeoapifyLocation) => {
    setPlaceMatches([]);
    setManualLat(String(location.location.lat));
    setManualLng(String(location.location.lng));
    pendingViewportSearch.current = null;
    if (!location.isArea && !location.isBookstore && GEOAPIFY_API_KEY) {
      searchPointInMapView(location);
      return;
    }
    setSearchLocation(location);
    setCenter(location.location);
    void searchNearby(location.location, location);
  };

  const searchPlace = async (event: React.FormEvent) => {
    event.preventDefault();
    const query = placeQuery.trim();
    if (!query) {
      setStatus('error');
      setMessage('Enter a bookstore, area, landmark, or place name to search.');
      return;
    }
    if (activePlaceSearch.current?.query.toLowerCase() === query.toLowerCase()) return;

    setPlaceMatches([]);
    activePlaceSearch.current?.controller.abort();
    const activeRequest = ++placeRequestId.current;
    const controller = new AbortController();
    activePlaceSearch.current = { query, controller };
    setStatus('geocoding');
    setMessage(GEOAPIFY_API_KEY
      ? 'Finding that place with Geoapify…'
      : 'Finding that place with OpenStreetMap…');

    try {
      if (GEOAPIFY_API_KEY) {
        const matches = await geoapify.geocode(query, { signal: controller.signal });
        if (activeRequest !== placeRequestId.current) return;
        if (!matches.length) {
          setStatus('error');
          setMessage('No matching location was found. Try adding a city, region, or country.');
          return;
        }
        setPlaceMatches(matches);
        setStatus('idle');
        setMessage(matches.length === 1
          ? 'Review and select the matching place. The result type shows whether it is a bookstore or an area.'
          : 'Choose the matching place. Bookstore matches are distinguished from city and area matches.');
      } else {
        const result = await geocoder.geocode(query, { signal: controller.signal });
        if (activeRequest !== placeRequestId.current) return;
        if (!result) {
          setStatus('error');
          setMessage('No matching location was found. Try a nearby area or landmark.');
          return;
        }
        setManualLat(String(result.location.lat));
        setManualLng(String(result.location.lng));
        searchPointInMapView({
          id: `point:${result.location.lat}:${result.location.lng}`,
          placeId: null,
          name: result.displayName,
          formatted: result.displayName,
          location: result.location,
          resultType: 'point',
          isArea: false,
          isBookstore: false,
        });
      }
    } catch (error) {
      if (activeRequest !== placeRequestId.current) return;
      if (controller.signal.aborted) {
        setStatus('idle');
        setMessage('Place search was cancelled.');
        return;
      }
      setStatus('error');
      setMessage(GEOAPIFY_API_KEY ? formatGeoapifyError(error) : formatGeocodingError(error));
    } finally {
      if (activeRequest === placeRequestId.current) activePlaceSearch.current = null;
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setStatus('error');
      setMessage('Location is not available in this browser. Enter coordinates below to search another area.');
      return;
    }

    setStatus('loading-map');
    setMessage('Requesting your location only to search bookstores near you.');
    navigator.geolocation.getCurrentPosition(
      position => {
        const nextCenter = { lat: position.coords.latitude, lng: position.coords.longitude };
        setPlaceMatches([]);
        searchPointInMapView({
          id: `point:${nextCenter.lat}:${nextCenter.lng}`,
          placeId: null,
          name: 'Current location',
          formatted: `${nextCenter.lat}, ${nextCenter.lng}`,
          location: nextCenter,
          resultType: 'point',
          isArea: false,
          isBookstore: false,
        });
      },
      error => {
        setStatus(error.code === error.PERMISSION_DENIED ? 'permission-denied' : 'error');
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was not granted. You can enter latitude and longitude below instead.'
            : 'Your location could not be determined. Enter latitude and longitude below instead.',
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const useManualLocation = (event: React.FormEvent) => {
    event.preventDefault();
    const lat = Number(manualLat);
    const lng = Number(manualLng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setStatus('error');
      setMessage('Enter a valid latitude (-90 to 90) and longitude (-180 to 180).');
      return;
    }

    const nextCenter = { lat, lng };
    setPlaceMatches([]);
    searchPointInMapView({
      id: `point:${nextCenter.lat}:${nextCenter.lng}`,
      placeId: null,
      name: 'Selected coordinates',
      formatted: `${nextCenter.lat}, ${nextCenter.lng}`,
      location: nextCenter,
      resultType: 'point',
      isArea: false,
      isBookstore: false,
    });
  };

  const selectStore = (store: ExplorerStore) => {
    setSelectedId(store.id);
  };

  useEffect(() => () => {
    requestId.current += 1;
    activeSearch.current?.controller.abort();
    placeRequestId.current += 1;
    activePlaceSearch.current?.controller.abort();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-5 pb-12 pt-12 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        <ExplorerHeader />

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Find bookstores in a selected place</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                Your location is requested only after you select the button, and is used for this nearby search.
              </p>
            </div>

            <button
              type="button"
              onClick={useMyLocation}
              disabled={status === 'loading-map' || status === 'geocoding' || status === 'searching'}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <FiNavigation />
              Use my location
            </button>
          </div>

          <form onSubmit={searchPlace} className="mt-6 grid gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Search by bookstore or place name
              <input
                type="search"
                value={placeQuery}
                onChange={event => setPlaceQuery(event.target.value)}
                placeholder="Enter bookstore or place (e.g., Gandhipuram, Coimbatore)"
                aria-label="Bookstore or place name"
                disabled={status === 'geocoding' || status === 'searching'}
                className="mt-1.5 w-full"
              />
            </label>
            <button
              type="submit"
              disabled={status === 'geocoding' || status === 'searching'}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <FiSearch />
              Search place
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400 sm:col-span-2">
              {GEOAPIFY_API_KEY
                ? <>Place lookup and bookstores by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer" className="underline">Geoapify</a>; searches run only when submitted.</>
                : <>Geoapify is not configured. Place lookup uses <a href="https://nominatim.openstreetmap.org/" target="_blank" rel="noreferrer" className="underline">OpenStreetMap Nominatim</a>, with bookstore results from OpenStreetMap.</>}
            </p>
          </form>

          {!GEOAPIFY_API_KEY && (
            <p role="note" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              Add <code>VITE_GEOAPIFY_API_KEY</code> to <code>frontend/.env.local</code> and restart Vite to enable Geoapify geocoding and Places search. Vite exposes this public key in browser code; restrict it by site referrer and enable only Geocoding and Places APIs. Existing OpenStreetMap search remains available meanwhile.
            </p>
          )}

          {placeMatches.length > 0 && (
            <div className="mt-4" aria-label="Choose a matching location">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Choose a location</h3>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {placeMatches.map(location => (
                  <li key={location.id}>
                    <button
                      type="button"
                      onClick={() => selectGeoapifyLocation(location)}
                      disabled={status === 'searching'}
                      className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      <span className="block font-semibold text-slate-900 dark:text-white">{location.name}</span>
                      <span className="mt-1 block text-xs font-medium text-indigo-700 dark:text-indigo-300">
                        {location.isBookstore ? 'Bookstore match' : location.resultType.replace(/_/g, ' ')}
                        {location.confidence != null ? ` · ${Math.round(location.confidence * 100)}% match` : ''}
                      </span>
                      <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">{location.formatted}</span>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                        {[location.city, location.state, location.country].filter(Boolean).join(', ')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex justify-end border-t border-slate-200 pt-5 dark:border-slate-800">
            <button
              type="button"
              onClick={() => center && void searchNearby(center, searchLocation, true, viewportRef.current?.bounds)}
              disabled={!center || status === 'loading-map' || status === 'geocoding' || status === 'searching'}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
            >
              <FiSearch />
              Search this area
            </button>
          </div>

          <form onSubmit={useManualLocation} className="mt-5 grid gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:grid-cols-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Latitude
              <input
                inputMode="decimal"
                value={manualLat}
                onChange={event => setManualLat(event.target.value)}
                placeholder="e.g. 13.0827"
                className="mt-1.5"
              />
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Longitude
              <input
                inputMode="decimal"
                value={manualLng}
                onChange={event => setManualLng(event.target.value)}
                placeholder="e.g. 80.2707"
                className="mt-1.5"
              />
            </label>

            <button
              type="submit"
              disabled={status === 'loading-map' || status === 'geocoding' || status === 'searching'}
              className="min-h-11 self-end rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300"
            >
              Search coordinates
            </button>
          </form>
        </section>

        <p
          role="status"
          className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
            status === 'error' || status === 'permission-denied'
              ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200'
              : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          {(status === 'loading-map' || status === 'geocoding' || status === 'searching') && <FiLoader className="mr-2 inline animate-spin" />}
          {message}
        </p>
        {GEOAPIFY_API_KEY && (
          <p className="mt-2 text-right text-xs text-slate-500 dark:text-slate-400">
            Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer" className="underline">Geoapify</a> · Data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap contributors</a>
          </p>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.75fr)]">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800">
            {center ? (
              <MapContainer
                center={[center.lat, center.lng]}
                zoom={13}
                scrollWheelZoom
                className="h-[420px] w-full"
                aria-label="Map of nearby bookstores"
              >
                <MapFocus center={center} selectedStore={selectedStore} areaBounds={searchLocation?.isArea ? searchLocation.bbox : undefined} />
                <MapViewportBounds onChange={handleViewportChange} />
                {stores.map(store => (
                  <Marker
                    key={store.id}
                    position={[store.location.lat, store.location.lng]}
                    icon={defaultIcon}
                    eventHandlers={{
                      click: () => setSelectedId(store.id),
                    }}
                  >
                    <Popup>
                      <div className="max-w-[220px]">
                        <strong>{store.name}</strong>
                        <div className="mt-1 text-sm text-slate-600">{store.address}</div>
                        <a
                          href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${center.lat}%2C${center.lng}%3B${store.location.lat}%2C${store.location.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 font-medium text-indigo-600"
                        >
                          Directions <FiExternalLink />
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <div className="flex h-[420px] items-center justify-center text-center text-sm text-slate-600 dark:text-slate-300">
                <div className="max-w-md px-6">
                  <FiCompass className="mx-auto mb-3 text-2xl" />
                  Choose a location to view nearby bookstores on the map.
                </div>
              </div>
            )}
          </div>

          <aside aria-label="Bookstore results" className="max-h-[420px] overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            {stores.length === 0 ? (
              <div className="p-5 text-center text-sm text-slate-500 dark:text-slate-400">
                <FiCompass className="mx-auto mb-3 text-2xl" />
                {GEOAPIFY_API_KEY ? 'Geoapify bookstore results will appear here.' : 'OpenStreetMap bookstore results will appear here.'}
              </div>
            ) : (
              <ul className="space-y-2">
                {stores.map(store => (
                  <li
                    key={store.id}
                    className={`rounded-2xl transition ${
                      selectedId === store.id
                        ? 'bg-indigo-50 ring-1 ring-indigo-200 dark:bg-indigo-950/40 dark:ring-indigo-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectStore(store)}
                      className="w-full rounded-2xl p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <span className="font-semibold text-slate-900 dark:text-white">{store.name}</span>
                      <span className="mt-1 flex gap-1 text-sm text-slate-600 dark:text-slate-300">
                        <FiMapPin className="mt-1 shrink-0" />
                        {store.address}
                      </span>
                      <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400">{store.source}</span>
                    </button>
                    <a
                      href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${center?.lat ?? store.location.lat}%2C${center?.lng ?? store.location.lng}%3B${store.location.lat}%2C${store.location.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mb-4 ml-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300"
                    >
                      Directions <FiExternalLink />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
};

const ExplorerHeader = () => (
  <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 p-6 shadow-2xl sm:p-8 lg:p-10">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.35),transparent_35%)]" />
    <div className="relative">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300">
        <FiMapPin />
        Bookstore Explorer
      </p>
      <h1 className="max-w-2xl text-4xl font-black tracking-tight text-white md:text-5xl">
        Find bookstores mapped in your selected area.
      </h1>
      <p className="mt-4 max-w-2xl text-slate-300">
        Search for bookstores across a selected place or area using Geoapify or OpenStreetMap data.
      </p>
    </div>
  </section>
);

export default BookstoreExplorer;
