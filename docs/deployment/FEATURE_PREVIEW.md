# Separate feature preview

Source: 25Mkapadiya/HackHarvard, feature/sustainability-metrics only.
The original GitHub Pages workflow and main branch are unchanged.

Host: the already connected ChatGPT Sites static hosting capability, included
with eligible ChatGPT plans during public beta, subject to plan limits. No new
hosting account, paid tier, domain purchase, backend or credential is introduced.
[Official pricing](https://learn.chatgpt.com/docs/pricing).

Site project ID: appgprj_6ad4619ae79881919a9288b9f923b2eb.
Site slug: hackharvard-seasonal-feature-preview.
Audience: public, explicitly requested for this development preview.
The verified URL and saved version are recorded below.

## Build isolation

- `npm run build:preview` sets VITE_BASE=/, VITE_BACKEND=demo and
  VITE_DEVELOPMENT_PREVIEW=true. It passes only basic process paths/locale to
  build tools, excluding inherited application credentials/public env overrides.
- Vite disables .env loading and the PWA/service worker for preview builds.
  Only the explicit preview flag changes this behavior. Regular `npm run build`
  retains the previous Pages base and PWA settings. The Pages workflow is untouched.
- A build-only banner says Development preview, identifies the feature branch,
  and explains temporary tab-memory purchase records. Hash routing is unchanged.
- Preview artifacts contain compiled public assets and the existing public
  market/seasonal data only. No .env files, Git history, source credentials,
  screenshots, browser profiles, account data or private purchase records are
  uploaded. Runtime purchases remain in a visitor's tab and vanish on reload.
- There are no API/backend keys in this preview. No external authenticated store,
  analytics, private connector or hosted database is enabled.

## Publish and update

Build from a clean feature-branch commit. For this apostrophe-containing checkout,
use the existing clean temporary validation copy; mirror deletions and exclude
.git, node_modules, dist and .env files before running the preview build there.
Run the existing flows with `--config=playwright.preview.config.ts`. The optional
PUBLIC_PREVIEW_URL selects a remote deployment; otherwise a local root-hosted
server runs on port 4174. Existing Pages browser configuration is unchanged.

The Sites artifact checkout is separate from the GitHub source repository. Its
`.openai/hosting.json` contains the exact project ID and `static.directory: dist`.
Copy only the verified preview dist into that checkout. Use the Sites skill's
source helper to synchronize and package that static artifact, save its exact
pushed source SHA and archive, then deploy the saved version. Do not point the
helper at the HackHarvard GitHub checkout or change its Git remote/branch.

This is a manually published feature snapshot, not an automatic main deployment.
Further feature pushes require rebuilding/testing and explicitly publishing the
new static snapshot. The platform has a separate managed artifact repository;
it never pushes to this GitHub repository's main or touches GitHub Pages.
Credentials for that helper exist only in memory and hidden stdin, never in
tracked files, shell arguments, logs or the public artifact. Preserve the exact
site ID; do not create another Site on updates.

## Verification

Anonymous public access must work before reporting success. Check the banner,
root asset/data requests, both hash search routes, manual purchase entry/review,
visit count/spending, missing-evidence states and historical-scenario opt-in.
The full existing 14 browser workflows run against the public preview URL.
Regular Pages build/browser verification separately checks the unchanged subpath.

## Published snapshot — verified 2026-10-18

Public URL: https://hackharvard-seasonal-feature-preview.airyriver10.chatgpt.site/

- GitHub application source: `5b2c967ead8d086054c24919312c471df6c36083`.
- Sites artifact source: `c591a23478845af46e0bf3bb0a2fad47f6d433cb`.
- Saved version: 1, `appgprj_6ad4619ae79881919a9288b9f923b2eb~appgver_cebe274887508191b9401981bd8d2f06`.
- Deployment: `appgdep_6ad463229fa48191a21f8e5fa51296b9`, succeeded.
- Anonymous HTTP returned 200. Public `/preview-source.json` matched the
  feature commit and the demo/root-path/development flags.
- All 14 existing browser workflows passed against the public URL, including
  nationwide seasonal search, manual purchase entry/review, spending totals,
  sustainability evidence and scenario states, and clearing purchases on reload.
- A fresh anonymous browser verified the visible development banner, hash URL,
  17 successful root asset/data requests, and zero service-worker registrations.
- Local root preview: 14 browser checks passed. Existing Pages subpath build
  and its 14 browser checks also passed. Unit/component checks: 291 passed;
  TypeScript passed; lint retained four existing warnings and no errors.

Public routing briefly returned the host's 404 page after the deployment reported
success, then became accessible. First-load search took about 11 seconds in one
measurement; public browser assertions allow 20 seconds while local waits retain
their previous five seconds. No application behavior was changed for that wait.
Subsequent verification/documentation commits do not change the published app
snapshot above. This URL is a development preview with temporary tab-memory data.
