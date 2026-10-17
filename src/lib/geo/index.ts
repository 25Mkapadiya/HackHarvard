import distance from '@turf/distance';

export type LatLng = { lat: number; lng: number };
export const BOSTON: LatLng = { lat: 42.3601, lng: -71.0589 };

export const distanceKm = (a: LatLng, b: LatLng) =>
  distance([a.lng, a.lat], [b.lng, b.lat], { units: 'kilometers' });

export function currentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('unsupported'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  });
}

// Nominatim usage policy: max 1 request/second, no autocomplete, identify the app.
let lastNominatim = 0;
export async function geocodeAddress(query: string): Promise<(LatLng & { label: string }) | null> {
  const wait = lastNominatim + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatim = Date.now();
  const qs = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'us',
    viewbox: '-124.8,49.4,-66.9,24.5', // contiguous US
    bounded: '1',
    email: 'marketday-boston@users.noreply.github.com',
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${qs}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Address search failed (${res.status})`);
  const [hit] = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  return hit
    ? { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name.split(',').slice(0, 3).join(',') }
    : null;
}
