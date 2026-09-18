# Supabase project foundation

Project ref: `wqrowfdwjmoaajuogusu`

The remote project is already provisioned. Database changes must be tracked as migrations.

## Rules

- Never commit `service_role` or `sb_secret_*` keys.
- Browser/server SSR clients use the publishable key.
- Keep public API tables protected by RLS.
- Keep internal-only objects in the `private` schema.
- Create a migration before making the next database schema change.
- Verify migrations and run Supabase security advisors before a phase is considered complete.

The current database intentionally has no business tables yet. The next database phase will introduce the domain schema and RLS policies.
