import extract from './usda-err99.extract.json';
import { createEvidenceAdapter } from './adapter';
const common = {
  sourceId: extract.source.id,
  basis: 'modeled-scenario',
  productId: 'fresh-apples',
  scope: { state: 'NY', cities: ['Syracuse'] },
  // This is a reviewed scenario-use policy, not the source's observation period.
  applicableFrom: '2010-06-21',
  applicableTo: '2026-12-31',
  distanceMethod: 'published-product-miles',
  boundary: 'farm-to-retail',
  assumptions: [
    'Historical scenario using your recorded apple mass only; not an observation of this purchase or a current regional average.',
    'Market city identifies eligibility only. Study destinations are not documented deliveries to the selected market.',
    'Source product miles are retained; commercial vehicle return miles are not substituted for product miles.',
    'No current farm origin, vendor inventory, local spending fraction or consumer travel is inferred.',
  ],
};
export const environmentalEvidence = createEvidenceAdapter({
  version: 'ers-err99-table3/1.0.0-reviewed-2026',
  products: [{ id: 'fresh-apples', aliases: ['apple', 'apples', 'fresh apples'] }],
  sources: [extract.source],
  comparisons: [
    {
      ...common,
      id: 'syracuse-direct-vs-wa',
      label: 'Historical Syracuse apples: direct market vs Washington retail chain',
      months: [4, 5, 6, 7, 8, 9, 10, 11, 12],
      local: extract.chains.directNy,
      conventional: extract.chains.mainstreamWa,
    },
    {
      ...common,
      id: 'syracuse-direct-vs-ny',
      label: 'Historical Syracuse apples: direct market vs New York retail chain',
      months: [4, 5, 6, 7, 8, 9, 10, 11, 12],
      local: extract.chains.directNy,
      conventional: extract.chains.mainstreamNy,
    },
    {
      ...common,
      id: 'syracuse-regional-retail-vs-wa',
      label: 'Historical Syracuse apples: NY vs WA retail distribution (not a farmers-market route)',
      months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      local: extract.chains.mainstreamNy,
      conventional: extract.chains.mainstreamWa,
      assumptions: [
        ...common.assumptions,
        'This separate illustration compares two mainstream retail chains; its local field means NY regional distribution, not a farmers-market supplier.',
      ],
    },
  ],
});
