import { describe, expect, it } from 'vitest';
import { dollarsToCents, validateVisit, type NewVisitInput } from './model';
import { MemoryPurchaseRepository } from './repository';
export const visitFixture = (): NewVisitInput => ({
  submissionId: 'one',
  marketId: 'market',
  date: '2026-10-17',
  totalCents: 1250,
  items: [
    { id: 'a', product: 'Apples', quantity: 2, unit: 'lb', spendingCents: 500 },
    { id: 'b', product: 'Bread', quantity: 1, unit: 'loaf' },
  ],
});
const now = () => new Date('2026-10-18T12:00:00Z');
describe('purchase validation and recording', () => {
  it('records one multi-item trip, and never exposes mutable internal records', async () => {
    const repo = new MemoryPurchaseRepository(now);
    const input = visitFixture();
    await repo.submit(input);
    input.items[0].product = 'changed';
    const listed = await repo.list();
    expect(listed).toHaveLength(1);
    expect(listed[0].items).toHaveLength(2);
    listed[0].items[0].product = 'also changed';
    expect((await repo.list())[0].items[0].product).toBe('Apples');
    await repo.clear();
    expect(await repo.list()).toEqual([]);
  });
  it('prevents concurrent clicks, repeated identical trips, and key reuse', async () => {
    const repo = new MemoryPurchaseRepository(now);
    const input = visitFixture();
    const results = await Promise.all([repo.submit(input), repo.submit(input)]);
    expect(results.map((r) => r.status)).toEqual(['submitted', 'duplicate']);
    expect(
      (await repo.submit({ ...input, submissionId: 'two', items: [...input.items].reverse() })).status,
    ).toBe('duplicate');
    await expect(repo.submit({ ...input, totalCents: 2000 })).rejects.toThrow('key');
  });
  it.each([
    { date: '2026-02-30' },
    { date: '2026-10-19' },
    { items: [] },
    { totalCents: -1 },
    { totalCents: 1.5 },
    { totalCents: 100 },
    { items: [{ id: 'a', product: '', quantity: 1, unit: 'kg' }] },
    { items: [{ id: 'a', product: 'Apples', quantity: 0, unit: 'kg' }] },
    { items: [{ id: 'a', product: 'Apples', quantity: Infinity, unit: 'kg' }] },
  ])('rejects invalid input %j', (patch) => {
    expect(() => validateVisit({ ...visitFixture(), ...patch }, now())).toThrow();
  });
  it('parses exact integer cents and rejects ambiguous amounts', () => {
    expect(dollarsToCents('0.29')).toBe(29);
    expect(dollarsToCents('12.5')).toBe(1250);
    for (const bad of ['-1', '1.001', '1e3', '', 'NaN', '9007199254740991'])
      expect(() => dollarsToCents(bad)).toThrow();
  });
});
