# BuildInByte Dashboard

Private administrative dashboard for BuildInByte. It is a separate application and repository from the public website while using the same Supabase business-data project.

## Local setup

1. Copy `.env.example` to `.env.local` and supply server-only values.
2. Apply `supabase/migrations` to a staging Supabase project.
3. Run `npm run admin:create` to bootstrap the first owner and enroll TOTP MFA.
4. Run `npm run dev` and open `http://localhost:8100`.

The application intentionally shows a configuration screen when Supabase credentials are absent; it never falls back to demo or mock business data.

Production onboarding and schema-pull requirements are documented in `docs/staging-and-deployment-runbook.md`. The foundation migration is intentionally not auto-applied from local development.

## Security model

- Admin credentials are separate from customer Supabase Auth identities.
- All Supabase administrative access occurs on the server with a service-role client.
- Browser access is mediated by authenticated routes with role checks, secure sessions, rate limiting, origin validation, and audit logging.
- Production secrets belong in the deployment platform, never in Git.
