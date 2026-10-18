# Seasonal search and sustainability architecture

## Baseline inspected

Branch: `feature/sustainability-metrics`, baseline `69dba1d3`. React 19,
TypeScript, Vite, HashRouter, Tailwind; GitHub Pages static deployment.
`Seasonal.tsx` uses a hand-compiled regional calendar; `Search.tsx` uses
MiniSearch and sample vendors. `Rewards.tsx` uses QR check-ins, points,
and assumed baskets/distances: these are **not** inputs to this feature.
14,241 market locations are published in `public/data/markets.geojson`.
Location records do not prove product availability or current operation.
Market details and metadata retain government source attribution; some
USDA directory observations date to 2014 despite a recent fetch date.

Persistence: existing DemoStore uses localStorage. SupabaseStore throws
because no configured backend/schema exists. No authenticated purchase
persistence or usable identity interface exists. Do not store purchase
history in the shared demo store or imply account ownership.

Validation: Vitest/Testing Library, ESLint, TypeScript + Vite build,
Playwright smoke tests. Use existing package-lock without dependency changes.

## Safe implementation surface

Add isolated `src/features/seasonal/`, `src/features/purchases/`, and
`src/features/sustainability/` modules, tests and documentation. Replace only
`src/routes/Seasonal.tsx` and `src/routes/Search.tsx` with a shared page.
Both existing URLs remain valid; no routing edits needed. Purchase entry and
a standalone dashboard are reachable from that page as independent components.

Protected: authentication, signup, accounts, profiles, social features,
`src/app/App.tsx`, shared context/types/store, rewards/check-in/vendor/manager
features, workflows, deployment configuration, main. Do not alter old rewards
calculations; document that they are unrelated legacy demo estimates.

## Proposed contracts

- Seasonal ranking: explicit normalized inputs with configurable weights;
  absent signals removed and remaining weights renormalized. No fabricated
  popularity, agricultural relevance, or inventory. Use only non-sample
  reported product categories for availability; disclose category-level evidence.
- Search: selected region constrains market states, optional nearby radius
  uses the existing location context. Show operating information as reported,
  unknown schedules as unknown, and market source age warnings.
- Purchases: validated visit with item quantities/units, optional item cents,
  trip total cents, market ID and date. Integer cents avoid currency drift.
  One visit per submitted trip; idempotent submission keys prevent double-clicks.
- PurchaseRepository: asynchronous list/submit/clear contract. Default is
  explicitly ephemeral, tab-memory demo data. Optional device-local storage
  requires explicit opt-in, is shared-device data, and is never account storage.
  Auth adapter must derive user identity from the team's session and use RLS;
  no hardcoded user ID, authentication implementation, or public purchase table.
- Impact engine: pure functions, provenance-bearing evidence, units, method
  version, coverage and missing reasons. Missing facts yield unavailable/partial
  metrics, never assumed zero impact. Differences retain their signs.
- Dashboard consumes repository visits plus separate trusted evidence, never
  infers origins from market location. No rewards, points or new profile.

## Data and refresh

Verify regional extension/MDAR calendar sources before adding verified calendar
rows. Retain existing broad calendar only as an explicitly approximate guide;
unsupported regions must not be labelled verified. Monthly selection recomputes
from the app clock. Use existing weekly build-time government-data refresh;
show source freshness, never promise new observations when a source is old.
Page reload fetches published static data; no new hosted service or browser API key.
Popularity stays unavailable until measured, consented aggregate activity exists.

Verify EPA mode-specific factors including gas units, GWP, and short ton
conversion. Investigate USDA AMS/ERS prices and Poore/Nemecek LCA boundaries;
no matching regional price or compatible local/conventional LCA pair means
unavailable. Generic global averages do not establish a local advantage.
Farm-specific practices require sourced measurements, not a certification multiplier.

## Integration blockers

Account persistence requires the authentication owner's session adapter,
backend schema, authorization policies, and server-side idempotency. Image/receipt
processing is deferred: no service exists. Verified origin/supply routes, local
attribution, conventional counterfactual, regional prices and paired LCA data
are not present. Provide engine seams and honest unavailable UI meanwhile.
Deployment remains the team's existing main-branch process; push feature commits
only, without merging main or modifying shared navigation.
