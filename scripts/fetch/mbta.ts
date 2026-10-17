import { fetchText, fetchWithSnapshot } from '../lib/http';
import { log } from '../lib/io';
import type { SourceMeta } from '../../src/types';

// MBTA V3 API stops (subway, light rail, commuter rail, bus). Saved slim (name/lat/lng/mode)
// because the full response is several MB.
const ID = 'mbta-stops';
const NAME = 'MBTA V3 API — stops';
const URL =
  'https://api-v3.mbta.com/stops?filter[route_type]=0,1,2,3&fields[stop]=name,latitude,longitude,vehicle_type';
const MODES: Record<number, string> = { 0: 'light rail', 1: 'subway', 2: 'commuter rail', 3: 'bus' };

export type Stop = { name: string; lat: number; lng: number; mode: string };

export async function fetchMbta(): Promise<{ meta: SourceMeta; stops?: Stop[] }> {
  try {
    const headers: Record<string, string> = process.env.MBTA_API_KEY
      ? { 'x-api-key': process.env.MBTA_API_KEY }
      : {};
    const r = await fetchWithSnapshot(
      ID,
      'json',
      () => fetchText(URL, { init: { headers } }),
      (b) => JSON.parse(b) as Stop[],
      (b) => {
        const j = JSON.parse(b) as {
          data: {
            attributes: { name: string; latitude: number; longitude: number; vehicle_type: number | null };
          }[];
        };
        const seen = new Set<string>();
        const stops: Stop[] = [];
        for (const s of j.data) {
          const a = s.attributes;
          const mode = MODES[a.vehicle_type ?? 3] ?? 'bus';
          const key = `${a.name}|${mode}`;
          // Collapse platforms of the same station into one stop.
          if (mode !== 'bus' && seen.has(key)) continue;
          seen.add(key);
          stops.push({ name: a.name, lat: +a.latitude.toFixed(5), lng: +a.longitude.toFixed(5), mode });
        }
        return JSON.stringify(stops);
      },
    );
    log(ID, `${r.data.length} stops (${r.status})`);
    return {
      stops: r.data,
      meta: {
        id: ID,
        name: NAME,
        url: 'https://api-v3.mbta.com',
        license: 'MassDOT Developers License Agreement',
        fetchedAt: r.fetchedAt,
        records: r.data.length,
        status: r.status,
        note: r.note,
      },
    };
  } catch (err) {
    log(ID, `FAILED: ${(err as Error).message}`);
    return {
      meta: {
        id: ID,
        name: NAME,
        url: 'https://api-v3.mbta.com',
        license: 'MassDOT',
        fetchedAt: null,
        records: 0,
        status: 'failed',
        note: (err as Error).message,
      },
    };
  }
}
