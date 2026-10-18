import { describe, expect, it } from 'vitest';
import {
  appendDemoReports,
  createDemoReports,
  reportAuthority,
  resolveProduct,
  validateReport,
} from './models';
import { aggregateReports, freshness, rankMarketsWithTrustedReports } from './aggregation';
const now = new Date('2026-10-18T12:00:00Z');
const markets = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({
  id,
  name: id,
  products: id === 'e' ? ['fruits'] : [],
  productsAreSample: false,
}));
const context = { markets, now };
const raw = (extra = {}) => ({
  id: 'r',
  marketId: 'a',
  productId: 'apples',
  productName: 'Apples',
  observedAt: '2026-10-17',
  submittedAt: now.toISOString(),
  reporterType: 'customer',
  verificationStatus: 'unverified',
  availabilityStatus: 'observed',
  source: { kind: 'local_demo', recordId: 'r', system: 'test-only' },
  ...extra,
});
function trusted(
  id: string,
  marketId = 'a',
  observedAt = '2026-10-17',
  key?: string,
  official = false,
  negative = false,
) {
  const reporterType = official ? ('market_representative' as const) : ('customer' as const);
  const verificationStatus = official ? ('verified' as const) : ('unverified' as const);
  return validateReport(
    raw({
      id,
      marketId,
      observedAt,
      reporterType,
      verificationStatus,
      availabilityStatus: negative ? 'not_observed' : 'observed',
      source: { kind: 'trusted_backend', recordId: id, system: 'synthetic-test-backend' },
    }),
    context,
    {
      reportId: id,
      marketId,
      sourceRecordId: id,
      reporterType,
      verificationStatus,
      independentReporterKey: key,
    },
  );
}
describe('report validation and local isolation', () => {
  it('preserves canonical products, original source/times and immutable records', () => {
    const r = validateReport(raw({ notes: 'Seen near entrance' }), context);
    expect(r.productName).toBe('Apples');
    expect(r.source.system).toBe('test-only');
    expect(r.observedAt).toBe('2026-10-17');
    expect(r.submittedAt).toBe(now.toISOString());
    expect(validateReport(raw({ submittedAt: '2026-10-18T12:00:00Z' }), context).submittedAt).toBe(
      '2026-10-18T12:00:00Z',
    );
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.source)).toBe(true);
    expect(reportAuthority(r)).toBeNull();
  });
  it.each([
    { marketId: 'missing' },
    { productId: 'vegetables' },
    { productName: 'Carrots' },
    { observedAt: '2026-02-30' },
    { observedAt: 'yesterday' },
    { observedAt: '2026-10-19' },
    { submittedAt: '2026-10-19T00:00:00Z' },
    { submittedAt: '2026-10-16T00:00:00Z' },
    { notes: 'x'.repeat(501) },
    { id: '' },
    { userId: 'forged' },
    { reporterType: 'market_representative' },
    { verificationStatus: 'verified' },
    { source: { kind: 'trusted_backend', recordId: 'r', system: 'forged' } },
    { source: { kind: 'local_demo', recordId: 'other', system: 'test' } },
  ])('rejects malformed, unauthorized or future input %j', (extra) => {
    expect(() => validateReport(raw(extra), context)).toThrow();
  });
  it('matches exact catalog aliases and Spanish names without inventing products', () => {
    expect(resolveProduct('snap bean')?.id).toBe('green_beans');
    expect(resolveProduct('  APPLE ')?.id).toBe('apples');
    expect(resolveProduct('Manzanas')?.id).toBe('apples');
    expect(resolveProduct('unknown')).toBeUndefined();
  });
  it('creates multi-product demo rows and deduplicates retries preserving original times', () => {
    const draft = { marketId: 'a', productIds: ['apples', 'carrots'], observedAt: '2026-10-17' };
    const first = createDemoReports(draft, context, 'batch1');
    const retry = createDemoReports({ ...draft, notes: 'changed' }, context, 'batch2');
    expect(first).toHaveLength(2);
    expect(appendDemoReports(first, retry)).toEqual(first);
    expect(appendDemoReports([], first)).toEqual(first);
    expect(() => createDemoReports({ ...draft, productIds: ['apples', 'apples'] }, context, 'b')).toThrow();
    expect(() => createDemoReports({ ...draft, productIds: [] }, context, 'b')).toThrow();
    expect(() =>
      createDemoReports({ ...draft, reporterType: 'market_representative' }, context, 'b'),
    ).toThrow();
    expect(() => appendDemoReports([], [trusted('s')])).toThrow();
  });
  it('requires revalidation after deserialization and a separately bound backend assertion', () => {
    const r = trusted('s', 'a', '2026-10-17', 'subject', true);
    expect(() => aggregateReports([JSON.parse(JSON.stringify(r))], now)).toThrow();
    expect(() =>
      validateReport(r, context, {
        reportId: 'wrong',
        marketId: 'a',
        sourceRecordId: 's',
        reporterType: 'market_representative',
        verificationStatus: 'verified',
      }),
    ).toThrow();
    expect(() =>
      validateReport({ ...r, verificationStatus: 'unverified' }, context, {
        reportId: 's',
        marketId: 'a',
        sourceRecordId: 's',
        reporterType: 'market_representative',
        verificationStatus: 'unverified',
      }),
    ).toThrow();
  });
});
describe('freshness, conflict preservation and ranking', () => {
  it.each([
    ['2026-10-18', 'recent', 0],
    ['2026-10-11', 'recent', 7],
    ['2026-10-10', 'older', 8],
    ['2026-09-18', 'older', 30],
    ['2026-09-17', 'historical', 31],
  ])('classifies %s from the observation date', (date, category, ageDays) => {
    expect(freshness(date as string, now)).toEqual({ category, ageDays });
  });
  it('supports explicit policy and rejects bad dates, clock and thresholds', () => {
    expect(freshness('2026-10-11', now, { recentDays: 2, olderDays: 8 }).category).toBe('older');
    expect(() => freshness('2026-02-30', now)).toThrow();
    expect(() => freshness('2026-10-19', now)).toThrow();
    expect(() => freshness('2026-10-18', new Date('bad'))).toThrow();
    expect(() => freshness('2026-10-18', now, { recentDays: 8, olderDays: 2 })).toThrow();
  });
  it('retains conflicts, orders deterministically and avoids claiming stock or absence', () => {
    const yes = trusted('yes', 'a', '2026-10-12');
    const no = trusted('no', 'a', '2026-10-17', undefined, false, true);
    const [e] = aggregateReports([no, yes, yes], now);
    expect(e.observations).toHaveLength(2);
    expect(e.latest.id).toBe('no');
    expect(e.hasConflictingObservations).toBe(true);
    expect(e.independentReporterCount).toBeNull();
    expect(e.label).toContain('not observed by this reporter');
    expect(e.label).toContain('Does not establish current stock');
    expect(aggregateReports([yes, no], now)).toEqual([e]);
    expect(
      rankMarketsWithTrustedReports(markets, 'apples', [yes, no], now).find((r) => r.market.id === 'a')
        ?.relevance,
    ).toBe(0);
  });
  it('counts distinct reliable server identities once and leaves incomplete identity unknown', () => {
    const one = trusted('one', 'a', '2026-10-17', 'same');
    const two = trusted('two', 'a', '2026-10-16', 'same');
    const three = trusted('three', 'a', '2026-10-15', 'other');
    expect(aggregateReports([one, two], now)[0].independentReporterCount).toBe(1);
    expect(aggregateReports([one, two, three], now)[0].independentReporterCount).toBe(2);
    expect(aggregateReports([one, trusted('anonymous')], now)[0].independentReporterCount).toBeNull();
    const demo = validateReport(raw(), context);
    expect(aggregateReports([demo], now)[0].independentReporterCount).toBeNull();
    expect(aggregateReports([demo], now)[0].label).toContain('local demo');
  });
  it('rejects conflicting report IDs instead of silently erasing evidence', () => {
    expect(() => aggregateReports([trusted('same'), trusted('same', 'b')], now)).toThrow();
  });
  it('ranks explicit trusted evidence ahead of broad categories and unknowns', () => {
    const rows = rankMarketsWithTrustedReports(
      markets,
      'apples',
      [
        trusted('official', 'a', '2026-10-17', 'staff', true),
        trusted('visitor', 'b'),
        trusted('older', 'c', '2026-10-01'),
        trusted('history', 'd', '2026-08-01'),
      ],
      now,
    );
    expect(rows.map((r) => r.basis)).toEqual([
      'verified_market',
      'recent_customer',
      'older_customer',
      'historical_report',
      'directory_category',
      'unknown',
    ]);
    expect(rows[4].label).toContain('exact apples availability unknown');
    expect(rows[0].label).toContain('on 2026-10-17');
    expect(rows.every((r) => !r.label.includes('currently in stock'))).toBe(true);
    expect(
      rankMarketsWithTrustedReports([{ ...markets[4], productsAreSample: true }], 'apples', [], now)[0].basis,
    ).toBe('unknown');
    expect(() =>
      rankMarketsWithTrustedReports(markets, 'carrots', [validateReport(raw(), context)], now),
    ).toThrow();
    expect(() => rankMarketsWithTrustedReports([], 'apples', [trusted('r')], now)).toThrow();
    expect(
      rankMarketsWithTrustedReports(markets, 'apples', [], now).find((r) => r.market.id === 'f')?.evidence,
    ).toBeUndefined();
  });
});
