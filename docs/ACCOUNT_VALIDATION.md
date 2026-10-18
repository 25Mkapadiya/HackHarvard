# Account/community validation — October 18, 2026

## Final handoff: live demo passed

The subsequent owner-authorized demo cycle completed all three core journeys against
the real Supabase project: confirmed-account login, cross-user Feed posting/likes/comments/
follows, and administrator → organizer → market-specific vendor approval. Only the
designated demo administrator has the admin role. Non-admin organizer approval,
vendor self-verification and cross-owner post edits were denied. The fictional demo
market has no canonical discovery reference; real market listings were not changed.
See `ACCOUNT_DEMO_RECORDS.json` for the retained disposable records and 19 live checks.
Passwords and private Auth IDs are excluded from the public handoff record.

These final live checks used real Auth and community RPCs, not mocked responses. Full
production email delivery/recovery, Storage image operations and Realtime delivery were
not part of the minimal live demo. The existing 324 unit/PostgreSQL tests, eight browser
tests, TypeScript, lint and build results below remain the automated validation baseline;
no unnecessary final test rerun was performed. Earlier blocked-account notes below are
historical and were resolved by the explicitly approved disposable account provisioning.

## Final demo check against the activated project

Both migrations are now applied; the live catalog contains 14,241 references. See
`ACCOUNT_CLOUD_ACTIVATION.json` for execution and permission verification. Neither
migration was rerun during this demo check.

- Re-ran all 324 tests (26 files, including the 24 local PostgreSQL permission tests),
  TypeScript, production build, lint and account/community source formatting: passed.
  Lint retains the same four existing Fast Refresh warnings. `git diff --check` passed.
- Re-ran all eight existing Edge browser tests: passed. The initial sandboxed runner
  stalled waiting for localhost; the unsandboxed run completed successfully.
- Additional **unmocked live Supabase** checks passed for public Feed RPC reads,
  the exact 14,241-reference count and the explicit safe affiliation/join query.
- An additional Edge run against the production build and actual Supabase verified
  the empty public Feed, guest account guard, and user-friendly confirmation error.
  No browser exceptions were observed and no API responses were mocked in this run.
- The saved dedicated account returned HTTP 400 `email_not_confirmed` in both the SDK
  and browser. A read-only Dashboard query confirmed one Auth user, zero confirmed
  users, zero administrators, zero organizer memberships, zero vendor profiles and
  zero posts. No other confirmed demo credentials were available locally.
- Consequently live login/session/logout, signed-in Feed interactions, image upload
  and organizer/vendor approval remain **BLOCKED**, not passed. Those behaviors pass
  only local automated tests so far. No new demo records or emails were created/sent.
- No application bug was reproduced. Application source and existing local work were
  preserved. The remaining action is explicit approval to provision three separate
  disposable confirmed demo accounts and grant only the designated account administrator
  privileges; confirmation and RLS must remain enabled globally. Then exercise the
  organizer/affiliation workflow normally and clean up identified disposable content.

The live-check notes below describe the earlier, pre-activation cycle and are retained
as historical context; they do not override the current results above.

## Final local results

| Command                                        | Result                                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm test -- --run`                            | 324 tests passed across 26 files                                                   |
| `npm run lint`                                 | Exit 0; four existing Fast Refresh warnings in unchanged files                     |
| `node node_modules/typescript/bin/tsc -b`      | Exit 0                                                                             |
| `npm run build`                                | Exit 0; TypeScript project build, Vite production bundle and PWA generation passed |
| `npm run test:e2e`                             | Eight tests passed using installed Edge                                            |
| Prettier check on changed source/configuration | Passed                                                                             |
| `git diff --check`                             | Passed                                                                             |

Twenty-four tests execute the SQL migrations and real PostgreSQL permissions in disposable
PGlite with local auth/storage fixtures. They cover profile isolation and backfill,
confirmation requirements, organizer approval, multiple market affiliations, self-verification
denial (including a vendor owner who is also an organizer), revoked access, immutable authors,
approved market tags, comments/replies, editing/deletion, follows/likes/saves, reporting,
moderation, Nearby/ranking, reference data, private auth mappings, and image-folder policies.

The affiliation privacy regression checks use both anonymous and unrelated authenticated
roles. They deny individual private columns, wildcard reads, and whole-row JSON conversion,
while preserving approved public relationships and hiding pending rows. Managers and admins
can retrieve review identifiers only through the authorized private RPC; a manager of another
market cannot. Tests also exercise inherited `PUBLIC` default grants and confirm public
Feed/identity cards omit private mapping fields. An SDK mock checks the explicit public
affiliation projection. Opaque image folders now replace Auth UUID paths in the uploader,
Storage policies, and checked image attachments. PostgreSQL tests verify public cards with
actual image paths contain no fixture Auth UUIDs. Cross-user uploads, attachments, metadata
reads and deletions are blocked; owner upload/read/delete remains available and object
updates are denied even with an UPDATE grant. Private folder mappings cannot be changed
through direct writes or forged profile metadata. A new-user trigger test verifies initialization
after migration, in addition to backfill tests. SDK mocks verify opaque path generation and
failure without a valid private folder.

The privilege matrix covers every new table, the audit sequence, and all seven functions
under broad PUBLIC/anon/authenticated table, sequence and function defaults. It verifies
RLS, denied direct writes/TRUNCATE, denied trigger-function execution, narrow public column
access, private profiles/reports/audit isolation, forbidden administrator/organizer escalation,
unauthorized vendor approval, and cross-owner content edits/deletions. Unrelated fixture
table/function grants are preserved. Migration 2 creates no new objects or privileges.

Auth/component tests mock the SDK. They cover callback capture/history cleanup, token
verification, invalid and expired links, recovery, resend cooldown, reauthentication for
password changes, account updates, post creation, interactions, reporting, unavailable
infrastructure, guest guards, safe rendering, image validation, expiry timezone conversion,
and bilingual key parity. Browser tests use actual static discovery data for existing
features and explicitly mocked Feed reads for desktop/mobile layout. No browser test
creates cloud content. The 390 px Feed screenshot was visually inspected; layout and
overflow checks also ran at 1280 px.

## Live checks and boundaries

- The owner reports a successful read-only cloud preflight: no community objects/functions,
  bucket, Storage policies or custom Auth-user triggers; Auth/Storage dependencies and empty
  Realtime publication exist. Broad default grants and standard role memberships were found;
  no CLI migration-history table exists. These owner-supplied findings were not re-executed here.
- A public-key API schema probe returned HTTP 401. It did not establish existing cloud tables.
- One login attempt with the existing dedicated test account returned HTTP 400,
  `email_not_confirmed`. No password, email address, key, token or raw response was printed.
- No new signup or confirmation/recovery email was submitted in this implementation cycle.
- No cloud migration, privileged provisioning, Storage change, email-template edit or deployment occurred.

Live database/RLS, Storage HTTP behavior, Realtime invalidation delivery, SMTP, cross-device
confirmation/recovery and production redirect behavior remain unverified. Complete
`docs/ACCOUNT_COMMUNITY_SETUP.md` before calling the integrated cloud experience demo-ready.
The local SQL tests do not prove those external services or the production JWT gateway.
After approval/application, explicitly verify a real opaque-path upload, guest public image
download, cross-user metadata/deletion denial, owner cleanup and Realtime delivery.
Public downloads bypass object RLS for a public bucket; local Storage fixtures test SQL
ownership policies, not the hosted HTTP download service. Supabase documents this boundary
in [public buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals).

## Repository state

Remote: `25Mkapadiya/HackHarvard`. Branch: `feature/account-page`.
Previous uncommitted work is preserved; new work is also uncommitted. No commit, push,
merge, rebase, PR or deployment was performed. Local environment and dedicated credential
files remain ignored and untracked. Changes to the existing market detail page are limited
to one community link; canonical discovery data and all legacy business/reward writes are unchanged.
