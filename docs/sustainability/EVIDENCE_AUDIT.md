# Phase 7 evidence audit and implementation plan

Starting point: `56c4ab0e`, clean `feature/sustainability-metrics`; fetched remote
matches. No formula changes, protected files, dependency additions or hosted
services are planned. Existing engine interfaces remain the calculation boundary.

## Required inputs and current gaps

- Local spending: optional item price in USD cents plus a sourced `fraction` in
  [0,1] keyed by visit/item. Neither market coordinates nor state crop production
  proves an item's origin or the portion of its price attributable locally.
  No verified purchase-level attribution dataset exists in the repository.
- Mass: recorded kg/g/lb/oz works now. Otherwise a sourced positive `USD/kg`
  price must match product string, region and purchase validity dates. Count and
  volume units have no universal mass. No matched regional price series exists.
- Food miles: mass plus sourced conventional/local supply distances in `mile`.
  Existing records identify destinations, not farm origins or counterfactuals.
- Freight: mass plus all local/conventional legs with documented truck/rail/ship/
  air modes, miles, mass allocation and tank-to-wheel boundary. EPA factors
  already exist. A mode name alone does not justify applying a heavy-truck
  freight average to a small delivery van. No compatible purchase routes exist.
- Life cycle: product-matched local/conventional agriculture+land-use, well-to-
  wheel freight and other supply-chain components, each in `kg CO2e/kg-product`;
  cradle-to-retail, as-purchased kg, mass allocation, AR5 100-year GWP. No paired
  stage-resolved dataset with these boundaries exists. Aggregate footprints
  cannot fill a production or freight component.

## Source research and bounded plan

1. Audit USDA ERS ERR-99 (2010) case-study tables for documented local and
   mainstream supply chains, source years, transport classes and endpoint scope.
   Candidate: historical Syracuse apples. Other products/regions require their
   own reviewed evidence; do not extrapolate this case nationally.
2. Evaluate USDA AMS regional reports/ERS prices/NASS regional statistics,
   EPA inventories, peer-reviewed LCA and extension/state sources for relevance,
   units, dates, coverage, redistribution and download/update access. Production
   statistics do not establish a market vendor's origin; annual national retail
   prices are not current regional market prices.
3. Add a pure, independently testable adapter and small versioned factual extract.
   Require product, market location and date; accept optional documented origin.
   Return existing engine inputs plus source metadata, applicability, actual vs
   modeled status and explicit missing reasons. Reject incompatible unit/date/
   geography/boundary records. Never fetch private data or need credentials.
4. Only enable a historical scenario after an explicit user choice. State its
   vintage and research endpoints; do not imply an observation of the recorded
   purchase. Keep actual estimates unavailable unless actual evidence supports
   both chains. Use published supply distances rather than fabricated farm
   coordinates or a nearest-farm calculation.
5. Connect freight only where the documented vehicle classes fit existing EPA
   factors. Unknown/van modes stay unavailable; no arbitrary truck default.
   Preserve current LCA requirements and document any unmatched-pair blocker.
6. Wire evidence into the standalone dashboard with per-item scope, vintage,
   status and missing fields. Keep scenarios separate from recorded values and
   observed comparisons. Preserve purchase counts/spending and tab-memory status.
7. Add synthetic rejection/edge tests and a small source-attributed integration
   fixture. Run unit/component/browser tests, TypeScript, lint and production
   build using the established apostrophe-free temporary copy as necessary.

## Scientific limits and handoff

Historical case comparisons are educational scenarios, not contemporary average
routes or proof of reductions for a particular market purchase. Geography and
season must match explicit applicability; time transfer must be labelled as a
scenario, not current evidence. No automatic origin inference, local-spending
fraction, farm practice benefit, or confidence interval is justified. Unsupported
metrics remain unavailable. Authenticated persistence remains another owner's
integration task and is outside Phase 7.
