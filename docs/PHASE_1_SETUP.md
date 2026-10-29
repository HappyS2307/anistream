# AniStream Phase 1 Setup

This phase adds the server-side Supabase and Google OAuth foundation. It does not configure a Supabase project, provide credentials, populate production content, or make Google sign-in operational by itself. Existing public pages continue to use local sample data when provider configuration is absent.

## Environment

Copy `.env.example` to `.env.local` and replace placeholders using your own Supabase project values:

| Variable | Purpose | Public? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key; database access must still be constrained by RLS | Yes |
| `NEXT_PUBLIC_SITE_URL` | Canonical app origin used for callback construction | Yes |

Do not put a service-role/secret key in `.env.example`, a `NEXT_PUBLIC_*` variable, source control, or browser code. This phase does not need a service-role key. Keep actual local values in ignored `.env.local` and production values in the deployment provider's secret store.

Use `http://localhost:3000` for local `NEXT_PUBLIC_SITE_URL`. In HTTPS deployments use the exact site origin. The application rejects non-HTTPS project/site URLs except loopback HTTP for local development.

## Supabase Project and Google OAuth

1. Create a Supabase project only after approving its region, free-tier constraints, data residency, and recovery expectations. No live project was created or contacted by this change.
2. In Google Cloud Console, create an OAuth 2.0 Web application client. Add the app origins (for local development, `http://localhost:3000`; add production only after the domain is approved) to Authorized JavaScript origins.
3. Use Supabase's displayed Google provider callback as the Google Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`. If using a custom Supabase Auth domain, use the exact callback shown by that project instead. Do not use the app callback as Google's provider callback.
4. In Supabase Dashboard, enable Google under Authentication providers and enter the Google client ID and client secret there. Do not add the client secret to this repository.
5. In Supabase Authentication URL configuration, add the app callback to the redirect allowlist: `http://localhost:3000/auth/callback` locally and `https://<approved-site-origin>/auth/callback` for production. Use exact origins/paths; avoid broad wildcard redirects.
6. Configure the three local environment variables, restart the Next.js server, then test sign-in with an approved Google account. The application exchanges the one-time authorization code server-side, validates the user with Supabase Auth, creates the user's own `profiles` row through RLS, and permits only a validated same-site `next` path.

Google sign-in is **not operational until** real project settings, provider credentials, redirect allowlists, and an end-to-end test are completed. Callback failures use a generic application error; provider details and secrets are not logged.

## Migration

The initial migration is `supabase/migrations/20261027000100_initial_foundation.sql`. It creates `profiles`, `content`, `seasons`, and `episodes`. The second migration, `supabase/migrations/20261028000100_admin_bulk_links.sql`, adds admin memberships, link providers/sources, import history, validation triggers, and RLS policies. Neither migration inserts sample catalogue data or credentials.

The Supabase CLI and a local Supabase/PostgreSQL service are not part of this repository setup. Once approved, install the Supabase CLI using its official current instructions, initialize/link the intended project without replacing this existing migration, and inspect the generated CLI configuration before use. Prefer local validation first:

```sh
supabase start
supabase db reset
```

Review the schema, grants, triggers, and RLS tests before linking any hosted project. Applying the migration to a hosted project is a separate, explicitly approved operation; never run `supabase db push` against production as part of this setup. No database was connected to or migrated during Phase 1 implementation.

## Local Development

```sh
npm install
cp .env.example .env.local
npm run dev
```

Without real provider values, existing public routes remain available and the login form reports that authentication is not configured. Do not paste credentials into Git or issue logs.

## Checks and Tests

```sh
npm run test
npm run lint
npm run build
```

The Node built-in tests cover local redirect validation, migration policy structure, server-only boundaries, no shared cache directive in the private auth DAL, and preservation of existing sample routes. They are **static checks**, not PostgreSQL policy execution. Supabase CLI, `psql`, local Supabase, and OAuth credentials are not included here; actual migration application, RLS behavior, OAuth exchange, cookie refresh, and account creation require an approved isolated local Supabase setup and Google provider configuration.


## Admin and Super Admin Bootstrap

The admin/link-import schema is added by the second migration:
`supabase/migrations/20261028000100_admin_bulk_links.sql`. Apply and review both migrations in an isolated local Supabase project first. Do not assume that the migrations have been applied to a hosted project.

There is intentionally no public signup route that grants admin privileges. The first Super Admin must be provisioned manually by the project owner using the Supabase SQL Editor, after Google sign-in is configured and the owner has signed in at least once.

1. Sign in to the app with the Google account that should own the admin workspace.
2. In Supabase Dashboard → Authentication → Users, locate that exact account and copy its UUID. Verify the email/account carefully; do not use a UUID supplied by a browser form.
3. In the SQL Editor for the intended project, run the following one-time statement after both migrations have succeeded. Replace the placeholder with the verified UUID. Keep the UUID quoted.

```sql
insert into public.admin_memberships (user_id, role, permissions, created_by)
values (
  'REPLACE-WITH-VERIFIED-AUTH-USER-UUID'::uuid,
  'super_admin',
  '{}'::jsonb,
  'REPLACE-WITH-VERIFIED-AUTH-USER-UUID'::uuid
);
```

4. Confirm exactly one row exists for that UUID with role `super_admin`, then sign out and back in and visit `/admin`.
5. Keep the SQL Editor and project owner account restricted. Never put a service-role key in the app, source control, chat, or browser. Do not add another Super Admin by changing application-side permissions; the partial unique index intentionally permits only one Super Admin.

This manual bootstrap requires trusted Supabase project-owner access; it is not callable by anonymous visitors or ordinary admins. The migration protects against deleting/demoting the final Super Admin, but a hosted project's actual RLS behavior must still be verified before production use.

## Admin Link Import Scaling Note

The current link-import context loader queries all content, seasons, and episodes to populate its selection UI. This is acceptable only for a small test catalogue and should be replaced with server-side searchable/paginated selectors before importing a large catalogue. Do not treat a successful static build as proof that hosted database permissions, migration application, or large-catalogue performance have been verified.

## Security Notes and Remaining Setup

- `src/proxy.ts` refreshes the Supabase session when configured; it does not authorize protected operations. Every future private data access must validate the user server-side and scope the query to that user, with RLS as a second boundary.
- The publishable key is intentionally public. Its safety depends on correct RLS and grants. Never place a service-role/secret key in browser code.
- Authenticated header output runs behind `Suspense`. Private auth data is not shared-cached; preserve this boundary when adding profile or user-specific pages.
- The OAuth callback only accepts safe local redirect paths. Add exact approved app callback URLs to Supabase's redirect allowlist.
- No Super Admin, admin permissions, Saved items, progress, streaming sources, playback protections, or real catalogue content are created in this phase.
- Third-party playback and iframe security are out of scope; browser restrictions cannot hide a URL already delivered to the browser.