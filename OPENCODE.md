# Lewad — OpenCode Project Status

## Status — 2026-08-21

Lewad V1 is in late stabilization / QA preparation. The public landing,
member app, operational admin, super-admin space, secure Supabase workflows,
recharges, request-to-service conversion, DB4 business submissions, search
result maps, and minimal PWA are implemented.

## Current UI Status — 2026-08-21

Lewad V1 UI is in DB4 + Maps validation phase. The core UI is not a mock
anymore. Do not replace working flows with placeholders. Do not create fake
data. Do not redesign the whole app without explicit approval.

Implemented surfaces:

- Landing, install guidance, animated 1→2→3 install card, compact repeated
  install card, authentication, post-login redirect.
- `/app` member search with real Supabase RPC, DB3 search debit, missing-
  service requests, request-to-service conversion.
- `/add-business` authenticated business submission form with a mandatory map
  picker. No visible latitude/longitude fields. Coordinates are internal
  component state.
- Search result map actions: "Voir sur la carte" opens a Leaflet bottom sheet;
  "Itinéraire" opens Google Maps externally without an API key.
- Admin business submissions review panel (`/admin`), using DB4 RPC data
  layer. Approve/reject actions go through RPCs only.
- Admin/super-admin separated routes, profile/settings contextual to each role,
  mobile bottom navigation.
- PWA manifest, icons, production-only service worker, conditional
  `beforeinstallprompt`, iOS Share → Add to Home Screen.
- FR / AR / EN, full Arabic RTL, dark/light mode, mobile-first layouts.

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
| `/add-business` | Authenticated business submission with a map picker |

Post-login defaults are `user → /app`, `admin → /admin`, and
`super_admin → /super-admin`. `/super-admin` is super-admin only through
`RequireSuperAdmin`; normal users must not enter admin spaces. Client guards are
UX only—RLS/RPC authorisation remains the real boundary.

## DB4 UI Rules

- `/add-business` uses `BusinessSubmissionForm`. The client must not show
  latitude or longitude number inputs. The user selects location through a
  `MapLocationPicker` component. Coordinates remain internal component state
  and are sent only through the typed RPC boundary on submit.
- `location` (Address/City) and `nearestPlace` remain optional text fields.
  Map selection is mandatory for new submissions after the maps migration.
- The success state must never claim approval. It shows "pending review",
  the submission amount, and next steps (WhatsApp contact).
- Never ask the user to type latitude or longitude. Use wording:
  - FR: "Pas besoin de connaître la latitude ou la longitude. Touchez
    simplement la carte."
  - AR: "لا تحتاج إلى معرفة خطوط الطول والعرض. فقط اضغط على الخريطة."
  - EN: "You do not need to know latitude or longitude. Just tap the map."
- Keyboard users can pan with arrows and place the marker with Enter/Space via
  the "Place marker here" action. No manual-coordinate fallback is exposed.

## Search Map UI Rules

- Search results show nearby place when available. Contact actions (Call,
  WhatsApp) remain primary. Map actions (View on map, Directions) are secondary.
- "Voir sur la carte" opens `ServiceMapSheet` (Leaflet bottom sheet, lazy-
  loaded). "Itinéraire" opens an external Google Maps URL. No Google Maps
  API key, no Google Maps SDK, no route engine in V1.
- Leaflet is lazy-loaded and never shipped to landing visitors. The service
  worker must not cache map tiles (cross-origin is already excluded).
- Missing coordinates show a localized fallback: "Localisation exacte non
  disponible". Do not show a broken map placeholder.

## Admin DB4 UI Rules

- `AdminBusinessSubmissions` is inside `/admin` and handles business submission
  review. It uses the DB4 RPC data layer (`admin_list_business_submissions`,
  `admin_approve_business_submission`, `admin_reject_business_submission`).
- Approve/reject actions go through RPCs only. No direct table writes from
  React. Pending review badge uses the warning tone. Cancelled stays neutral.
- Rejection requires a non-empty reason stored by the server RPC.

## Navigation / Layout Rules

- `/admin` is the operational admin space. `/super-admin` is the platform
  super-admin space. They are separated routes with distinct navigation.
- `/admin/profile` and `/admin/settings` stay admin-context.
  `/super-admin/profile` and `/super-admin/settings` stay super-admin-context.
  Do not send admin/super_admin to mixed user `/profile` or `/settings`.
- Mobile bottom nav has Profile, Dashboard/Overview, Settings, Logout. The
  sidebar/drawer remains contextual to the current role space.

## PWA / Install UX Rules

- PWA is implemented with manifest, icons, and production-only service worker.
- Install prompt exists. Never claim Play Store or App Store availability.
- `beforeinstallprompt` is conditional and used only when available. iOS uses
  manual Share → Add to Home Screen.
- The service worker never caches Supabase, auth, admin, wallet, recharge,
  or search responses. Map tiles are cross-origin and also excluded.

## UI Guardrails for Future OpenCode Work

- Mobile-first always. No horizontal overflow at 390px.
- FR / AR / EN parity. Arabic RTL must be checked on every layout change.
- Dark/light mode must be checked on every layout change.
- No hardcoded physical left/right unless justified (use logical properties:
  `ms-`, `pe-`, `start-`, `end-`).
- Use existing design tokens. Do not introduce new colour variables.
- Do not add heavy dependencies without explicit approval.
- Do not hide OSM map attribution — it is a licensing requirement.
- Do not cache map tiles in the service worker.
- Do not show technical latitude/longitude fields to normal users.
- Do not fake approval, payment, or search results.

## Implemented workflows and boundaries

- `/admin` has analytics, requests, add-establishment, services, operational
  user view, credits/recharges, and business submissions review.
  Super admins can switch to `/super-admin`.
- `/super-admin` has separate navigation/identity, overview, user/admin
  management through existing secure RPCs, audit placeholder/view, and security
  reminders. Do not add direct frontend role/status mutation.
- `/add-business` submits a business proposal through the DB4 RPC. The map
  picker is mandatory. Coordinates are internal state. Approval creates an
  approved, verified establishment and active main branch atomically.
- Search results show View on map and Directions when branches have
  coordinates. Directions use an external Google Maps URL.
- Recharges use only fixed server-authorised offers (10/50 MRO, 30/100 MRO,
  100/500 MRO); approval/rejection is for stored pending requests only.
- Never add arbitrary credit inputs, update wallets or `credit_ledger` from
  React, use a service-role key in the frontend, or broaden RLS.

## Build, migrations, and next steps

`npx tsc --noEmit -p tsconfig.app.json`, `npm test`, and `npm run build`
pass. The Vite chunk-size advisory is non-blocking. Security 2A/2B are
complete; SEC-002 (remote migration-history reconciliation for the historical
duplicate `20260819000005` prefix) remains. Do not rename old migrations before
remote verification.

Important migrations: `20260820000000_admin_create_establishment_rpc.sql`,
`20260820000001_recharge_requests_admin_approval.sql`,
`20260820000002_security_2a_recharge_constraints.sql`,
`20260820000003_create_recharge_request_rpc.sql`,
`20260820000004_security_2b_medium_hardening.sql`,
`20260821000002_db4_business_submissions.sql` (applied remotely), and
`20260821000003_db4_maps_location_support.sql` (local/unapplied pending
owner confirmation).

Next: confirm and apply the maps migration with owner approval, complete DB4
end-to-end QA (submit → approve → search → map/directions), review/remove
`Supabase.docx` before public push, then manually QA all roles, PWA Android/iOS,
FR/AR/EN RTL, themes, and 390px mobile. Do not commit or push automatically
and never expose secrets.
