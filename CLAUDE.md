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
- DB4 and maps work: [`docs/db4-business-submissions.md`](./docs/db4-business-submissions.md),
  [`docs/db4-business-submissions-design.md`](./docs/db4-business-submissions-design.md),
  and [`docs/maps-ux-plan.md`](./docs/maps-ux-plan.md).
- Deployment/migration work: [`docs/migration-repair-command-plan.md`](./docs/migration-repair-command-plan.md)
  and [`docs/dev-log-2026-08-21.md`](./docs/dev-log-2026-08-21.md).

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

## Current Project Status — 2026-08-21

Lewad is at **V1 core stabilization + DB4/maps implementation**. The React +
TypeScript + Vite application uses Supabase Auth/PostgreSQL/RPC/RLS, supports
FR/AR/EN with Arabic RTL, dark/light mode, mobile-first layouts, and ships a
minimal PWA manifest plus production-only service worker.

Implemented areas — treat all of these as **existing**, not as work to propose:

- Auth and role routing; user space `/app`; admin space `/admin`; super-admin
  space `/super-admin`; role-aware profile/settings pages.
- Partial profile update (absent optional values preserve existing data) and a
  working avatar upload to the `avatars` bucket (JPEG/PNG, 2 MB).
- Recharge request creation and admin approval; missing-service requests and
  request-to-service conversion; admin management; admin audit events.
- PWA install support.
- **DB4 business submissions** — backend and frontend.
- **Maps** — search-result map UI and add-business map picker.

DB4 and maps specifics:

- The DB4 business-submissions backend exists
  (`20260821000002_db4_business_submissions.sql` plus the map amendment
  `20260821000003_db4_maps_location_support.sql`).
- The DB4 frontend exists: `src/components/BusinessSubmissionForm.tsx`,
  `src/lib/businessSubmissions.ts`, and
  `src/components/admin/AdminBusinessSubmissions.tsx`.
- The search-result map UI exists: `src/components/maps/ServiceMapSheet.tsx`
  and `src/components/maps/mapUtils.ts`, mounted from `AppDemo.tsx`.
- The add-business map picker exists: `src/components/map/MapLocationPicker.tsx`.
- The map picker **hides latitude and longitude from normal users**. There is
  no coordinate text input anywhere in the submission form.
- Leaflet is lazy-loaded — `ServiceMapSheet` via a dynamic `import('leaflet')`,
  `MapLocationPicker` via `React.lazy`. A landing visitor never downloads map
  code.
- **No Google Maps API key and no Google Maps SDK is used.** Tiles come from
  `VITE_MAP_TILE_URL`, defaulting to public OpenStreetMap tiles.
- Directions use an **external URL only**
  (`https://www.google.com/maps/dir/?api=1&destination=…`), opened in a new tab.
  A URL is not an API integration; do not turn it into one.

Routing and PWA rules are unchanged:

- Default post-login routes are `user → /app`, `admin → /admin`, and
  `super_admin → /super-admin`. `/super-admin` is guarded by
  `RequireSuperAdmin`; client guards are UX only and RPC/RLS remain decisive.
  Profile resolution must finish before a role is chosen; an unavailable profile
  shows retry/error UI rather than defaulting to `user`.
- The PWA never caches Supabase/auth/admin/wallet/recharge/search responses, and
  never caches map tiles — the service worker returns early for every
  cross-origin request. `beforeinstallprompt` is conditional; iOS guidance is
  Share → Add to Home Screen. Never claim App Store or Play Store availability.
- Security 2A/2B are complete. SEC-002 / MED-001 (the historical duplicate
  `20260819000005` prefix) remains open. Never rename old migrations before
  checking remote history.

## DB4 product rules

- A business owner submits an establishment from `/add-business`. The route
  stays behind `RequireAuthentication`; there is no anonymous write path.
- The owner must fill owner information and business information.
- **Map selection is mandatory** for new submissions after the maps migration:
  `create_business_submission` rejects a submission without a valid
  latitude/longitude pair.
- `location` (service location) and `nearest_place` remain **optional** text
  fields.
- The amount is **fixed server-side at 500 MRO**. The browser never sends,
  overrides, or updates it, and `500` is never hardcoded in `src/`.
- A submission starts at status `pending_review`. The vocabulary is
  `pending_review` · `approved` · `rejected` · `cancelled`.
- Approval is **admin-only** (active `admin` or `super_admin`), through
  `admin_approve_business_submission`.
- Approval creates an approved, verified establishment and an `active` main
  branch in one transaction, and links `resolved_establishment_id`.
- An approved service becomes searchable through the normal DB3 search path.
- There is **no payment gateway in V1**. Payment is manual and
  admin-verified via the WhatsApp handoff; nothing in the product proves money
  arrived.

Details live in [`docs/db4-business-submissions.md`](./docs/db4-business-submissions.md)
and [`docs/db4-business-submissions-design.md`](./docs/db4-business-submissions-design.md).

## Maps product rules

**Search result:**

- Show the nearby place.
- Show "View on map" only when coordinates exist.
- Show "Directions" only when coordinates exist.
- Show the localized fallback (`locationUnavailable`) when coordinates are
  missing.
- Contact (call / WhatsApp) remains the primary action; map actions are
  secondary in visual weight.

**Add business:**

- **No visible latitude or longitude inputs.**
- Use the map picker.
- Optional current-location button, user-initiated only.
- Optional "place marker here" interaction (selects the current map centre,
  which is also the keyboard path).
- Coordinates are internal component state and are sent only through the typed
  RPC payload.

**Explicit UX rule — never negotiate this away:**

> Never ask the business owner to type latitude or longitude. They may not
> understand coordinates. The UI must say: tap the map, use current location, or
> place marker here.

The full UX contract is in [`docs/maps-ux-plan.md`](./docs/maps-ux-plan.md).

## Migration and deployment guardrails

- The unique migration history has been repaired: 15 unique versions are
  recorded as applied after their schema effects were verified.
- `20260819000005` remains a **historical duplicate exception** — two local
  files share that version. It is deliberately absent from CLI history.
- Do **not** run `npx supabase db push` blindly.
- Do **not** run `npx supabase db reset`.
- Do **not** replay, rename, or repair the duplicate migrations.
- `20260821000002_db4_business_submissions.sql` (DB4 base) is applied and its
  history record repaired.
- `20260821000003_db4_maps_location_support.sql` (DB4 maps) — **do not assume it
  is remote-applied.** Confirm with `npx supabase migration list` before relying
  on the coordinate columns, and before telling anyone the map flow is deployed.

The controlled archival / clean-baseline strategy is owner-approved planning in
[`docs/migration-repair-command-plan.md`](./docs/migration-repair-command-plan.md);
it is not authority to run migration commands.

## Security and architecture constraints

- No `service_role` key anywhere in the frontend.
- No direct `business_submissions` insert or update from React.
- No direct `establishments` or `branches` insert from React.
- All DB4 writes go through RPCs; `src/lib/businessSubmissions.ts` is the only
  frontend boundary and holds no `.from('business_submissions')` call.
- No wallet or `credit_ledger` mutation from React.
- No arbitrary credit creation.
- No map tile caching in the service worker.
- No Google Maps API key and no map SDK beyond the approved Leaflet dependency.
- No fake approval and no fake payment confirmation anywhere in the UI.

Important current migrations are `20260820000000_admin_create_establishment_rpc.sql`,
`20260820000001_recharge_requests_admin_approval.sql`,
`20260820000002_security_2a_recharge_constraints.sql`,
`20260820000003_create_recharge_request_rpc.sql`,
`20260820000004_security_2b_medium_hardening.sql`,
`20260821000001_ca1_admin_read_summaries.sql`,
`20260821000002_db4_business_submissions.sql`, and
`20260821000003_db4_maps_location_support.sql`.

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
- DB4 business submissions: the `/add-business` form, the RPC boundary, and the
  admin review/approval surface
- Maps: the search-result map sheet, the directions link, and the coordinate-free
  add-business map picker

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
- **DB4 business submissions** are current, RPC-only functionality, not a
  future feature. `create_business_submission` fixes 500 MRO server-side and
  requires a valid map point;
  `admin_list_business_submissions`,
  `admin_get_business_submission_details`,
  `admin_approve_business_submission`, and
  `admin_reject_business_submission` are active-admin only. Approval alone
  creates the establishment and main branch, links
  `resolved_establishment_id`, and writes an audit event, all in one
  transaction.
- These approvals do not permit a payment gateway, arbitrary credit amounts,
  direct React wallet/ledger writes, direct React `business_submissions` /
  `establishments` / `branches` writes, normal-user admin actions, or a
  service-role key in the frontend.

## Planning guidance for future work

- Do **not** redesign flows that are already implemented unless explicitly
  asked.
- Do **not** propose coordinate text inputs for normal users.
- Do **not** say maps require a Google Maps account for V1 — they do not.
- Do **not** propose automatic GPS permission on page load. Geolocation is
  user-initiated only.
- Do **not** propose DB4 again as if it does not exist. It has a backend, a
  frontend, an admin review surface, and tests.
- For future DB4 work, focus on: manual QA of the full flow, admin review UX
  polish (the detail modal shows no location, nearest place, coordinates, or
  map yet), VULN-3 medium hardening, CA-2 performance, and production readiness.

## Current release checks and next steps

`npx tsc --noEmit -p tsconfig.app.json`, `npm test`, and `npm run build`
currently pass; the Vite chunk-size advisory is non-blocking. Next:

1. Confirm `20260821000003_db4_maps_location_support.sql` with
   `npx supabase migration list`; apply/repair it only with owner approval.
2. Manually QA the full DB4 flow: user submits with a map point → admin
   approves → establishment is searchable → map sheet and directions work.
3. Run VULN-3 medium hardening (MED-002 … MED-005) if those items remain open.
4. Continue CA-2 performance work later, on `EXPLAIN` evidence only.
5. Review or remove tracked `Supabase.docx`, confirm env tracking, then prepare
   a clean GitHub push once QA passes.

Manual QA still covers roles/routes, search debit, requests/conversion,
establishment creation, recharges, PWA Android/iOS, FR/AR/EN RTL, themes, and
390px mobile.

## 6. Verify before reporting

```bash
npx tsc --noEmit -p tsconfig.app.json
npm test
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
