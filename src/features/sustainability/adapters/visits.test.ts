import { describe, expect, it } from 'vitest';
import { resolveVisitEvidence } from './visits';
import { impactSummary } from '../summary';
import type { Visit } from '../../purchases/model';
/** Synthetic transaction; environmental route facts come from the attributed public extract. */
const visit: Visit = {
  submissionId: 'v',
  marketId: 'm',
  date: '2026-10-17',
  submittedAt: '',
  totalCents: 1500,
  items: [
    { id: 'a', product: 'Apples', quantity: 2, unit: 'kg' },
    { id: 'b', product: 'Carrots', quantity: 1, unit: 'kg' },
  ],
};
describe('purchase-to-evidence integration', () => {
  it('preserves count/spending and partial coverage for unsupported basket items', () => {
    const result = resolveVisitEvidence(
      [visit],
      [{ id: 'm', city: 'Syracuse', state: 'NY' }],
      'syracuse-direct-vs-wa',
    );
    const summary = impactSummary([visit], result.impact);
    expect(summary).toMatchObject({ visits: 1, uniqueMarkets: 1, marketSpendingCents: 1500 });
    expect(summary.foodMiles.weightedDifference).toMatchObject({
      value: null,
      knownSubtotal: 5578,
      covered: 1,
      expected: 2,
    });
    expect(result.items[1].resolution.missing[0].field).toBe('product');
    expect(summary.localSpending.value).toBeNull();
    expect(summary.lifecycle.value).toBeNull();
  });
  it('does not guess a missing market, production origin, or alternative supply chain', () => {
    const missingMarket = resolveVisitEvidence([visit], [], 'syracuse-direct-vs-wa');
    expect(missingMarket.items.every((i) => i.resolution.basis === 'unknown')).toBe(true);
    expect(impactSummary([visit], missingMarket.impact).foodMiles.weightedDifference.value).toBeNull();
    const noScenario = resolveVisitEvidence([visit], [{ id: 'm', city: 'Syracuse', state: 'NY' }]);
    expect(noScenario.items.every((i) => i.resolution.basis === 'unknown')).toBe(true);
  });
});
