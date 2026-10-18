import { readFileSync, writeFileSync } from 'node:fs';
import { regionalCatalog as c } from '../src/features/sustainability/regional/catalog';
const states = ['MA', 'NY', 'CA', 'FL', 'TX', 'WA', 'MI', 'GA'];
const products = ['apples','potatoes','tomatoes','carrots','strawberries','lettuce','bell_peppers','onions'];
const rows = states.flatMap(destination => products.map(product => {
  const scenarios = c.scenarios.filter(s => s.destinationState === destination && s.productId === product);
  return { destination, product, scenarios: scenarios.map(s=>({ id:s.id, months:s.months, regionalProduction:s.regionalProductionId,
    conventionalProduction:s.conventionalProductionId, regionalMode:s.regionalMode, conventionalMode:s.conventionalMode })),
    status: scenarios.length ? 'conditional-straight-line-proxy' : 'unavailable',
    missingTransportModes: scenarios.filter(s=>!s.regionalMode||!s.conventionalMode).map(s=>s.id),
    missingSupplyChainEvidence: ['Actual purchase origin','Road/network route','Consolidation/last-mile legs','Actual mode/load utilization','Destination-specific sourcing shares'],
  };
}));
const report = { modelVersion:c.version, reviewedAt:c.reviewedAt, applicableFrom:c.applicableFrom, applicableTo:c.applicableTo,
  scenarioCount:c.scenarios.length, products:[...new Set(c.scenarios.map(s=>s.productId))], destinations:[...new Set(c.scenarios.map(s=>s.destinationState))],
  sources:c.sources, pointSource:c.pointSource, modeSource:c.modeSource,
  limitation:'Conditional geometric and bulk-truck illustration only; no observed origin, validated road route or actual emissions.', rows };
const markdown = `# Regional transport coverage — ${c.version}\n\nGenerated from the validated catalog. Reviewed ${c.reviewedAt}.\n\n${c.scenarios.length} origin comparisons; products: ${report.products.join(', ')}; destinations: ${report.destinations.join(', ')}.\n\n${report.limitation}\n\n` +
  rows.map(r=>`- ${r.destination} / ${r.product}: ${r.status}${r.scenarios.length ? '\n' + r.scenarios.map(s=>`  - ${s.id}: months ${s.months.join(',')}; modes ${s.regionalMode??'missing'} / ${s.conventionalMode??'missing'}`).join('\n') : ' — no admitted transport comparison.'}`).join('\n')+
  '\n\nAll combinations lack actual purchase sourcing, road routing, consolidation/last-mile legs and actual mode/load evidence. Modes shown are explicit conditional assumptions. Seasonal coverage does not establish transport coverage. Source publication/observation dates and missing-mode fields are in COVERAGE.json.\n';
const files = [['docs/sustainability/regional/COVERAGE.json',JSON.stringify(report,null,2)+'\n'],['docs/sustainability/regional/COVERAGE.md',markdown]];
for (const [path,content] of files) {
  if (process.argv.includes('--check')) { if (readFileSync(path,'utf8')!==content) throw new Error(`Outdated coverage: ${path}`); }
  else writeFileSync(path,content);
}
console.log(`Validated ${c.scenarios.length} scenarios, ${report.products.length} products, ${report.destinations.length} destinations; coverage ${process.argv.includes('--check')?'matches':'generated'}.`);
