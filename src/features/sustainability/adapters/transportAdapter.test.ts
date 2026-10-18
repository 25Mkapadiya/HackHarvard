import { describe, expect, it } from 'vitest';
import { environmentalEvidence } from './catalog';
import { buildTransportEvidence } from './transportAdapter';
import { recordProvenance } from './adapter';
import { transportSummary, freightKgCO2ePerKgMile } from '../transport';
import { itemEvidenceKey } from '../evidence';
import type { Visit } from '../../purchases/model';
const request = {
  item: { id: 'a', product: 'Apples', quantity: 2, unit: 'kg' },
  market: { id: 'm', city: 'Syracuse', state: 'NY' },
  purchaseDate: '2026-10-17',
  scenarioId: 'syracuse-regional-retail-vs-wa',
};
const visit: Visit = {
  submissionId: 'v',
  marketId: 'm',
  date: request.purchaseDate,
  submittedAt: '',
  totalCents: 100,
  items: [request.item as Visit['items'][number]],
};
describe('source-backed transportation evidence', () => {
  it('connects documented mainstream truck legs to the existing EPA engine', () => {
    const resolved = environmentalEvidence.resolve(request);
    expect(resolved.evidence.transport).toMatchObject({ boundary: 'tank-to-wheel', allocation: 'mass' });
    expect(resolved.evidence.transport?.local.map((l) => l.distance.value)).toEqual([25, 100, 100]);
    const result = transportSummary([visit], { [itemEvidenceKey('v', 'a')]: resolved.evidence });
    expect(result.value).toBeCloseTo(2 * (2850 - 225) * freightKgCO2ePerKgMile('truck'));
    expect(result.sources.some((s) => s.source.includes('EPA'))).toBe(true);
    expect(
      result.sources.some((s) => s.assumptions.join(' ').includes('not a farmers-market supplier')),
    ).toBe(true);
  });
  it('retains direct-market distances but refuses the small van truck shortcut', () => {
    const resolved = environmentalEvidence.resolve({ ...request, scenarioId: 'syracuse-direct-vs-wa' });
    expect(resolved.evidence.distances?.local.value).toBe(61);
    expect(resolved.evidence.transport).toBeUndefined();
    expect(resolved.missing.find((m) => m.field === 'transport')?.reason).toContain('small van');
  });
  it('rejects absent modes, source support, and incompatible truck classes (synthetic alterations)', () => {
    for (const patch of [
      { mode: undefined },
      { modeEvidence: undefined },
      { vehicleClass: 'unknown' as const },
      { mode: 'van' as const, vehicleClass: 'small-van' as const },
    ]) {
      const record = structuredClone(environmentalEvidence.catalog.comparisons[2]);
      Object.assign(record.local.legs![0], patch);
      expect(
        buildTransportEvidence(record, recordProvenance(record, environmentalEvidence.catalog.sources[0]))
          .transport,
      ).toBeUndefined();
    }
  });
  it('admits rail, ship and air only with documented legs (synthetic multimodal alterations)', () => {
    const record = structuredClone(environmentalEvidence.catalog.comparisons[2]);
    record.local.legs!.forEach((l, i) => {
      l.mode = (['rail', 'ship', 'air'] as const)[i];
      l.vehicleClass = 'not-applicable';
      l.modeEvidence = 'SYNTHETIC mode evidence; no real multimodal scenario is shipped';
    });
    const transport = buildTransportEvidence(
      record,
      recordProvenance(record, environmentalEvidence.catalog.sources[0]),
    ).transport;
    expect(transport?.local.map((l) => l.mode)).toEqual(['rail', 'ship', 'air']);
  });
});

it('a shorter air chain can emit more than a longer rail chain (SYNTHETIC scenario)', () => {
  const record = structuredClone(environmentalEvidence.catalog.comparisons[2]);
  record.local.distance.value = 100;
  record.local.legs = [
    {
      label: 'SYNTHETIC air leg',
      distance: { value: 100, unit: 'mile' },
      mode: 'air',
      vehicleClass: 'not-applicable',
      modeEvidence: 'SYNTHETIC fixture only',
    },
  ];
  record.conventional.distance.value = 200;
  record.conventional.legs = [
    {
      label: 'SYNTHETIC rail leg',
      distance: { value: 200, unit: 'mile' },
      mode: 'rail',
      vehicleClass: 'not-applicable',
      modeEvidence: 'SYNTHETIC fixture only',
    },
  ];
  const transport = buildTransportEvidence(
    record,
    recordProvenance(record, environmentalEvidence.catalog.sources[0]),
  ).transport;
  const result = transportSummary([visit], { [itemEvidenceKey('v', 'a')]: { transport } });
  expect(result.value).toBeLessThan(0);
});
