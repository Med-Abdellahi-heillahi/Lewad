# CLAUDE.md — Lewad Working Rules

**Read this file first, then read the `agent/` folder, before touching any code.**

## 1. Read the agent folder before working

Mandatory reading:

- [`agent/README.md`](./agent/README.md) — product direction, stack, what is off-limits
- [`agent/design-agent.md`](./agent/design-agent.md) — UI, responsive, tokens, RTL, a11y
- [`agent/security-agent.md`](./agent/security-agent.md) — keys, route protection, RLS boundaries
- [`agent/clean-code-agent.md`](./agent/clean-code-agent.md) — readability, reuse, TypeScript quality
- [`agent/clean-architecture-agent.md`](./agent/clean-architecture-agent.md) — layers, folders, backend seams

Task-specific briefs (read when the task matches):

- [`agent/admin-space-brief.md`](./agent/admin-space-brief.md) — admin & super-admin space structure
- Admin CRUD planning: [`users-agent.md`](./agent/users-agent.md),
  [`credits-agent.md`](./agent/credits-agent.md),
  [`search-agent.md`](./agent/search-agent.md),
  [`services-agent.md`](./agent/services-agent.md),
  [`categories-agent.md`](./agent/categories-agent.md), and
  [`requests-agent.md`](./agent/requests-agent.md). These are planning and
  safety contracts, not authority to implement privileged writes.

Pick the agent guidance that matches the task **before** modifying anything. If a
request conflicts with an agent's forbidden list, stop and ask rather than guess.

**Do not work randomly.** Survey the existing code first — this repository is
edited by several agents and by hand, so assume the code has moved since you last
saw it. Before adding server-authorised or state-changing logic, read the
matching current migrations and agent contracts; stale instructions do not
override an approved workflow recorded there.

## 2. What Lewad is

A local search web app for Mauritania. The V1 loop:

`Search → Find → Contact / Go` · `Chercher → Trouver → Contacter / Aller` · `ابحث → اعثر → تواصل / اذهب`

## Current V1 status — 2026-08-20

Lewad V1 is in late stabilization / QA preparation. The React + TypeScript +
Vite application uses Supabase Auth/PostgreSQL/RPC/RLS, supports FR/AR/EN with
Arabic RTL, dark/light mode, mobile-first layouts, and ships a minimal PWA
manifest plus production-only service worker.

- Landing, install guidance, compact repeated install card, authentication,
  DB1/DB2/DB3 search, missing-service requests, request-to-service conversion,
  admin establishment creation, recharges, `/admin`, and `/super-admin` are
  implemented.
- Default post-login routes are `user → /app`, `admin → /admin`, and
  `super_admin → /super-admin`. `/super-admin` is guarded by
  `RequireSuperAdmin`; client guards are UX only and RPC/RLS remain decisive.
  Profile resolution must finish before a role is chosen; an unavailable profile
  shows retry/error UI rather than defaulting to `user`.
- The PWA never caches Supabase/auth/admin/wallet/recharge/search responses.
  `beforeinstallprompt` is conditional; iOS guidance is Share → Add to Home
  Screen. Never claim App Store or Play Store availability.
- Security 2A/2B are complete. SEC-002 (remote migration-history
  reconciliation for the historical duplicate `20260819000005` prefix) remains
  open. Never rename old migrations before checking remote history.

Important current migrations are `20260820000000_admin_create_establishment_rpc.sql`,
`20260820000001_recharge_requests_admin_approval.sql`,
`20260820000002_security_2a_recharge_constraints.sql`,
`20260820000003_create_recharge_request_rpc.sql`, and
`20260820000004_security_2b_medium_hardening.sql`.

## 3. Preserve the stack

React · TypeScript (strict) · Vite · Tailwind CSS v4 · Supabase

Do not change the framework, the bundler, or the styling system.

## 4. Preserve these behaviours

- FR / AR / EN, with Arabic in full RTL
- Dark and light mode
- Mobile-first UX
- Protected routes and their redirect rules
- Supabase Auth
- DB integration (profiles, wallets, credit ledger, establishments)
- Secure DB3 search and missing-service requests
- Admin dashboard, including the approved establishment-creation RPC
- Approved manual recharge requests and their admin-only approval/rejection

The i18n key contract is enforced by `Dictionary = typeof fr`: values may change
and keys may be added, but **never rename or remove a key**, and always add to
all three dictionaries at once.

## 5. Never do these without an explicit request

- Delete files or remove working code
- Expose secrets, or put a service-role key anywhere in `src/`
- Create Supabase tables, RLS policies, or SQL migrations
- Implement payments
- Mutate a wallet balance from the frontend
- Insert into the credit ledger from the frontend
- Change authentication behaviour
- Rewrite parts of the app the task did not ask about
- Commit or push automatically

Money and permissions are decided server-side. The client displays; it does not
decide.

## Approved server workflows

- `recharge_requests` is current backend functionality, not a UI-only or
  future feature. `/recharge` creates a pending request using a fixed
  server-authorised offer, then opens WhatsApp. Only an active admin or
  super-admin may approve or reject it through the reviewed RPC; that RPC alone
  may credit a wallet and append the ledger entry.
- `admin_create_establishment` is current, RPC-only admin functionality. It
  creates an `approved`, verified establishment and an `active` main branch;
  when sourced from a missing-service request, it marks the request `added` and
  links `resolved_establishment_id`.
- These approvals do not permit a payment gateway, arbitrary credit amounts,
  direct React wallet/ledger writes, normal-user admin actions, or a
  service-role key in the frontend.

## Current release checks and next steps

`npx tsc --noEmit -p tsconfig.app.json` and `npm run build` currently pass; the
Vite chunk-size advisory is non-blocking. Before the first public push, review
or remove tracked `Supabase.docx`, confirm env tracking, apply/confirm the
migrations, resolve SEC-002, then manually QA roles/routes, search debit,
requests/conversion, establishment creation, recharges, PWA Android/iOS,
FR/AR/EN RTL, themes, and 390px mobile.

## 6. Verify before reporting

```bash
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

Check the result in a browser when the change is visual: 390px and 1280px, light
and dark, FR and AR (RTL). Report what you actually checked — not what you assume
works.

## 7. Keep reports short

1. **Completed** — what changed
2. **Modified files** — list only
3. **Checks** — only those actually performed
4. **Not done** — what was deliberately left out, and the boundaries respected
5. **Risks / decisions needed** — anything the user must validate

No long audits. State failures plainly; do not claim a check you did not run.
