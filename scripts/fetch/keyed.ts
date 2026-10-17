import { fetchText, fetchWithSnapshot } from '../lib/http';
import { log } from '../lib/io';
import type { SourceMeta } from '../../src/types';

// Optional keyed sources. Each one is skipped (not failed) when its key is missing.

export async function fetchMars(): Promise<{ meta: SourceMeta; reports?: unknown }> {
  const meta = {
    id: 'usda-mars',
    name: 'USDA AMS My Market News (MARS API) — retail price benchmarks',
    url: 'https://mymarketnews.ams.usda.gov',
    license: 'Public domain',
  };
  const key = process.env.MARS_API_KEY;
  if (!key) {
    log(meta.id, 'skipped: MARS_API_KEY is not set');
    return {
      meta: {
        ...meta,
        fetchedAt: null,
        records: 0,
        status: 'skipped',
        note: 'MARS_API_KEY not set; price comparisons show sample data only',
      },
    };
  }
  try {
    const auth = { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}` };
    // National Retail Report – Fruits & Vegetables (report slug may change; list reports to confirm).
    const r = await fetchWithSnapshot(
      'usda-mars',
      'json',
      () =>
        fetchText('https://marsapi.ams.usda.gov/services/v1.2/reports/2306?q=report_begin_date>2026-01-01', {
          init: { headers: auth },
        }),
      (b) => JSON.parse(b),
    );
    const n = Array.isArray(r.data?.results) ? r.data.results.length : 0;
    log(meta.id, `${n} rows (${r.status})`);
    return { reports: r.data, meta: { ...meta, fetchedAt: r.fetchedAt, records: n, status: r.status } };
  } catch (err) {
    log(meta.id, `FAILED: ${(err as Error).message}`);
    return { meta: { ...meta, fetchedAt: null, records: 0, status: 'failed', note: (err as Error).message } };
  }
}

export async function fetchNass(): Promise<{ meta: SourceMeta; rows?: unknown[] }> {
  const meta = {
    id: 'usda-nass',
    name: 'USDA NASS Quick Stats — MA county farm counts',
    url: 'https://quickstats.nass.usda.gov/api',
    license: 'Public domain',
  };
  const key = process.env.NASS_API_KEY;
  if (!key) {
    log(meta.id, 'skipped: NASS_API_KEY is not set');
    return {
      meta: { ...meta, fetchedAt: null, records: 0, status: 'skipped', note: 'NASS_API_KEY not set' },
    };
  }
  try {
    const qs = new URLSearchParams({
      key,
      source_desc: 'CENSUS',
      sector_desc: 'ECONOMICS',
      short_desc: 'FARM OPERATIONS - NUMBER OF OPERATIONS',
      agg_level_desc: 'COUNTY',
      state_alpha: 'MA',
      format: 'JSON',
    });
    const r = await fetchWithSnapshot(
      'usda-nass',
      'json',
      () => fetchText(`https://quickstats.nass.usda.gov/api/api_GET/?${qs}`),
      (b) => (JSON.parse(b).data ?? []) as unknown[],
    );
    log(meta.id, `${r.data.length} rows (${r.status})`);
    return {
      rows: r.data,
      meta: { ...meta, fetchedAt: r.fetchedAt, records: r.data.length, status: r.status },
    };
  } catch (err) {
    log(meta.id, `FAILED: ${(err as Error).message}`);
    return { meta: { ...meta, fetchedAt: null, records: 0, status: 'failed', note: (err as Error).message } };
  }
}
