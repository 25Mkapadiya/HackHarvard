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
The final verified URL and saved version are recorded after deployment below.

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
