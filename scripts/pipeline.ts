import fs from 'node:fs';
import path from 'node:path';
import MiniSearch from 'minisearch';
import { z } from 'zod';
import {
  CropCalendar,
  Market,
  MarketSummary,
  Meta,
  Price,
  Program,
  Vendor,
  type ProductCategoryId,
  type SourceMeta,
  type SourceRef,
} from '../src/types';
import { parseSchedule, parseUsdaSchedule } from '../src/lib/schedule/parse';
import { SEARCH_OPTIONS, type SearchDoc } from '../src/lib/search/options';
import { CATEGORY_LABELS } from '../src/lib/labels';
import { fetchMassgis } from './fetch/massgis';
import { fetchSnapRetailers } from './fetch/snap-retailers';
import { fetchUsdaLfp } from './fetch/usda-lfp';
import { fetchUsdaFmd } from './fetch/usda-fmd';
import { isMainland } from './lib/states';
import { fetchErsTracts } from './fetch/ers-tracts';
import { fetchMars, fetchNass } from './fetch/keyed';
import { geocodeMissing } from './geocode';
import { dedupe, mergeCluster } from './dedupe';
import { addTracts, assignSampleVendors, type SeedVendor } from './enrich';
import {
  displayName,
  inferLocationType,
  normalizeStreet,
  normalizeZip,
  slug,
  titleCase,
} from './normalize/text';
import { validate } from './validate';
import { ROOT, log, readJson, today, writeJson, writeText } from './lib/io';
import type { SourceMarket } from './lib/types';

// npm run data — fetch → normalize → geocode → dedupe → enrich → validate → write

const OUT = 'public/data';
const STALE_MONTHS = 12;

function isStale(lastUpdated: string, now = new Date()): boolean {
  // A bare year ("2023") counts as the end of that year, the most generous reading.
  const d = /^\d{4}$/.test(lastUpdated) ? new Date(`${lastUpdated}-12-31`) : new Date(lastUpdated);
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - STALE_MONTHS);
  return d < cutoff;
}

function toMarket(m: SourceMarket & { all: SourceMarket[] }): Omit<Market, 'id'> {
  // MDAR text when we have it (newer); otherwise the USDA directory's structured seasons.
  const parsed =
    m.dayTimeRaw || m.seasonRaw || !m.usdaSeasons
      ? parseSchedule(m.dayTimeRaw, m.seasonRaw)
      : parseUsdaSchedule(m.usdaSeasons);
  const sources: SourceRef[] = [];
  const seen = new Set<string>();
  for (const r of m.all) {
    const k = `${r.source}:${r.sourceId}`;
    if (seen.has(k)) continue;
    seen.add(k);
    sources.push({ name: r.sourceName, id: r.sourceId, url: r.sourceUrl, fetchedAt: r.fetchedAt });
  }
  const loc = inferLocationType(m.locationNote, m.street);
  return {
    name: displayName(m.name, m.winter),
    type: 'farmers_market',
    address: {
      street: normalizeStreet(m.street),
      city: titleCase(m.city),
      county: m.county ? titleCase(m.county) : undefined,
      state: m.state,
      zip: normalizeZip(m.zip),
    },
    geo: { lat: Math.round(m.lat! * 1e5) / 1e5, lng: Math.round(m.lng! * 1e5) / 1e5 },
    ...loc,
    locationNote: m.locationNote,
    winter: m.winter ?? false,
    schedules: parsed.schedules,
    scheduleRaw: parsed.raw || undefined,
    scheduleParsed: parsed.parsed,
    products: [...m.products].sort(),
    productsAreSample: false,
    paymentMethods: [...m.paymentMethods].sort(),
    paymentsAreSample: false,
    programs: [...m.programs].sort(),
    amenities: [],
    vendorIds: [],
    website: m.website ? (/^https?:\/\//.test(m.website) ? m.website : `https://${m.website}`) : undefined,
    sources,
    lastUpdated: m.lastUpdated,
    stale: isStale(m.lastUpdated),
  };
}

function assignIds(markets: Omit<Market, 'id'>[]): Market[] {
  const used = new Map<string, number>();
  return markets
    .map((m) => {
      const base = m.name
        .replace(/\s*\b(winter )?farmers market$/i, '')
        .replace(/\bwinter\b/i, '')
        .trim();
      const city = base.toLowerCase().includes(m.address.city.toLowerCase()) ? '' : ` ${m.address.city}`;
      let id = slug(`${base}${city}${m.winter ? ' winter' : ''} ${m.address.state}`);
      const n = used.get(id) ?? 0;
      used.set(id, n + 1);
      if (n > 0) id = `${id}-${n + 1}`;
      return { id, ...m } as Market;
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function buildSearch(markets: Market[], vendors: Vendor[], crops: CropCalendar): string {
  const docs: SearchDoc[] = [
    ...markets.map((m) => ({
      id: `m:${m.id}`,
      kind: 'market' as const,
      name: m.name,
      city: m.address.city,
      ref: m.id,
      // Kept short: with ~8,000 markets the index is the biggest lazy-loaded file.
      text: m.address.state,
    })),
    ...vendors.map((v) => ({
      id: `v:${v.id}`,
      kind: 'vendor' as const,
      name: v.name,
      city: v.town,
      ref: v.id,
      text: [v.description, ...v.products.map((p) => p.name)].join(' '),
    })),
    ...crops.crops.map((c) => ({
      id: `c:${c.id}`,
      kind: 'crop' as const,
      name: c.name,
      ref: c.id,
      category: c.category,
      text: `${c.nameEs} ${c.id.replace(/_/g, ' ')}`,
    })),
    ...(Object.entries(CATEGORY_LABELS) as [ProductCategoryId, string][]).map(([id, label]) => ({
      id: `k:${id}`,
      kind: 'category' as const,
      name: label,
      ref: id,
      category: id,
      text: id.replace(/_/g, ' '),
    })),
  ];
  const ms = new MiniSearch<SearchDoc>(SEARCH_OPTIONS);
  ms.addAll(docs);
  return JSON.stringify(ms);
}

function sourcesMd(meta: SourceMeta[], builtAt: string): string {
  const rows = meta.map(
    (s) =>
      `| ${s.name} | ${s.url} | ${s.license} | ${s.fetchedAt ?? '—'} | ${s.records} | ${s.status}${s.note ? ` — ${s.note.replace(/\|/g, '/')}` : ''} |`,
  );
  return `# Data sources

Generated by \`npm run data\` on ${builtAt}. Do not edit by hand.

| Source | URL | License / terms | Fetched | Records | Status |
|---|---|---|---|---|---|
${rows.join('\n')}

**Status:** \`ok\` = fetched live · \`snapshot\` = live fetch failed, used the latest file in \`data/raw/\` ·
\`skipped\` = optional key not set · \`failed\` = no data and no snapshot · \`manual\` = hand-curated file in \`data/manual/\`.

**Sample data:** vendors, vendor products and prices in \`data/seed/\` are invented for the demo and are
always labelled "Sample data" in the app. Market product lists and payment methods are derived from them
when no public source lists them (\`productsAreSample\` / \`paymentsAreSample\` on each market).
`;
}

async function main() {
  const builtAt = new Date().toISOString();
  log('pipeline', 'fetching sources');
  const [massgis, usda, snap, lfp, ers, mars, nass] = await Promise.all([
    fetchMassgis(),
    fetchUsdaFmd(),
    fetchSnapRetailers(),
    fetchUsdaLfp(),
    fetchErsTracts(),
    fetchMars(),
    fetchNass(),
  ]);

  const records: SourceMarket[] = [
    ...massgis.flatMap((r) => r.markets ?? []),
    ...(usda.markets ?? []),
    ...(lfp.markets ?? []).filter((m) => isMainland(m.state)),
    ...(snap.markets ?? []),
  ];
  if (!records.some((r) => !r.confirmOnly))
    throw new Error('No market records from any source — refusing to write empty data.');

  log('pipeline', 'geocoding');
  const geo = await geocodeMissing(records);

  log('pipeline', 'deduping');
  const { clusters, log: mergeLog, unmatchedConfirmations } = dedupe(records);
  const markets = assignIds(clusters.map(mergeCluster).map(toMarket));

  log('pipeline', 'enriching');
  const tractHits = addTracts(markets, ers.tracts);
  const seeds = readJson<{ vendors: SeedVendor[] }>('data/seed/vendors.json').vendors;
  const vendors = assignSampleVendors(markets, seeds);
  const prices = readJson<{ prices: Price[] }>('data/seed/prices.json').prices;
  const programs = readJson<Program[]>('data/manual/programs.json');
  const crops = readJson<CropCalendar>('data/manual/crop-calendar-ma.json');

  const manualMeta: SourceMeta[] = [
    {
      id: 'manual-programs',
      name: 'Food-access program rules (hand-curated)',
      url: 'data/manual/programs.json',
      license: 'Compiled from mass.gov, FNS and Fair Food Network pages',
      fetchedAt: null,
      records: programs.length,
      status: 'manual',
    },
    {
      id: 'manual-crops',
      name: crops.source,
      url: crops.sourceUrl,
      license: 'Compiled from MDAR MassGrown',
      fetchedAt: null,
      records: crops.crops.length,
      status: 'manual',
    },
    {
      id: 'manual-emissions',
      name: 'EPA GHG Emission Factors Hub (truck ton-mile factor)',
      url: 'https://www.epa.gov/climateleadership/ghg-emission-factors-hub',
      license: 'Public domain',
      fetchedAt: null,
      records: 1,
      status: 'manual',
    },
    {
      id: 'seed',
      name: 'SAMPLE vendors, products and prices (invented)',
      url: 'data/seed/',
      license: 'Sample data — not real',
      fetchedAt: null,
      records: vendors.length,
      status: 'manual',
      note: `${prices.length} sample prices`,
    },
  ];
  const sourceMeta: SourceMeta[] = [
    ...massgis.map((r) => r.meta),
    usda.meta,
    snap.meta,
    lfp.meta,
    ers.meta,
    mars.meta,
    nass.meta,
    ...manualMeta,
  ];
  const meta: Meta = {
    builtAt,
    region: 'Contiguous United States (Greater Boston focus)',
    marketCount: markets.length,
    sources: sourceMeta,
  };

  const scoreById = new Map(vendors.map((v) => [v.id, v.sustainabilityScore]));
  const summaries = markets.map((m) => ({
    id: m.id,
    name: m.name,
    type: m.type,
    city: m.address.city,
    state: m.address.state,
    schedules: m.schedules,
    scheduleParsed: m.scheduleParsed,
    // The map payload carries raw text only where we couldn't parse it.
    scheduleRaw: m.scheduleParsed ? undefined : m.scheduleRaw,
    products: m.products,
    productsAreSample: m.productsAreSample,
    paymentMethods: m.paymentMethods,
    paymentsAreSample: m.paymentsAreSample,
    programs: m.programs,
    winter: m.winter,
    indoor: m.indoor,
    stale: m.stale,
    lastUpdated: m.lastUpdated,
    vendorIds: m.vendorIds,
    sustainabilityMax: Math.max(0, ...m.vendorIds.map((id) => scoreById.get(id) ?? 0)),
  }));

  log('pipeline', 'validating');
  validate([
    ['markets', z.array(Market), markets],
    ['market summaries', z.array(MarketSummary), summaries],
    ['vendors', z.array(Vendor), vendors],
    ['prices', z.array(Price), prices],
    ['programs', z.array(Program), programs],
    ['crop calendar', CropCalendar, crops],
    ['meta', Meta, meta],
  ]);
  const ma = markets.filter((m) => m.address.state === 'MA').length;
  if (ma < 100 || markets.length < 5000)
    throw new Error(
      `Only ${markets.length} markets (${ma} in MA) — expected at least 5,000 nationally and 100 in MA.`,
    );

  log('pipeline', 'writing');
  fs.rmSync(path.join(ROOT, OUT, 'markets'), { recursive: true, force: true });
  writeJson(`${OUT}/markets.geojson`, {
    type: 'FeatureCollection',
    features: markets.map((m, i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [m.geo.lng, m.geo.lat] },
      properties: summaries[i],
    })),
  });
  for (const m of markets) writeJson(`${OUT}/markets/${m.id}.json`, m);
  writeJson(`${OUT}/vendors.json`, vendors);
  writeJson(
    `${OUT}/products.json`,
    vendors.flatMap((v) => v.products.map((p) => ({ ...p, vendorId: v.id }))),
  );
  writeJson(`${OUT}/prices.json`, prices);
  writeJson(`${OUT}/programs.json`, programs);
  writeJson(`${OUT}/crop-calendar.json`, crops);
  writeJson(`${OUT}/emission-factors.json`, readJson('data/manual/emission-factors.json'));
  if (ers.tracts) {
    // Keep only tracts that are low income or low access: that's all the map layer draws.
    writeJson(`${OUT}/tracts-lila.geojson`, {
      type: 'FeatureCollection',
      features: ers.tracts.features.filter((f) => {
        const p = f.properties as { lowIncome: boolean; lowAccess: boolean };
        return p.lowIncome || p.lowAccess;
      }),
    });
  }
  writeJson(`${OUT}/search-index.json`, JSON.parse(buildSearch(markets, vendors, crops)));
  writeJson(`${OUT}/meta.json`, meta, true);
  writeText('data/SOURCES.md', sourcesMd(sourceMeta, builtAt));

  const unparsed = markets.filter((m) => !m.scheduleParsed);
  writeText(
    'data/reports/dedupe.md',
    `# Dedupe report

Generated ${builtAt}. Records from different sources within 150 m with name similarity ≥ 0.8 were merged.
Review these for false merges.

- Input records: ${records.length} (${records.filter((r) => r.confirmOnly).length} confirm-only SNAP retailer records)
- Markets after dedupe: ${markets.length}
- Merges: ${mergeLog.length}
- SNAP retailer records that matched no market (not added): ${unmatchedConfirmations}
- Geocoded: ${geo.geocoded}, geocoding failed: ${geo.failed}

| Kept | Merged in | Distance (m) | Name similarity |
|---|---|---|---|
${mergeLog.map((l) => `| ${l.kept} | ${l.merged.join('; ')} | ${l.meters} | ${l.similarity} |`).join('\n')}
`,
  );
  writeText(
    'data/reports/quality.md',
    `# Data quality report

Generated ${builtAt}.

- Markets: ${markets.length}
- Schedules parsed into RRULEs: ${markets.length - unparsed.length} (${Math.round(((markets.length - unparsed.length) / markets.length) * 100)}%)
- Stale (last updated more than ${STALE_MONTHS} months ago): ${markets.filter((m) => m.stale).length}
- In a low-income or low-access tract: ${markets.filter((m) => m.tract && (m.tract.lowIncome || m.tract.lowAccess)).length} (tract found for ${tractHits})
- With sample vendors: ${markets.filter((m) => m.vendorIds.length).length}

## Schedules shown as raw text (could not be parsed)

${unparsed.map((m) => `- **${m.name}** (${m.address.city}): ${m.scheduleRaw ?? '(no schedule)'}`).join('\n')}
`,
  );
  log('pipeline', `done: ${markets.length} markets, ${vendors.length} sample vendors, built ${today()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
