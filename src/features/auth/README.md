# Authentication foundation

`AuthProvider` is mounted in the application. Signup/login are extended by confirmation,
resend, recovery and account settings. See [the complete setup checklist](../../../docs/ACCOUNT_COMMUNITY_SETUP.md).
Existing features continue to use `VITE_BACKEND=demo` and the existing stores.

## Local configuration

Copy `.env.example` to the ignored `.env.local`, then set:

- `VITE_SUPABASE_URL`: your Supabase project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: the project's public `sb_publishable_...` key.

The filename must be exactly `.env.local`, not `.env.local.txt`.
Paste the full project root URL exactly once. Do not add an extra `https://` or
`.supabase.co`, and do not use the dashboard URL or an `/auth/v1` endpoint.
Restart Vite after changing configuration. These Vite variables are public build inputs.
Never supply a database password, secret key, or service-role key. No schema, email
redirect, or deployment changes are needed for this foundation.

## Auth state

One `AuthProvider` is mounted in `src/app/App.tsx`; public routes remain accessible to guests.
Components can import `useAuth` from `./authContext` to read `user`, `session`,
`loading`, `status`, and `error`. Using the hook outside the provider throws a clear error.

- `loading`: initial session restoration is pending.
- `ready`: restoration completed; a null user/session means a guest.
- `error`: restoration failed; a later auth event can restore a ready state.
- `unavailable`: public configuration is missing/invalid or client initialization failed.

`getSupabaseClient()` in `src/lib/supabaseClient.ts` lazily caches a single client
or typed unavailable result. Importing the module alone does not initialize auth.
The SDK persists and refreshes browser sessions. The provider owns one subscription
per mounted instance and cleans it up on unmount, including React StrictMode remounts.
Late session reads cannot replace a newer auth event.

Registration sends credentials and public display-name/language metadata; the migration
initializes the customer's private settings and public identity. No metadata grants roles.
A returned user without a session shows email confirmation instructions.
Successful login navigates home. Authenticated users can log out of this browser on
`#/login`; other devices' sessions remain active.

SDK URL session detection is deliberately disabled: the explicit callback module captures
and removes URL credentials before HashRouter mounts, and verifies them only on user action.
Session state is for UI; future database authorization must be enforced with RLS.
This foundation does not grant vendor/manager permissions or associate demo data with users.

## Verification

Run `npm test -- --run`, `npm run lint`, and `npm run build`.
Run `npm run test:e2e` after building for account-route, mobile Spanish layout, and
existing public-feature browser smoke tests. These do not submit real credentials.
The unit tests for client, provider, and forms mock SDK behavior and do not contact Supabase.
Real session persistence, refresh, project configuration, and browser behavior still
need verification against a live project using dedicated test accounts.
Enable email/password and signup in Supabase; preserve the project's confirmation
setting. A dedicated, already confirmed test account can exercise login/logout now.
Live cross-device email confirmation still requires the documented template/redirect setup
and verification; unit callback tests do not prove email delivery or live links.
