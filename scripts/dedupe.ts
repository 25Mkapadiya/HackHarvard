import { matchName } from './normalize/text';
import type { SourceMarket } from './lib/types';

// Cross-source dedupe: records from *different* sources within 150 m whose names are at least
// 0.8 similar (Jaro-Winkler on normalized names) describe the same market and are merged.
// Records from the same source are never merged with each other — MDAR lists a market's
// summer and winter seasons as separate records at the same spot, and they are different markets.

export const MAX_METERS = 150;
export const MIN_SIMILARITY = 0.8;

export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aHit = new Array<boolean>(a.length).fill(false);
  const bHit = new Array<boolean>(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = Math.max(0, i - range); j < Math.min(b.length, i + range + 1); j++) {
      if (bHit[j] || a[i] !== b[j]) continue;
      aHit[i] = bHit[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  let k = 0;
  let transpositions = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aHit[i]) continue;
    while (!bHit[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  const m = matches;
  const jaro = (m / a.length + m / b.length + (m - transpositions / 2) / m) / 3;
  let prefix = 0;
  while (prefix < 4 && a[prefix] === b[prefix]) prefix++;
  return jaro + prefix * 0.1 * (1 - jaro);
}

export function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type Cluster = { records: SourceMarket[]; confirmations: SourceMarket[] };
export type MergeLog = { kept: string; merged: string[]; meters: number; similarity: number }[];

const hasGeo = (m: SourceMarket): m is SourceMarket & { lat: number; lng: number } =>
  typeof m.lat === 'number' && typeof m.lng === 'number' && !Number.isNaN(m.lat) && !Number.isNaN(m.lng);

const similarity = (a: SourceMarket, b: SourceMarket) => {
  const na = matchName(a.name);
  const nb = matchName(b.name);
  // A name that is just the town ("South Boston") should match "South Boston Farmers Market".
  return Math.max(jaroWinkler(na, nb), na && nb && (na.includes(nb) || nb.includes(na)) ? 0.9 : 0);
};

export function dedupe(all: SourceMarket[]): {
  clusters: Cluster[];
  log: MergeLog;
  unmatchedConfirmations: number;
} {
  const primary = all.filter((m) => !m.confirmOnly && hasGeo(m));
  const confirms = all.filter((m) => m.confirmOnly && hasGeo(m));

  // Union-find over primary records.
  const parent = primary.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const members = (root: number) => primary.filter((_, i) => find(i) === root);

  type Pair = { i: number; j: number; meters: number; sim: number };
  const pairs: Pair[] = [];
  for (let i = 0; i < primary.length; i++) {
    for (let j = i + 1; j < primary.length; j++) {
      const a = primary[i];
      const b = primary[j];
      if (a.source === b.source) continue;
      if ((a.winter ?? false) !== (b.winter ?? false) && a.winter !== undefined && b.winter !== undefined)
        continue;
      const meters = metersBetween(a as never, b as never);
      if (meters > MAX_METERS) continue;
      const sim = similarity(a, b);
      if (sim >= MIN_SIMILARITY) pairs.push({ i, j, meters, sim });
    }
  }
  pairs.sort((p, q) => p.meters - q.meters || q.sim - p.sim);

  const log: MergeLog = [];
  for (const p of pairs) {
    const ri = find(p.i);
    const rj = find(p.j);
    if (ri === rj) continue;
    const si = new Set(members(ri).map((m) => m.source));
    if (members(rj).some((m) => si.has(m.source))) continue; // one record per source per market
    parent[rj] = ri;
    log.push({
      kept: `${primary[p.i].source}:${primary[p.i].sourceId} ${primary[p.i].name} (${primary[p.i].city})`,
      merged: [`${primary[p.j].source}:${primary[p.j].sourceId} ${primary[p.j].name} (${primary[p.j].city})`],
      meters: Math.round(p.meters),
      similarity: Math.round(p.sim * 100) / 100,
    });
  }

  const byRoot = new Map<number, Cluster>();
  primary.forEach((m, i) => {
    const r = find(i);
    if (!byRoot.has(r)) byRoot.set(r, { records: [], confirmations: [] });
    byRoot.get(r)!.records.push(m);
  });
  const clusters = [...byRoot.values()];

  // Attach each confirm-only record to its single best-matching market.
  let unmatchedConfirmations = 0;
  for (const c of confirms) {
    let best: { cluster: Cluster; meters: number; sim: number } | null = null;
    for (const cl of clusters) {
      for (const r of cl.records) {
        const meters = metersBetween(c as never, r as never);
        if (meters > MAX_METERS) continue;
        const sim = similarity(c, r);
        if (sim < MIN_SIMILARITY) continue;
        if (!best || meters < best.meters || (meters === best.meters && sim > best.sim))
          best = { cluster: cl, meters, sim };
      }
    }
    if (best) {
      best.cluster.confirmations.push(c);
      log.push({
        kept: `${best.cluster.records[0].source}:${best.cluster.records[0].sourceId} ${best.cluster.records[0].name} (${best.cluster.records[0].city})`,
        merged: [`${c.source}:${c.sourceId} ${c.name} (confirms SNAP)`],
        meters: Math.round(best.meters),
        similarity: Math.round(best.sim * 100) / 100,
      });
    } else unmatchedConfirmations++;
  }
  return { clusters, log, unmatchedConfirmations };
}

const yearOrDate = (s: string) => (/^\d{4}$/.test(s) ? `${s}-01-01` : s);

/** Merges a cluster: field values come from the most recently updated record, gaps filled from the rest. */
export function mergeCluster(c: Cluster): SourceMarket & { all: SourceMarket[] } {
  const sorted = [...c.records].sort((a, b) =>
    yearOrDate(b.lastUpdated).localeCompare(yearOrDate(a.lastUpdated)),
  );
  const base = { ...sorted[0] };
  for (const r of sorted.slice(1)) {
    for (const k of Object.keys(r) as (keyof SourceMarket)[]) {
      if (base[k] === undefined || base[k] === '') (base as Record<string, unknown>)[k] = r[k];
    }
  }
  const union = <T>(pick: (m: SourceMarket) => T[]) => [
    ...new Set([...c.records, ...c.confirmations].flatMap(pick)),
  ];
  base.programs = union((m) => m.programs);
  base.paymentMethods = union((m) => m.paymentMethods);
  base.products = union((m) => m.products);
  return { ...base, all: [...c.records, ...c.confirmations] };
}
