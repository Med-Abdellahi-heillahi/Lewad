# Lewad — OpenCode Project Status

## Status — 2026-08-20

Lewad V1 is in late stabilization / QA preparation. The public landing,
member app, operational admin, super-admin space, secure Supabase workflows,
recharges, request-to-service conversion, and minimal PWA are implemented.

## UI and platform baseline

- React, TypeScript, Vite, Supabase Auth/PostgreSQL/RPC/RLS.
- FR / AR / EN, full Arabic RTL, dark/light mode, and mobile-first layouts.
- Preserve the existing design tokens, responsive cards/tables, accessibility,
  and landing composition. Do not rewrite a working visual area for a small
  request.

## Routes and visual access model

| Route | Purpose |
|---|---|
| `/` | Public premium landing |
| `/auth` | Authentication |
| `/app` | Member search/dashboard |
| `/profile`, `/credits`, `/recharge`, `/settings` | Member pages |
| `/admin` | Operational administration |
| `/super-admin` | Super-admin platform control |
| `/add-business` | Placeholder/future submission |

Post-login defaults are `user → /app`, `admin → /admin`, and
`super_admin → /super-admin`. `/super-admin` is super-admin only through
`RequireSuperAdmin`; normal users must not enter admin spaces. Client guards are
UX only—RLS/RPC authorisation remains the real boundary.

## Landing and PWA constraints

- The landing includes install guidance and a compact bottom-card popup on
  every refresh, with animated 1→2→3 steps.
- Never claim Play Store or App Store availability.
- Use the browser install prompt only when `beforeinstallprompt` is available.
  On iOS, show Share → Add to Home Screen guidance.
- Keep the minimal PWA: manifest, 192/512/maskable icons, and a production-only
  service worker. Never cache Supabase, auth, admin, wallet, recharge, or
  search responses.

## Implemented workflows and boundaries

- `/admin` has analytics, requests, add-establishment, services, operational
  user view, and credits/recharges. Super admins can switch to `/super-admin`.
- `/super-admin` has separate navigation/identity, overview, user/admin
  management through existing secure RPCs, audit placeholder/view, and security
  reminders. Do not add direct frontend role/status mutation.
- Recharges use only fixed server-authorised offers (10/50 MRO, 30/100 MRO,
  100/500 MRO); approval/rejection is for stored pending requests only.
- Never add arbitrary credit inputs, update wallets or `credit_ledger` from
  React, use a service-role key in the frontend, or broaden RLS.

## Build, migrations, and next steps

`npx tsc --noEmit -p tsconfig.app.json` and `npm run build` pass. The Vite
chunk-size advisory is non-blocking. Security 2A/2B are complete; SEC-002
(remote migration-history reconciliation for the historical duplicate
`20260819000005` prefix) remains. Do not rename old migrations before remote
verification.

Important migrations: `20260820000000_admin_create_establishment_rpc.sql`,
`20260820000001_recharge_requests_admin_approval.sql`,
`20260820000002_security_2a_recharge_constraints.sql`,
`20260820000003_create_recharge_request_rpc.sql`, and
`20260820000004_security_2b_medium_hardening.sql`.

Next: review/remove `Supabase.docx` before public push, confirm migrations and
SEC-002, then manually QA all roles, PWA Android/iOS, FR/AR/EN RTL, themes, and
390px mobile. Do not commit or push automatically and never expose secrets.
