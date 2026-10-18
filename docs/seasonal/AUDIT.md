# Phase 8 baseline seasonal coverage audit

Baseline: `5631a0b7`; clean `feature/sustainability-metrics`, remote matches.
The existing In Season Search aliases `/search` and `/seasonal` share one page.
The weighted model uses A=.45, M=.30, P=.15, R=.10, redistributing missing inputs.
M currently means non-sample directory category reports within 80 km, not stock.
Popularity and agricultural relevance have no measured inputs.

## Coverage before Phase 8

| Scope | Source-backed state data | Approximate product entries | Status |
|---|---|---:|---|
| Massachusetts | Strawberries June–July; pumpkins September–October, MDAR pick-your-own guide | Northeast fallback has 49 crops | Limited state-specific harvest windows; partial months rounded |
| Northeast (NE) | No other audited state rows | 49 | Hand-compiled approximate calendar |
| Mid-Atlantic and Upper South (MA region ID) | None | 49 | Approximate; region ID MA is not Massachusetts state MA |
| Southeast (SE) | None | 47 | Approximate |
| South Central (SC region ID) | None | 48 | Approximate; region ID SC is not South Carolina state SC |
| Midwest (MW) | None | 48 | Approximate |
| Plains and Mountain West (PL) | None | 46 | Approximate |
| Desert Southwest (SW) | None | 47 | Approximate |
| California (CA region) | None independently audited | 52 | Approximate despite a single-state region |
| Pacific Northwest (NW) | None | 46 | Approximate |
| Alaska, Hawaii, US territories | None | 0 | No meaningful calendar coverage |

The legacy calendar has 55 product IDs and nine regions covering the contiguous
48 states plus DC. A missing crop/region entry is not proof of out-of-season or
lack of production. The current state guide is a constant in ranking.ts, while
broad calendars are copied from data/manual to public/data at build-time.

## Location, search and freshness

`useRegion` infers a growing region from the nearest directory market and falls
back to Northeast. There is no state picker or state-level fallback contract.
Phase 8 will isolate state inference in the seasonal feature without changing
shared location context, geocoding, account stores or routing. Unsupported or
far-away positions must not silently acquire Northeast's seasonal calendar.
Explicit state/region selections must remain clear and legacy URLs stay valid.

Search is substring-based over crop names/categories and market name/city.
Singular aliases are inconsistent. Broad category reports can surface relevant
markets but cannot prove exact product availability or current stock. Displayed
operating information may be historical; some directory source records are from
2014. Existing source-age warnings and unknown schedules must remain visible.

The app recomputes month-dependent results from its clock or selected month;
static data is page-lifetime cached. A main-owned weekly workflow refreshes
market datasets, not source-reviewed seasonal facts. Do not modify or execute
that workflow. Add a separate offline validator/report generator, no scraper,
new service, API key, database, dependency or paid API.

## Bounded implementation plan

1. Review official sources for MA, NY, CA, FL, TX, WA, MI and GA. Extract only
   verifiable numerical month facts. Preserve harvest vs storage/general
   availability, geographic scope, source date (unknown when absent), review date
   and limitations. No inferred nationwide calendar.
2. Add a versioned, validated seasonal catalog with canonical product aliases,
   source references, state/region scopes, and explicit fact types. Reject invalid
   IDs/months/metadata and conflicting same-scope records rather than overwrite.
3. Resolve each product: verified state, verified applicable region, labelled
   approximate legacy region, then unknown. Preserve the existing score weights.
4. Add a state picker and per-product evidence labels, alias-aware search and
   market filtering. No live-inventory claim. Preserve the month dropdown and
   all purchase/sustainability interfaces.
5. Generate a deterministic state coverage table plus stale-reference diagnostics,
   with manual source review/version history instructions. Run all existing
   230 unit/component and eight browser tests along with new coverage.

Protected: authentication, profiles/social/accounts, rewards/QR, purchases,
environmental evidence adapters and formulas, shared stores/routing/location
infrastructure, deployment/workflows, main. Only seasonal feature modules,
scoped validator/tests and documentation are proposed.
