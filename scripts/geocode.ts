import fs from 'node:fs';
import path from 'node:path';
import { fetchText } from './lib/http';
import { log, ROOT } from './lib/io';
import type { SourceMarket } from './lib/types';

// Census batch geocoder for records missing coordinates. Results are cached by address so
// reruns don't hit the service again.
const CACHE = path.join(ROOT, 'data/cache/geocode.json');
const BATCH_URL = 'https://geocoding.geo.census.gov/geocoder/locations/addressbatch';

type Cache = Record<string, { lat: number; lng: number } | null>;
const keyOf = (m: SourceMarket) =>
  [m.street, m.city, m.state, m.zip].filter(Boolean).join(', ').toLowerCase();

export async function geocodeMissing(markets: SourceMarket[]): Promise<{ geocoded: number; failed: number }> {
  const cache: Cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
  const missing = markets.filter((m) => (m.lat == null || m.lng == null || Number.isNaN(m.lat)) && m.street);
  const todo = [...new Set(missing.map(keyOf))].filter((k) => !(k in cache));
  if (todo.length) {
    const csv = todo
      .map((k, i) => {
        const m = missing.find((x) => keyOf(x) === k)!;
        return [i, m.street, m.city, m.state, m.zip ?? '']
          .map((v) => `"${String(v).replace(/"/g, '')}"`)
          .join(',');
      })
      .join('\n');
    try {
      const form = new FormData();
      form.append('addressFile', new Blob([csv], { type: 'text/csv' }), 'addresses.csv');
      form.append('benchmark', 'Public_AR_Current');
      const body = await fetchText(BATCH_URL, { init: { method: 'POST', body: form }, timeoutMs: 120_000 });
      for (const line of body.split('\n').filter(Boolean)) {
        const cols = line.match(/("([^"]*)"|[^,]+)/g)?.map((c) => c.replace(/^"|"$/g, '')) ?? [];
        const idx = Number(cols[0]);
        const match = cols[2] === 'Match';
        const [lng, lat] = match ? cols[5].split(',').map(Number) : [NaN, NaN];
        cache[todo[idx]] = match ? { lat, lng } : null;
      }
      fs.mkdirSync(path.dirname(CACHE), { recursive: true });
      fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
    } catch (err) {
      log('geocode', `Census geocoder failed: ${(err as Error).message}`);
    }
  }
  let geocoded = 0;
  let failed = 0;
  for (const m of missing) {
    const hit = cache[keyOf(m)];
    if (hit) {
      m.lat = hit.lat;
      m.lng = hit.lng;
      geocoded++;
    } else failed++;
  }
  log('geocode', `${missing.length} records without coordinates: ${geocoded} geocoded, ${failed} failed`);
  return { geocoded, failed };
}
