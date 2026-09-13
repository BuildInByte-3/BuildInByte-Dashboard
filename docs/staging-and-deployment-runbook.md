# Staging and deployment runbook

The foundation migration must not be applied directly to production. The website repository does not contain the authoritative production schema, so the first connected step is a real schema pull.

## 1. Create and link staging

1. Create a separate Supabase project with no production customer data.
2. Link the Supabase CLI to that project from this repository.
3. Store staging values in `.env.local`; never commit them.
4. Pull the production schema into a reviewed baseline using a read-only production database credential.
5. Compare that baseline with `202609130001_dashboard_foundation.sql`. Resolve every table/column conflict before applying it to staging.

## 2. Validate staging

- Apply migrations to staging and generate fresh TypeScript database types.
- Backfill Auth profiles, then reconcile legacy order money fields explicitly. Do not invent historical FX rates.
- Test anonymous, customer, analyst, support, finance, administrator, and owner access separately.
- Verify the reporting RPC totals against direct SQL for the same half-open time interval.
- Verify duplicate analytics `event_id` values are idempotent and that no raw IP field exists.
- Run `select public.prune_dashboard_operational_data();` daily through the platform scheduler.

## 3. Deploy

1. Create an independent Vercel project rooted at this repository.
2. Configure only server-side Supabase and dashboard encryption/pepper values.
3. Attach `admin.buildinbyte.in`, force HTTPS, and confirm secure cookies.
4. Bootstrap the first owner with `npm run admin:create` and store recovery codes offline.
5. Run browser and authorization tests on the deployed staging build.
6. Promote reviewed migrations to production, verify totals, then deploy the dashboard.
7. Remove or redirect the website mock admin only after production verification.

## Rollback

Application deployment rollback is independent from schema rollback. Migrations are additive; do not drop shared website columns during an incident. Disable dashboard traffic, revoke affected admin sessions, and deploy the prior application build while retaining audit records.
