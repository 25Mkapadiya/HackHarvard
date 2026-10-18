# Account and community: setup and verification

## What is implemented locally

Routes: `#/signup`, `#/login`, `#/auth/callback`, `#/resend-confirmation`,
`#/forgot-password`, `#/reset-password`, `#/account`, `#/account/identities`, `#/feed`,
`#/community/profile/:id`, `#/community/markets`, `#/community/markets/:sourceId`.
The existing discovery app and DemoStore are preserved. Feed, account, and management
pages call Supabase; they do not substitute local demo records when cloud setup is missing.

Private `community_profiles` store display name, language, and an opaque image-folder mapping. Email/password stay
in Supabase Auth. Public `community_identities` represent customers, vendors, and markets.
The auth-to-public-identity mapping is excluded from public column grants and RPC cards.
Affiliation reads grant only `id`, `vendor_id`, `market_id`, and `status`; guests and
unrelated signed-in users see approved rows only. Relevant vendor/market managers and
administrators retain RLS access to other statuses. Internal `requested_by`, `reviewed_by`,
and review timestamps are available only through `community_affiliation_private(p_id)`
to the relevant managers or administrators; unrelated callers receive null and guests
cannot execute it. The UI explicitly selects safe columns and never calls this private RPC.
The migration removes inherited `PUBLIC` and direct `anon`/`authenticated` defaults before
granting intended table, sequence, and function permissions. Public Feed and identity RPCs
omit the private identity mapping. Public image paths use a random UUID folder stored in
the uploader's private profile plus a random filename, rather than their Auth UUID.
Storage upload/delete and changed image attachments check that private mapping. The mapping
is database-generated for both backfilled and new users; signup metadata and profile edits
cannot choose or change it. The uploader fetches only their own mapping under RLS before upload.
Storage metadata/listing is uploader-only, so SQL reads cannot expose Storage's internal
`owner_id` Auth UUID to other users. Public bucket URLs still serve image bytes without a
metadata SELECT policy. Images remain public and a shared folder can correlate uploads;
this provides Auth-ID separation, not anonymity of the image content.
New users always receive a customer identity. A vendor profile grants control of that
vendor only; organizer membership is created only through administrator approval.

## Consolidated required cloud setup (project owner)

For the current HackHarvard project (`mlgufxqhleyiulcyrzaz`), both migrations have
already been applied and verified. **Do not rerun either migration.** The activation
receipt is `docs/ACCOUNT_CLOUD_ACTIVATION.json`; it records manual execution, hashes,
14,241 verified references and unchanged security configuration. CLI migration history
was not fabricated. The numbered migration instructions below are for a fresh project.
The owner subsequently approved three disposable confirmed demo accounts and provisioning
the designated demo administrator only. The live demo passed; see
`ACCOUNT_DEMO_RECORDS.json`. No global confirmation settings, production email-template
edits or deployments were performed. The administrator bootstrap instructions below
must not be repeated for the organizer or vendor accounts.

The final demo check found one existing unconfirmed Auth account and no administrator,
organizer membership or vendor profile. Public Feed/reference reads work against the live
project. Login returns `email_not_confirmed`; this is an account-setup blocker, not a
reason to disable confirmation globally. With explicit owner approval, the Dashboard's
Authentication → Users → Add user → Create new user form can create dedicated disposable
demo accounts with **Auto confirm user** enabled. That confirms only those accounts and
sends no email. Use separate administrator, organizer and vendor-owner accounts. Grant
only the designated confirmed administrator the application role using step 3 below;
organizer and affiliation approval must still go through the application's checked RPCs.

The owner's read-only cloud preflight reported no conflicting community objects, bucket,
Storage policies or custom Auth-user triggers; required Auth/Storage dependencies and an
empty `supabase_realtime` publication are present. Broad default client privileges are
handled locally as described below. There is no CLI migration-history table. These results
were supplied by the owner, not re-executed by the application. Repeat the conflict review
if another developer changes the project's schema before activation.

1. **Review existing objects.** In SQL Editor, inspect `public` for `community_*` objects,
   and Storage policies for blanket access across all buckets. The local migrations use
   a new prefix and deliberately fail atomically on conflicting names; do not drop existing
   objects to force them through. The owner has completed this check for the current project.
2. **Apply migrations in order**, using SQL Editor or your approved migration workflow:
   - `supabase/migrations/202610180001_account_community.sql`
   - `supabase/migrations/202610180002_discovery_references.sql`
     The second file imports reference IDs/name/location from the existing 14,241 discovery
     markets; it does not create organizer ownership or change canonical discovery JSON.
     Existing auth users are backfilled by the first migration. If your project has custom
     default grants or existing Storage policies, verify they do not widen these boundaries.
     Run each complete file separately and stop on error. Both are transactional; do not
     re-run the schema migration over existing objects. Record manual application before
     adopting CLI migration tracking, so a later `db push` cannot reapply it accidentally.
3. **Provision the first trusted administrator deliberately.** Find the confirmed person's
   UUID in Authentication → Users. Run the following in privileged SQL Editor, replacing
   the placeholder with that exact UUID. Never use signup metadata or a browser key:

   ```sql
   insert into public.community_admins(user_id)
   select id from auth.users
   where id = '<CONFIRMED_ADMIN_USER_UUID>'::uuid
     and email_confirmed_at is not null;
   ```

   Confirm exactly one row was inserted. The administrator can then use
   `#/account/identities` to review requests, independently validate claim evidence,
   approve/reject claims, revoke organizer access, and review/remove reported content.
   Do not approve your own claim. Use a separate confirmed organizer account for the
   demo, or another independently trusted administrator for your own application.

4. **Authentication → URL Configuration.** For production set Site URL to
   `https://25mkapadiya.github.io/HackHarvard/`. Add these exact Redirect URLs:

   ```text
   https://25mkapadiya.github.io/HackHarvard/?flow=signup
   https://25mkapadiya.github.io/HackHarvard/?flow=recovery
   http://localhost:5173/HackHarvard/?flow=signup
   http://localhost:5173/HackHarvard/?flow=recovery
   http://localhost:4173/HackHarvard/?flow=signup
   http://localhost:4173/HackHarvard/?flow=recovery
   ```

5. **Authentication → Email Templates.** Keep email confirmation enabled. For cross-device
   links use the app's token-hash callback (no PKCE verifier tied to another browser).
   The app always supplies a RedirectTo containing `?flow=...`. Set the confirmation
   template link to:

   ```html
   <a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=signup">Confirm email</a>
   ```

   Set the reset-password template link to:

   ```html
   <a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=recovery">Reset password</a>
   ```

   Use app-initiated signup/resend/recovery requests with those templates so RedirectTo
   has the required flow query parameter. The app captures secrets before HashRouter,
   clears them from the address/history, and asks the user to explicitly verify the link.
   It also accepts default implicit callbacks and PKCE codes for compatibility; PKCE
   codes still require the initiating browser. Old links may expire; request fresh ones.

6. **Email delivery.** Enable the email provider and signup. Configure custom SMTP if
   recipients are outside Supabase's default allowed recipients; keep provider credentials
   exclusively in Supabase. Do not disable confirmation as a workaround. Check SMTP limits
   before demo signups. UI resend/recovery requests are locally throttled to one per minute.
7. **Storage and Realtime.** The migration creates the public `community-images` bucket
   with a 5 MB limit, JPEG/PNG/WebP allowlist, and private-profile-mapped opaque-folder
   upload/delete policies. Do not add unrestricted write or public metadata/list policies.
   Images are deliberately public; metadata is uploader-only. No existing cloud bucket or
   uploads need conversion according to the owner's preflight. Apply the corrected schema
   and use this matching client code together; there is no Auth-UUID-path fallback.
   Confirm Database → Replication includes `community_posts`, `community_comments`, and
   `community_public_updates` in `supabase_realtime`. The last table refreshes public badges
   after revocation without exposing private affiliation rows. Do not publish private
   profiles, reports, administrator records, memberships or audit rows.
8. **Public build configuration.** Local `.env.local` needs `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY`; keep it ignored. Set the same two **repository Actions
   variables** under GitHub Settings → Secrets and variables → Actions → Variables for a
   future production build. The workflow now reads those variables; no deployment was
   triggered. Keep `VITE_BACKEND=demo` and `/HackHarvard/` unchanged. Never provide a
   secret/service-role key to Vite. Restart/rebuild after changing configuration.

Supabase references: [email templates](https://supabase.com/docs/guides/auth/auth-email-templates),
[redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls),
[Storage policies](https://supabase.com/docs/guides/storage/security/access-control).

## Database privilege audit

Migration 1 creates 15 community tables, one audit identity sequence, and seven
security-definer functions with empty search paths. It creates no views. Migration 2 only
inserts market references and adds no grants, functions or schema objects.

| Boundary                                                      | Browser permissions after migration                                                                                                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public catalog, posts, comments, invalidation signal          | SELECT only; intended public fields                                                                                                                           |
| Public identities and affiliations                            | Explicit column SELECT only, never table-level SELECT; private Auth mappings/reviewer IDs denied even through wildcards or whole-row JSON                     |
| Profiles, memberships, claims, likes, follows, saves, reports | Authenticated SELECT with existing self/manager/admin RLS boundaries; no guest grants                                                                         |
| Audit / administrator membership                              | Audit visible only to admins through RLS; no direct browser access to admin membership                                                                        |
| All community tables / audit sequence                         | No client INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER or sequence privileges                                                                        |
| Feed, identity cards, caller-scoped permission helpers        | Explicit EXECUTE for guests and authenticated users                                                                                                           |
| Command / private affiliation RPCs                            | Authenticated EXECUTE only; command requires confirmation and action-specific ownership/admin checks; private RPC checks the relevant membership/admin status |
| New-user trigger function                                     | No browser EXECUTE                                                                                                                                            |

All revokes name only newly created community objects. No schema-wide default privileges,
unrelated existing objects or shared Storage grants are changed. Storage policies target
only `community-images`; update/upsert and move permissions are not added. Regression tests
apply broad defaults to PUBLIC, anon and authenticated, including function EXECUTE, then
verify the complete permission matrix and unchanged grants on unrelated fixture objects.
Trusted database/service roles remain privileged; never expose their credentials to Vite.

Deletion of an Auth user with audit, reviewer or reporter references can be blocked by
retained foreign keys. An eventual account-deletion/retention workflow needs separate design;
do not remove audit records or constraints ad hoc during activation.

## Verification commands

```text
npm test -- --run
npm run lint
node node_modules/typescript/bin/tsc -b
npm run build
npm run test:e2e
```

On this Windows host, browser tests can use installed Edge by setting
`PLAYWRIGHT_CHROMIUM_PATH` to the local Edge executable. Browser tests must run after
the production build. `community.spec.ts` explicitly mocks Feed reads to test layout;
it does not create cloud posts or verify live RLS. Existing browser discovery tests
still use the real static data.

`scripts/community-db.test.ts` runs the actual SQL migrations in disposable PGlite
(PostgreSQL WASM). It creates local `auth.uid()`/users and Storage-schema fixtures,
then exercises actual roles, grants, constraints, RLS and security-definer functions.
This is stronger than mocked authorization, but does not verify Supabase's production
gateway, Storage HTTP service, Realtime publication delivery, SMTP or browser JWT transport.
The test database is in memory and never connects to the shared cloud project.

## Demo acceptance after cloud setup

Use three dedicated confirmed accounts: customer/vendor owner, organizer, administrator.
Create a vendor profile, select a canonical market, request affiliation, submit organizer
evidence, approve it as the administrator, then approve the affiliation as the organizer.
Verify that the vendor owner cannot approve themselves, even if they also manage that market.
Post an offer as the vendor with the approved market association. Follow/like/comment/reply/
save/report from another account; verify private reports/saves are not readable as another
user or a guest. Revoke affiliation and confirm its badge and market-feed presence disappear.
Test new confirmation and recovery links in a different browser and at the production base
path. Do not call local/fixture tests proof of those external behaviors.

## Ownership and integration contract

- Canonical market IDs remain the static `public/data/markets.geojson` IDs. Regenerate
  only the reference migration for a future fresh install with
  `node node_modules/tsx/dist/cli.mjs scripts/community-catalog.ts`. For an already deployed
  database prepare a new additive reference migration instead of editing applied history.
- The existing market detail route receives one community link; no schedules, discovery
  filters, products, prices, market overrides, rewards or legacy vendor/manager writes change.
- Existing seed vendors are explicitly sample records (`isSample: true`), not real business
  accounts. They cannot be claimed or used to grant ownership. Real vendor community
  profiles are created separately; a future real vendor catalog can add an approved mapping.
- Community market profiles reference canonical records and show existing schedules with
  a discovery link. Proposed markets are community-only until a teammate adds canonical
  discovery data. They do not appear in Nearby until a trusted location reference is added.
- A community organizer approval does not secure or enable the old browser-local manager
  tools. Those remain demo tools. Any future SupabaseStore integration requires separate
  teammate coordination and server-side ownership enforcement.

## Deliberate MVP limits

No private messages, activity notifications, invitations, event RSVPs or automatic moderation.
Replies are one level deep and comments use the person's customer identity; posts can
use any authorized identity. Comments currently load up to 200 per post and the account
following list shows up to 100 businesses. Feed pagination is
bounded at 500 loaded posts and refreshes all loaded pages on public changes. For You is
followed businesses first, then latest, with an explanation in the UI. Nearby uses 50 km
around the existing optional location selector and defaults to downtown Boston.
Deleting a parent comment deletes its replies. Reports retain private target IDs after
content deletion. Public text uses React escaping, never raw HTML.
Uploaded files are validated in-browser and by bucket MIME/size limits; SVG is rejected.
The UI attempts cleanup after failed uploads, image replacement and post deletion. An
uploader's departed account/co-organizer edits can leave orphaned images; privileged periodic
cleanup after checking references remains an operational task. No background cleanup or
automated content review is claimed. Keep moderation staffing and email delivery monitored.
