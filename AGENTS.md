# Dashboard repository boundary

- This repository owns the BuildInByte administrative dashboard and its Supabase migrations.
- Do not modify `/Users/gopalsarma/Website` unless the user explicitly requests a website integration change.
- Keep the Supabase service-role key and all admin credentials server-only.
- Never copy production customer data, secrets, build output, or generated files into this repository.
- Record every schema or interface change that affects the website in `docs/website-integration-contract.md`.
- Database migrations must be additive, reviewed against a staging project, and committed here before production application.
- The dashboard design is user-supplied. Do not infer or copy the marketing website design without explicit direction.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
