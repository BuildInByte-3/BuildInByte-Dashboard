# BuildInByte Dashboard

Private administrative dashboard for BuildInByte. It is a separate application and repository from the public website while using the same Supabase business-data project.

## Local setup

For a local interface preview with synthetic data:

1. Run `npm install`.
2. Run `npm run preview:setup`.
3. Run `npm run dev` and open `http://localhost:8102`.

The setup command creates a Git-ignored `.env.local` with temporary local credentials. It will not overwrite an existing file unless you explicitly run `npm run preview:setup -- --force`. Preview mode is read-only and is disabled on Vercel production.

For staging or production data:

1. Copy `.env.example` to `.env.local` and supply server-only values.
2. Apply `supabase/migrations` to a staging Supabase project.
3. Run `npm run admin:create` to bootstrap the first owner and enroll TOTP MFA.
4. Run `npm run dev` and open `http://localhost:8102`.

The application intentionally shows a configuration screen when Supabase credentials are absent; it never falls back to demo or mock business data.

Production onboarding and schema-pull requirements are documented in `docs/staging-and-deployment-runbook.md`. The foundation migration is intentionally not auto-applied from local development.

## Security model

- Admin credentials are separate from customer Supabase Auth identities.
- All Supabase administrative access occurs on the server with a service-role client.
- Browser access is mediated by authenticated routes with role checks, secure sessions, rate limiting, origin validation, and audit logging.
- Production secrets belong in the deployment platform, never in Git.
