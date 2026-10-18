/** Offline validation only: never fetches or scrapes a source. */
import { readFile, writeFile } from 'node:fs/promises';
import { seasonalCatalog as catalog } from '../src/features/seasonal/catalog/catalog';
import { STATE_ABBR } from '../src/features/seasonal/catalog/states';
import { CropCalendar } from '../src/types';
const legacy = CropCalendar.parse(JSON.parse(await readFile('data/manual/crop-calendar.json', 'utf8')));
for (const crop of legacy.crops) {
  if (!catalog.products.some((p) => p.id === crop.id))
    throw new Error(`Unregistered legacy product ${crop.id}`);
  for (const region of Object.keys(crop.months)) {
    if (!(region in legacy.regions)) throw new Error(`Unknown approximate region ${region}`);
    if (new Set(crop.months[region]).size !== crop.months[region].length)
      throw new Error('Duplicate approximate month');
  }
}
const days = (newer: string, older: string) => (Date.parse(newer) - Date.parse(older)) / 86400000;
const warnings = catalog.sources.flatMap((s) => [
  ...(!s.published ? [`${s.id}: publication date unstated; review date does not date observations.`] : []),
  ...(s.published && days(catalog.reviewed, s.published) > 365 * 5
    ? [`${s.id}: reference is over five years old; re-check applicability.`]
    : []),
  ...(days(catalog.reviewed, s.lastReviewed) > 365 ? [`${s.id}: review is over one year old.`] : []),
]);
const rows = Object.entries(STATE_ABBR).map(([state, code]) => {
  const records = catalog.records.filter((r) => r.scope.kind === 'state' && r.scope.id === code);
  const products = [...new Set(records.map((r) => r.product))];
  const region = Object.entries(legacy.regions).find(([, r]) => r.states.includes(code))?.[0];
  return {
    state,
    code,
    sourceBackedProducts: products.length,
    kinds: [...new Set(records.flatMap((r) => r.windows.map((w) => w.kind)))].sort(),
    approximateRegion: region ?? null,
    products,
  };
});
const sourceBackedProducts = new Set(catalog.records.map((r) => r.product)).size;
const report = {
  version: catalog.version,
  reviewed: catalog.reviewed,
  registeredProducts: catalog.products.length,
  sourceBackedProducts,
  records: catalog.records.length,
  sources: catalog.sources.length,
  verifiedBroaderRegions: [
    ...new Set(catalog.records.filter((r) => r.scope.kind === 'region').map((r) => r.scope.id)),
  ],
  states: rows,
  warnings,
};
const md = [
  '# Seasonal coverage (generated)',
  '',
  `Dataset ${catalog.version}; review cutoff ${catalog.reviewed}. ${catalog.products.length} registered foods; ${sourceBackedProducts} with source-backed records; ${catalog.records.length} records; ${catalog.sources.length} sources.`,
  '',
  'Source-backed means reviewed against a cited calendar, not measured current inventory or guaranteed harvest dates. Counts describe foods, not complete state coverage. General availability is not harvest.',
  '',
  '| State | Source-backed foods | Evidence kinds | Approximate fallback region |',
  '| --- | ---: | --- | --- |',
  ...rows.map(
    (r) =>
      `| ${r.state} (${r.code}) | ${r.sourceBackedProducts} | ${r.kinds.join(', ') || 'None'} | ${r.approximateRegion ?? 'None — unknown'} |`,
  ),
  '',
  '## Approximate regions',
  '',
  ...Object.entries(legacy.regions).map(
    ([id, r]) =>
      `- ${id}: ${r.name}; ${r.states.join(', ')}. ${legacy.crops.filter((c) => c.months[id]).length} food calendars.`,
  ),
  '',
  'No verified broader regional records are included in this version. The resolver supports them only with explicit applicable states and source scope. Alaska, Hawaii and territories have no approximate calendar; never substitute Northeast. Overlapping legacy region assignments use the first listed region for state fallback; an explicit growing-region choice remains available.',
  '',
  '## Reference age flags',
  '',
  ...warnings.map((w) => `- ${w}`),
  '',
  'Source age flags are review prompts, not automatic deletion or evidence of current conditions. Unknown publication dates remain unknown. This report is deterministic at the dataset review cutoff; also review source lastReviewed dates against today during maintenance.',
  '',
].join('\n');
for (const [file, content] of [
  ['docs/seasonal/COVERAGE.json', JSON.stringify(report, null, 2) + '\n'],
  ['docs/seasonal/COVERAGE.md', md],
]) {
  if (process.argv.includes('--check')) {
    if ((await readFile(file, 'utf8')) !== content) throw new Error(`Stale generated report: ${file}`);
  } else await writeFile(file, content);
}
console.log(
  `Validated ${report.records} records, ${report.sources} sources, ${report.registeredProducts} foods; reports ${process.argv.includes('--check') ? 'match' : 'written'}.`,
);
