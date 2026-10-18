# Account and community implementation plan

1. Preserve the static discovery data and DemoStore. Add a separate community API and routes.
2. Finish confirmation/recovery before HashRouter mounts. Support explicit token-hash verification
   (cross-device), legacy implicit callbacks and PKCE codes; never log or retain callback secrets.
3. Separate private profiles from public identities. Memberships, organizer approval, and market-specific
   affiliation decisions are database-controlled, never editable user metadata.
4. Add one SQL migration for schema/RLS/RPCs/storage and a generated reference-only market catalog migration.
   Existing discovery IDs remain canonical. Newly proposed markets require trusted administrator approval.
5. Build account, identity management, public profiles, and a paginated feed with real Supabase operations.
6. Test SQL in disposable embedded PostgreSQL if native Supabase/Postgres is unavailable, then run the
   complete app checks and browser tests. Prepare one consolidated cloud setup checklist; do not apply it.

Ownership boundary: no changes to market schedules, prices, products, rewards or legacy vendor/manager
demo tools. Community memberships do not imply authorization in those separate demo systems.
