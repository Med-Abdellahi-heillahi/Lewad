# Lewad — Codex Working System

## Mandatory start

Before every task, read this file, then [`CLAUDE.md`](./CLAUDE.md),
[`agent/README.md`](./agent/README.md), and every agent file relevant to the
area being changed. Never skip an agent rule. Survey the current code before
editing: this repository is worked on by people and multiple agents. Before
adding backend or state-changing logic, also review the relevant current
migrations and agent contracts; do not repeat a superseded restriction.

For an admin CRUD phase, also read `agent/admin-space-brief.md`, the applicable
area agent below, `security-agent.md`, `design-agent.md`,
`clean-code-agent.md`, and `clean-architecture-agent.md`.

## Non-negotiable boundaries

- Keep Lewad V1 focused. Make the smallest change that fully satisfies the task.
- Preserve React, TypeScript, Vite, Tailwind, and the existing Supabase client.
- Preserve FR, AR, EN, Arabic RTL, mobile-first layouts, and dark/light mode.
- Do not touch Supabase tables, migrations, RLS, RPCs, wallet, ledger, payment,
  credit-debit, or role logic unless the request explicitly authorises it.
- The **manual recharge workflow** (`recharge_requests` plus its user-creation
  and admin approval/rejection RPCs) is approved by the project owner;
  earlier guidance forbidding that table is superseded. A user creates one
  pending request from `/recharge` using a fixed server-authorised offer, then
  receives the WhatsApp handoff. Its invariants are not negotiable: no
  service-role key in the frontend, no wallet update or `credit_ledger` insert
  from React, no arbitrary credit amount input, approval reads the stored
  pending request's own values, and only an active `admin`/`super_admin` may
  approve or reject. A payment gateway remains out of scope. See
  [`agent/credits-agent.md`](./agent/credits-agent.md).
- Admin establishment creation is also an approved, RPC-only workflow. The
  secure `admin_create_establishment` RPC creates an approved, verified
  establishment and active main branch; it may resolve a missing-service
  request. Normal users never create establishments directly. See
  [`agent/services-agent.md`](./agent/services-agent.md) and
  [`agent/requests-agent.md`](./agent/requests-agent.md).
- Never expose, print, log, or commit a service-role key or any secret.
- Never delete files unless explicitly instructed.
- Keep components, hooks, and data access in their established layers; do not
  put Supabase calls or security decisions in UI components.
- Use clean code and clean architecture guidance. Do not silence type errors.
- Reports stay short and useful: completed work, files, checks actually run,
  and deliberate boundaries.

## Authoritative V1 status — 2026-08-21

Lewad V1 is in **late stabilization / QA preparation**. The core frontend,
operational admin and super-admin spaces, secure Supabase flows, recharge
workflow, request-to-service workflow, and minimal PWA are implemented.

### Stack and product baseline

- React, TypeScript, Vite, Supabase Auth, Supabase PostgreSQL, RPC and RLS.
- PWA manifest plus production-only service worker.
- FR / AR / EN, full Arabic RTL, dark/light mode, and mobile-first UI.

### Routes, roles, and redirect rules

| Route | Purpose |
|---|---|
| `/` | Public landing |
| `/auth` | Authentication |
| `/app` | Member search/dashboard |
| `/profile`, `/credits`, `/recharge`, `/settings` | Member account features |
| `/admin` | Operational admin space |
| `/super-admin` | Super-admin platform space |
| `/add-business` | Authenticated business submission with a local map picker |

- Default post-login destinations are `user → /app`, `admin → /admin`, and
  `super_admin → /super-admin`.
- `/admin` is operational work; `/super-admin` uses `RequireSuperAdmin` and is
  for active `super_admin` accounts only. Normal users must never enter either
  admin space.
- Frontend guards are UX only. Active-role checks in RPCs and RLS remain the
  security boundary. A missing profile is an error/retry state, never an
  implicit `user` decision.

### Implemented capability summary

- **Landing/PWA:** premium multilingual landing, install guidance, and a compact
  animated 1→2→3 install card on every landing refresh. The PWA has its
  manifest, 192/512/maskable icons, and a production-only service worker. There
  is no App Store or Play Store claim. `beforeinstallprompt` remains conditional;
  iOS uses Share → Add to Home Screen. The service worker does not cache
  Supabase, authentication, admin, wallet, recharge, or search responses.
- **Auth and DB1:** email/password auth, automatic profiles and wallets, and a
  +5 welcome-bonus ledger entry; safe profile, wallet, and ledger reads.
- **DB2/DB3:** categories, establishments, branches, Bankily demo seed,
  approved/active public search, secure search debit/logging, and unlimited
  active-admin search without wallet debit. DB3B missing requests, duplicate
  handling, secure status/note updates, and request-to-service conversion are
  connected.
- **Administration:** `/admin` provides analytics, requests, establishment
  creation, services, operational user view, and credits/recharges. Its system
  tab and role-changing UI have been removed where inappropriate; a super admin
  can move to `/super-admin`.
- **Super administration:** separate navigation and identity, platform
  overview, user/admin management through existing secure RPCs, audit
  placeholder/view where available, and security/system reminders. No direct
  frontend role or status mutation is authorised.
- **Users:** simplified lists show name, email, role, status, and actions. The
  visit modal has the available full/Arabic name, phone, email, avatar fallback,
  role, status, creation date, and last-login fallback. Actions are visit,
  allowed role change, and suspend/reactivate through secure RPCs—never delete.
- **Recharges:** fixed server-authorised offers only: 10 points/50 MRO,
  30/100, 100/500. The user creates a pending request then receives the
  WhatsApp handoff; an active admin/super-admin approves or rejects only a
  pending request. Approval alone credits the wallet atomically and ledger
  history is append-only.
- **Business submissions (DB4):**
  `20260821000002_db4_business_submissions.sql` is applied remotely and its
  history was repaired after verification. It provides the RPC-only backend
  for a 500 MRO pending-review proposal. The map-support migration,
  `20260821000003_db4_maps_location_support.sql`, remains local/unapplied
  until remote application is confirmed. Approval creates an approved,
  verified establishment and active main branch atomically; rejection records
  a reason. See [`docs/db4-business-submissions.md`](./docs/db4-business-submissions.md).

### Security, migrations, and checks

- Security 2A and 2B are complete: fixed recharge offer values, type fixes,
  bounded/throttled search/request paths, active-only unlimited admin search,
  RPC-only request updates, and compact admin audit events. Current count:
  Critical 0, High 0, Medium 1, Low 0.
- Remote schema verification is complete and the owner repaired migration
  metadata for all 15 unique versions. The two historical local
  `20260819000005` files remain an intentional, documented unmatched
  duplicate; their SQL must never be replayed or repaired under that version.
  **Do not run `supabase db push` while they remain in active
  `supabase/migrations/`.** Follow
  [`docs/migration-repair-command-plan.md`](./docs/migration-repair-command-plan.md)
  for the owner-approved controlled archival and future clean-baseline plan.
- Important migration sequence: `20260820000000_admin_create_establishment_rpc.sql`,
  `20260820000001_recharge_requests_admin_approval.sql`,
  `20260820000002_security_2a_recharge_constraints.sql`,
  `20260820000003_create_recharge_request_rpc.sql`, and
  `20260820000004_security_2b_medium_hardening.sql`.
  `20260821000002_db4_business_submissions.sql` is applied and recorded;
  `20260821000003_db4_maps_location_support.sql` is local/unapplied pending
  owner confirmation.
- `npx tsc --noEmit -p tsconfig.app.json`, `npm test`, and `npm run build`
  pass. The Vite chunk-size advisory is non-blocking.
- Repository hygiene: `.gitignore` is hardened, `.env.example` exists,
  `.env.local` is untracked, and secret scans passed. `Supabase.docx` is
  tracked and must be reviewed or removed before a public push.

## Rules for Future AI Agents

- Do not treat `recharge_requests` as forbidden: it is approved and implemented.
- Do not treat admin establishment creation as UI-only: it is RPC-connected.
- Do not redirect `super_admin` to `/admin` by default; use `/super-admin`.
- Do not add arbitrary credit inputs, mutate wallets/`credit_ledger` from
  React, or use a frontend service-role key.
- Do not create broad RLS policies or cache authenticated Supabase responses in
  the service worker.
- Do not claim App Store or Play Store availability.
- Do not replay, rename, or repair the historical `20260819000005` duplicate.
  Do not run `supabase db push` until the controlled archival strategy in
  `docs/migration-repair-command-plan.md` is completed and accepted.
- Do not commit, push, or expose secrets automatically.

## Current Project Status — 2026-08-21

See:

- [`docs/dev-log-2026-08-21.md`](./docs/dev-log-2026-08-21.md)
- [`docs/migration-repair-command-plan.md`](./docs/migration-repair-command-plan.md)
- [`docs/db4-business-submissions.md`](./docs/db4-business-submissions.md)
- [`docs/maps-ux-plan.md`](./docs/maps-ux-plan.md)

Lewad V1 has secure core flows, admin/super-admin, recharge,
request-to-service, DB4 business submissions, and maps. Future work must
preserve RPC/RLS boundaries and migration-history guardrails.

**Warnings:** Do not run `db push` blindly. Do not replay the
`20260819000005` duplicate migrations. Do not expose secrets or use
`service_role` in frontend code.

## Recommended next steps

1. Review/remove `Supabase.docx` before GitHub push and recheck tracked env files.
2. Before any future `db push`, complete the owner-approved archival of the
   duplicate active migration files in an isolated clone and adopt the clean
   baseline plan for any new environment. See
   [`docs/migration-repair-command-plan.md`](./docs/migration-repair-command-plan.md).
3. Run manual QA for user/admin/super-admin auth and routes; search debit;
   request creation/conversion; admin establishment creation; recharge creation
   and approval; Android/iOS PWA install; FR/AR/EN RTL; dark/light; and 390px.
4. Prepare the first clean GitHub commit/push only after that QA.

## Available agents

| Agent | File | Use it for |
|---|---|---|
| users-agent | [`agent/users-agent.md`](./agent/users-agent.md) | Admin planning for profiles and users |
| credits-agent | [`agent/credits-agent.md`](./agent/credits-agent.md) | Wallet, ledger, and recharge planning |
| search-agent | [`agent/search-agent.md`](./agent/search-agent.md) | Search-log and secure-search planning |
| services-agent | [`agent/services-agent.md`](./agent/services-agent.md) | Establishment and branch planning |
| categories-agent | [`agent/categories-agent.md`](./agent/categories-agent.md) | Category-management planning |
| requests-agent | [`agent/requests-agent.md`](./agent/requests-agent.md) | Missing-service and recharge-request planning |
| security-agent | [`agent/security-agent.md`](./agent/security-agent.md) | Secrets, auth, routes, RLS boundaries |
| design-agent | [`agent/design-agent.md`](./agent/design-agent.md) | Responsive UI, RTL, accessibility, themes |
| clean-code-agent | [`agent/clean-code-agent.md`](./agent/clean-code-agent.md) | Readability, types, reuse |
| clean-architecture-agent | [`agent/clean-architecture-agent.md`](./agent/clean-architecture-agent.md) | Layering and dependency direction |
| backup-recovery-agent | `agent/backup-recovery-agent.md`, if present | Backup and recovery work only |

If an agent document is missing, report it and continue only within the rules
that are available. Do not invent missing database authority.
