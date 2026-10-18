# Regional transportation illustrations — Phase 12

Model: **regional-transport/1.0.0**, reviewed 2026-10-18; visit dates in 2026.
This is a coarse conditional comparison foundation, **not a calibrated regional
sourcing model, validated road-route inventory, or individual purchase footprint**.
Actual origins, sourcing shares, vehicle/load utilization and road routes remain
unknown. Production/seasonal facts alone cannot resolve them.

## Coverage and sources

Ten paired origin cases, two foods, six destination states:

- Apples: MA and NY use a hypothetical NY regional producer; MI uses MI; WA uses
  WA. Each has two conventional alternatives from the other reviewed NY/MI/WA
  producer states. These eight cases apply only where BOTH origin calendars
  support the visit month. MI lacks July in the reviewed source; NY/WA have
  year-round availability, which includes storage rather than continuous harvest.
- Strawberries: CA regional vs FL conventional and the reverse, March–April only,
  the intersection of the documented CA and FL harvest windows.
- TX and GA have no admitted comparisons. Potatoes, tomatoes, carrots, lettuce,
  bell peppers and onions remain unavailable everywhere in this release. Lack of
  admitted evidence is not evidence that a food is not produced or sold there.

[RESEARCH.md](RESEARCH.md) links the reviewed USDA NASS fruit/vegetable summaries,
AMS refrigerated-truck publication, ERS study and Census geographic reference
release. NASS 2025 producer totals, units, publication/observation dates, table
locators and source digest are retained. Existing Phase 8 source-backed calendars
supply origin-month eligibility. EPA January 2025 factors remain in the unchanged
engine. USDA/Census numeric facts are attributed; no PDFs/images are bundled.

[COVERAGE.md](COVERAGE.md) and [COVERAGE.json](COVERAGE.json) are generated from the
validated catalog, including all eight target states/products, admitted cases,
missing-mode fields, source dates and missing actual supply-chain evidence.
Seasonal coverage never implies transportation coverage.

## Sourcing and geometry assumptions

A regional hypothesis means same-state production, except the explicitly defined
NY–MA two-state regional hypothesis. It is not a claim of a universal local-food
radius or of the recorded item's origin. The alternative conventional hypothesis
uses another reviewed producer state. Producer volumes constrain which states
were considered, but are never converted into destination probabilities, assigned
shares, weights or a preferred origin. Labels describe alternatives, not supply
predictions. No choice maximizes positive differences automatically.

Use the Census state's INTPTLAT/INTPTLONG **internal geographic point**, not a
farm coordinate or production-weighted center, as the model origin. The destination
is the selected directory market coordinate. Turf's existing spherical great-circle
calculation supplies km, converted by 1 mile = 1.609344 km. No road multiplier,
road-network claim, inferred farm location or home-to-market mileage is used.

These reference geometries can be poor proxies for actual production geography,
especially large states. They omit distribution detours, consolidation and final
routing; they are not validated freight routes and are not guaranteed lower bounds
on actual distance/emissions. Actual origins may lie anywhere. A public routing
network with reviewed producer/distribution endpoints is needed for road-route
estimates; no paid routing service is added to fill that gap.

## Calculations and sensitivity

The unchanged `quantityKg` accepts recorded kg/g/lb/oz. Count, bunch, volume and
missing quantities stay unknown; spending never supplies an assumed mass here.
The unchanged `foodMilesSummary` computes:

`sum(kg × (conventional proxy miles − regional proxy miles))`, in kg·mile.

Its average divides that sum by covered kg, yielding miles of difference per kg.
The result is a **difference**, not miles traveled by the actual purchase.
A basket missing any required item or unresolved origin choice has no whole-basket
estimate; only the supported subset and covered mass are identified separately.

Both catalog branches explicitly assume consolidated medium/heavy **truck freight
at EPA national-average mass-distance efficiency**. This is a conditional bulk
freight case, not a default assertion about farmer vans or actual modes. AMS's
produce-truck context motivates considering it, but does not prove a particular
market route. Each branch records its mode independently; a missing mode prevents
CO2e output even when geometric food-distance output exists. This release admits
no rail/ship/air/van case or unsourced payload-efficiency adjustment.

`transportSummary` supplies the signed difference from per-leg mass, distance and
existing EPA factor conversions: kg CO2 + g CH4/N2O converted with AR5 GWP 28/265,
per short ton-mile divided by 907.18474 kg. Separate chain totals use the same
unchanged difference engine against an explicitly labelled computational zero
reference; that zero is never asserted as a real supply chain. Actual geometry
and assumptions remain in the alternative details.

Applying a truck factor to a geometric straight-line proxy yields a **conditional
freight proxy**, not a road-route emissions estimate, calibrated forecast, measured
emissions, or verified CO2e avoided. Boundary: freight combustion/tank-to-wheel,
mass allocation only. Refrigeration energy, upstream fuel, production, farm
emissions, consumer trips and total life cycle are excluded. Negative and zero
results remain intact. A shorter route alone need not emit less with different
vehicles or efficiency; synthetic tests demonstrate that existing-engine behavior.

Different supported origin alternatives form discrete sensitivity cases. The UI
shows each case and their extrema, without a probability distribution, weighted
mean, confidence interval or claim that the actual result lies in that range.
No extra road, mode, load or efficiency sensitivities are invented. More defensible
vehicle/load and network evidence is required before admitting those variations.

## Purchase integration and UI

The existing purchase form and repository are unchanged. The dashboard receives
the same visits and directory markets, retaining optional geographic coordinates.
Lookup matches canonical food aliases, destination state, visit date, both origin
months, model applicability and recorded mass. Market coordinates establish only
the destination, never an origin. Missing coordinates/data return unavailable.

Exactly one applicable reviewed illustration appears automatically under
**Illustrative regional scenario** with the full caveat. Multiple alternatives
remain unresolved until a visitor chooses an illustration; this is not an actual
origin selector. Separate alternatives are never added together. Identical replayed
visit IDs count once in the adapter; changed duplicate payloads and duplicate item
IDs are rejected. Existing repository idempotency, ownership and clearing remain
unchanged. Choice state resets when the existing repository workspace remounts.

The section distinguishes product coverage, selected coverage, mass, kg-mile and
average-mile differences, regional/conventional freight proxy totals and their
signed difference. It lists scope, sources, dates, assumptions, missing evidence,
mode, quality and model version. Recorded visit/spending cards and the opt-in
historical Syracuse evidence stay independent. No new result is inserted into
actual-evidence maps or added to historical totals or life-cycle cards.

## Refresh and validation

Before extending coverage, manually audit crop form, production region, source
units/year, usable origin-season windows, model boundary/endpoints and mode/load
compatibility. A producer state's existence is not destination flow evidence.
Review precise geographic and route models before making them more specific.
Keep source observation dates separate from retrieval/review dates; never renew
an old crop fact by changing its download date. Increment the regional catalog
version for corrections/extensions and document source accessibility and reuse.

Review by 2026-12-31 and set a new explicit applicability period only after source
review. Dates outside this release's period stay unavailable. The calendar version
is pinned; seasonal updates require a corresponding regional review. Future
server persistence/authentication remains owned by the existing team; no backend,
account, identity system, external request, credential or dependency was added.

Generate coverage with `node --import tsx scripts/regional-transport-report.ts`;
check it with the same command plus `--check`. Existing npm test/lint/build/browser
commands and seasonal validator are preserved. Production/PWA build uses the
existing apostrophe-free temporary-copy workaround; deployment is unchanged.

Validation: 368 unit/component tests (322 prior plus 46), 18 browser workflows
(16 prior plus two), TypeScript, production/PWA build, seasonal catalog and regional
coverage checks passed. Lint has zero errors and the same four existing warnings.
Source-fact assertions live in `catalog.test.ts`; altered catalogs and synthetic
transactions/routes test behavior separately. Historical Syracuse/Boston cases,
manual purchases, spending/counts, seasonal search and community reporting pass.

## File inventory

- `src/features/sustainability/regional/scenarios-v1.json`, `catalog.ts`: versioned
  facts, hypotheses, source metadata and fail-closed validation.
- `food.ts`: lookup, geometric adapter, mass/food-mile engine integration and
  replay/alternative isolation.
- `freight.ts`: conditional mode mapping, signed freight comparison and chain totals.
- `sensitivity.ts`: separate origin cases and explicitly nonprobabilistic extrema.
- `RegionalComparison.tsx`: independent dashboard presentation and selection.
- `catalog.test.ts`, `estimation.test.ts`, `RegionalComparison.test.tsx` and
  `e2e/regional-transport.spec.ts`: source, service, UI and browser coverage.
- `src/features/sustainability/SustainabilityDashboard.tsx`: one section insertion
  and optional market-coordinate typing; original cards/formulas are unchanged.
- `scripts/regional-transport-report.ts`: deterministic offline report/check.
- This README, AUDIT, RESEARCH, generated COVERAGE files, and updates to PROGRESS,
  METHODOLOGY, INTEGRATION and DATA_SOURCES: methodology and handoff.

No auth/account/profile/social, rewards, purchase code/persistence, community
reporting, seasonal data/search, existing engines/adapters/catalog, shared shell,
dependencies, deployment configuration or main changes. Public preview is not
republished as part of this phase.
