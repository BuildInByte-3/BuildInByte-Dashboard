# Website integration contract

Last verified: 2026-09-13

## System boundary

- Public website repository: `/Users/gopalsarma/Website`
- Production website: `https://buildinbyte.in`
- Dashboard repository: `/Users/gopalsarma/BuildInByte-Dashboard`
- Planned dashboard origin: `https://admin.buildinbyte.in`
- The applications are deployed independently and share only versioned Supabase contracts.

## Verified website stack and behavior

- Next.js 16 App Router, React 19, Tailwind CSS 4, Supabase JS 2.x.
- Customer authentication uses Supabase email/password and Google OAuth.
- Customer metadata currently uses `full_name`, `avatar_url`, `phone_number`, `occupation`, and free-form `location`.
- The customer desk reads `orders` with nested `order_items` and filters by `buyer_email`.
- The inquiry form currently supplies `name`, `email`, `company`, `scope`, `project_type`, `message`, and status `new`.
- Referenced tables: `products`, `inquiries`, `faq`, `hero_section`, `site_settings`, `company_stats`, `orders`, `order_items`, and `analytics_summary`.
- The public website contains a mock `/admin` UI. Its financial, order, and support values are not authoritative.
- The legacy `admin/admin` browser shortcut is prohibited from the dashboard and must be retired after production cutover.

## Shared conventions

- Money is stored as integer minor units with an ISO 4217 currency code.
- Reporting currency is INR; non-INR transactions retain an order-time FX snapshot.
- Reporting timezone is `Asia/Kolkata`.
- Customer geography comes from explicit profile/order fields.
- Visitor geography is anonymous, consented, stored separately, and never persists a raw IP address.
- Supabase is the authoritative inquiry store; notification delivery is secondary.

## Status values

- Payment: `pending`, `authorized`, `paid`, `partially_refunded`, `refunded`, `failed`, `cancelled`.
- Fulfilment: `new`, `confirmed`, `in_progress`, `ready`, `delivered`, `cancelled`.
- Inquiry: `new`, `contacted`, `qualified`, `won`, `lost`, `spam`.
- Ticket: `open`, `pending_customer`, `pending_team`, `resolved`, `closed`.

## Internal ingestion contracts

### `POST /api/inquiries` on the public website

Accepts `{ name, email, company?, scope?, projectType? }`. The website validates and rate-limits the request, writes the inquiry to Supabase, and only then attempts an email notification.

### `POST /api/analytics/events` on the public website

Accepts `{ eventId, anonymousId, sessionId, eventName, path, referrerDomain?, deviceClass? }`. Collection occurs only after explicit analytics consent. The server derives coarse deployment-provider geography and does not store the request IP.

## Migration log

| Version | Owner | Change | Website dependency |
| --- | --- | --- | --- |
| `202609130001_dashboard_foundation` | Dashboard | Profiles, operational data, admin security, analytics, reporting, plus temporary legacy order compatibility | Website inquiry/analytics ingestion and profile-sync support |

Update this table whenever either application changes a shared schema, RPC, status, or payload.
