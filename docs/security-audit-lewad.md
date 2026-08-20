# Lewad Security Audit

## Executive Summary

- **Overall status:** solid least-privilege foundations, but not ready for a production financial workflow.
- **Production readiness:** **not ready** until the recharge authority issue, migration-version collision, and the high/medium findings below are resolved and verified against the deployed Supabase project.
- **Scope and limitation:** static review of the current frontend and migration source on 20 August 2026. The remote Supabase project, Auth dashboard settings, live RLS state, and migration history were not accessible from this workspace, so deployment state is not asserted.
- **Highest risks:** user-controlled recharge amounts can be approved as credits; two migrations share the same version; privileged actions lack an audit trail; search/request RPCs have no meaningful abuse controls.
- **Finding count:** 0 Critical, 1 High, 6 Medium, 1 Low.

## Critical Findings

No Critical finding was identified in the reviewed source. In particular, no service-role key, database password, JWT secret, or direct browser wallet/ledger mutation was found.

## High Findings

### SEC-001 — Recharge credits are derived from user-controlled request values

- **Severity:** High
- **Area:** Recharge requests and wallet credits
- **Evidence:** `recharge_requests` lets any authenticated user insert a self-owned pending row with any positive `requested_points`, any non-negative `amount_mro`, and an arbitrary `offer_label`. `admin_approve_recharge_request` then credits `requested_points` from that row atomically. There is no server-side offer catalogue, maximum, payment reference, proof, or validation that points correspond to the declared amount.
- **Risk:** An attacker can create a request for an arbitrary number of points and a zero or misleading amount. The endpoint still requires an active admin to approve it, but it makes a mistaken approval a direct, permanent financial loss.
- **Recommended fix:** Do not deploy the recharge migration as-is. Create requests through a narrowly scoped RPC that derives points and price from server-owned offer data (or stores a verified payment reference); enforce bounds; require an independent payment-verification state before approval; retain the existing row lock and atomic wallet/ledger update.
- **Files/migrations:** `supabase/migrations/20260820000001_recharge_requests_admin_approval.sql:47-70,72-160`

## Medium Findings

### SEC-002 — Duplicate Supabase migration version makes security deployment ambiguous

- **Severity:** Medium
- **Area:** Migration integrity
- **Evidence:** `20260819000005_phase_admin_v1_policies.sql` and `20260819000005_profile_phone_unique_and_avatar_storage.sql` both use version `20260819000005`.
- **Risk:** Supabase migration history requires unique versions. One migration can be skipped or the migration workflow can fail, leaving profile phone normalization, avatar policies, or admin RLS policy deployment inconsistent with source.
- **Recommended fix:** Assign a unique, later migration version before applying anywhere new. Reconcile the existing remote migration history before renaming or applying it in a shared environment.
- **Files/migrations:** `supabase/migrations/20260819000005_phase_admin_v1_policies.sql`, `supabase/migrations/20260819000005_profile_phone_unique_and_avatar_storage.sql`

### SEC-003 — Search has no maximum length, result cap, wildcard escaping, or rate limit

- **Severity:** Medium
- **Area:** DB3A search RPC
- **Evidence:** `search_services_with_credit` only requires two characters, concatenates input inside three `ILIKE '%…%'` predicates, and aggregates every matched establishment and branch into one JSON response. `%` and `_` are not escaped; there is no `LIMIT`, query-length ceiling, or throttling.
- **Risk:** Authenticated callers can submit wildcard or very large queries and cause increasingly expensive scans/aggregations. Admin and suspended-admin accounts are especially exposed because their searches do not debit points (see SEC-005).
- **Recommended fix:** Add a sensible maximum normalized-query length, escape wildcard metacharacters or use a dedicated search strategy, cap results/branches returned, and add server- or edge-level rate limiting.
- **Files/migrations:** `supabase/migrations/20260819000006_db3a_admin_unlimited_search.sql:38,49-54,137-139,191`

### SEC-004 — Suspended or deleted administrators retain unlimited-search treatment

- **Severity:** Medium
- **Area:** DB3A authorization
- **Evidence:** The unlimited flag is set from `profiles.role in ('admin', 'super_admin')` without checking `profiles.status = 'active'`. Other privileged functions use `is_admin()`, which does require an active profile.
- **Risk:** A suspended or deleted former administrator can continue making cost-free searches through the authenticated RPC, despite being denied the admin interface and admin RLS scope.
- **Recommended fix:** Derive unlimited status from an active-role predicate, preferably by reusing an explicit database helper whose semantics are tested.
- **Files/migrations:** `supabase/migrations/20260819000006_db3a_admin_unlimited_search.sql:49-54`

### SEC-005 — Missing-service requests have no rate/size control and are not tied to a matching not-found search

- **Severity:** Medium
- **Area:** DB3B request RPC
- **Evidence:** The RPC enforces a two-character minimum and one pending request per user/query, but no maximum query/message size, time-based rate limit, or verification that an optional `search_log_id` is a matching `not_found` search for that query.
- **Risk:** An authenticated caller can create a large volume of distinct, potentially oversized or unrelated requests, increasing moderation cost and degrading data quality.
- **Recommended fix:** Limit query/message lengths, require a recent same-query `not_found` log (or explicitly document an independent request flow), and enforce a server-side per-user rate limit.
- **Files/migrations:** `supabase/migrations/20260819000004_fix_db3b_missing_service_request_rpc.sql:10-90`

### SEC-006 — Missing-service review still has a direct PostgREST write path

- **Severity:** Medium
- **Area:** Admin request workflow
- **Evidence:** The Admin V1 migration grants authenticated users column-level `UPDATE` on `status`, `admin_note`, and `resolved_establishment_id`; the RLS policy limits it to active admins. A later migration adds `admin_update_missing_service_request` as an RPC-only flow but does not revoke the earlier table `UPDATE` grant or policy.
- **Risk:** This is not a normal-user bypass, but privileged request state can be changed outside the RPC’s locking and validation path, undermining a single auditable workflow.
- **Recommended fix:** Choose one reviewed write path. If RPC-only is intended, remove the direct table update grant/policy in a separately reviewed migration and add audit logging.
- **Files/migrations:** `supabase/migrations/20260819000005_phase_admin_v1_policies.sql:78-87`, `supabase/migrations/20260820000000_admin_create_establishment_rpc.sql:158-217`

### SEC-007 — Privileged actions have no durable audit trail

- **Severity:** Medium
- **Area:** Admin and financial accountability
- **Evidence:** User status/role changes, service creation, request review, and recharge approval/rejection validate authorization but do not write actor/action audit records. The user-role migration itself notes this gap.
- **Risk:** Incident investigation, fraudulent approval review, and separation-of-duties controls are weak even where the database correctly prevents an unprivileged mutation.
- **Recommended fix:** Define an append-only audit log with actor, target, before/after action data, timestamp, and correlation/reference IDs; populate it inside each privileged transaction.
- **Files/migrations:** `supabase/migrations/20260819000007_users_crud_v1_admin_rpcs.sql:132-141`, `supabase/migrations/20260820000000_admin_create_establishment_rpc.sql`, `supabase/migrations/20260820000001_recharge_requests_admin_approval.sql`

## Low Findings

### SEC-008 — Typecheck and production build are currently blocked

- **Severity:** Low
- **Area:** Verification gate
- **Evidence:** `npx tsc --noEmit -p tsconfig.app.json` and `npm run build` both fail because the three non-FR admin dictionaries do not provide the required `credits` member of `AdminCopy` in `src/components/admin/adminCopy.ts` (lines 457, 605, and 753).
- **Risk:** This is not an access-control vulnerability, but it prevents a reliable release/security-verification gate and can hide later regressions.
- **Recommended fix:** Restore dictionary type parity in the existing admin copy work, then rerun the checks. This audit did not alter that unrelated code.
- **Files/migrations:** `src/components/admin/adminCopy.ts:457,605,753`

## Table-by-table RLS Review

| Table | RLS | User access | Admin access | Risk | Notes |
|---|---|---|---|---|---|
| `profiles` | Yes | Read own row; update only `full_name`, `full_name_ar`, `phone`, `avatar_url`; no insert/delete | Active admin reads all profiles | Low | Column grant prevents browser changes to role, status, or email. |
| `wallets` | Yes | Read own wallet only; no client writes | Active admin reads all wallets | Low | `balance >= 0`; writes are server-managed. |
| `credit_ledger` | Yes | Read own entries only; no client writes | Active admin reads all ledger rows | Low | Append-only for browser roles; welcome bonus has a partial unique index. |
| `categories` | Yes | Read active rows only; no writes | Active admin reads all | Low | Direct client mutation revoked. |
| `establishments` | Yes | Read approved rows only; no direct writes | Active admin reads all; creation is through RPC | Low | RPC intentionally creates approved/verified entries; normal users cannot insert. |
| `branches` | Yes | Read active branches of approved establishments; no writes | Active admin reads all | Low | Direct client mutation revoked. |
| `search_logs` | Yes | Read own logs only; no writes | Active admin reads all | Low | Writes occur in the secure search RPC. |
| `missing_service_requests` | Yes | Read own rows; create only through RPC | Active admin reads all and can still directly update three review columns | Medium | Duplicate pending query is prevented, but abuse controls and single write path are missing. |
| `recharge_requests` | Yes | Read own rows; direct self-owned pending insert | Active admin reads all; approval/rejection through RPC | High | Request amount/points are user controlled; deployment state is unverified. |

The table review reflects migration source, assuming all migrations were applied in the intended order. The duplicate version means that assumption must be verified on the remote project.

## RPC Review

| Function | Role check | `search_path` | Grants | Atomic | Risk | Notes |
|---|---|---|---|---|---|---|
| `set_updated_at` | Internal trigger | Explicit (`pg_catalog, public, pg_temp`) | Public revoked | Trigger operation | Low | Not a public RPC. |
| `handle_new_user` | Trigger-only | Explicit (`pg_catalog, public, pg_temp`) | Public revoked | Yes | Low | Creates profile/wallet/welcome ledger in the Auth-user insert transaction. |
| `normalize_profile_phone` / `set_profile_phone_normalized` | Internal | Explicit empty path | Public revoked | Trigger operation | Low | No browser-executable grant. |
| `is_admin` / `is_super_admin` | Active role checked in database | Explicit empty path | Authenticated only | Read-only | Low | Boolean helpers avoid recursive profile RLS. |
| `search_services_with_credit` | `auth.uid()`; role lookup | Explicit (`pg_catalog, public, auth`) | Public/anon revoked; authenticated execute | Wallet debit/log/ledger are one transaction | Medium | Wallet row is locked and non-negative; unlimited path omits active-status check and query controls. |
| `create_missing_service_request` | `auth.uid()` | Explicit empty path | Public/anon revoked; authenticated execute | Insert/duplicate handling is transactional | Medium | Own search log ownership checked, but not query/status relationship; no rate or size limit. |
| `admin_update_user_status` | Active admin/super-admin in database | Explicit empty path | Public/anon revoked; authenticated execute | Single update | Low | Prevents self-change, deleted-account changes, and admin changes to privileged targets. |
| `super_admin_update_user_role` | Active super-admin in database | Explicit empty path | Public/anon revoked; authenticated execute | Single update | Low | Prevents self-change and last-super-admin demotion. |
| `admin_create_establishment` | Active admin via `is_admin()` | Explicit empty path | Public/anon revoked; authenticated execute | Establishment, branch, optional request resolution are one transaction | Low | Validates names, phone, image extension, dates; slug generation is protected by an advisory transaction lock. |
| `admin_update_missing_service_request` | Active admin via `is_admin()` | Explicit empty path | Public/anon revoked; authenticated execute | Row locked before update | Medium | Secure itself, but coexists with a direct admin table-update policy. |
| `admin_approve_recharge_request` | Active admin via `is_admin()` | Explicit empty path | Public/anon revoked; authenticated execute | Request and wallet rows locked; wallet, ledger, request update are one transaction | High | Atomic implementation is good; credits are nevertheless based on user-controlled request data. |
| `admin_reject_recharge_request` | Active admin via `is_admin()` | Explicit empty path | Public/anon revoked; authenticated execute | Row locked then updated | Low | Does not mutate wallet or ledger. |

## Frontend Security Review

- The only configured browser credentials are `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, loaded from `src/lib/supabaseClient.ts`. No service-role/secret/database key was found in frontend code or environment variable names.
- `.env`, `.env.local`, `.env.*.local`, `node_modules`, and `dist` are ignored. No environment file, `node_modules`, or `dist` content is tracked.
- Components do not import the Supabase client directly; data access is confined to `src/lib/` and React hooks.
- Protected routes wait for session resolution. `/admin` additionally waits for profile loading and checks role plus `active` status; the database remains the real enforcement point.
- Role redirects only accept same-origin path destinations. The `redirect` parameter cannot send a user to an external origin.
- Browser mutation review found only the allowlisted own-profile update. No direct wallet, ledger, establishment, branch, or normal-user admin-request mutation exists in `src/`.
- No `dangerouslySetInnerHTML`, `eval`, dynamic `Function`, or unrestricted `window.open` usage was found. External WhatsApp links use `rel="noreferrer"`.
- Development-only logging exists for the missing-service RPC and role/profile diagnostics. It does not log wallet, ledger, or profile payloads; remove or further minimize it before production telemetry is introduced.
- Supabase Auth dashboard settings (email confirmation, password policy, CAPTCHA/rate limiting, redirect allow-list, MFA) are not represented in source and require a dashboard review.

## Wallet/Credits Review

- Browser roles cannot update `wallets` or insert/update/delete `credit_ledger` rows.
- `wallets.balance` has a non-negative database constraint. Normal paid searches lock the wallet, decrement it, add the matching ledger row, and write a search log in one function transaction.
- `handle_new_user` initializes the wallet and writes the welcome bonus once; the partial unique index prevents a duplicate welcome-bonus row per user.
- Admin/super-admin searches do not alter a wallet or create a debit ledger row, but the role decision should also require an active status (SEC-004).
- The recharge approval function has appropriate locking and transaction shape, but its source request is not financially trustworthy (SEC-001). Recharge backend deployment is not confirmed.

## Requests/Establishments Review

- Normal users cannot directly insert establishments or branches; the approved establishment path is an active-admin `SECURITY DEFINER` RPC.
- `admin_create_establishment` validates the required French/Arabic names, Mauritanian phone format, image extension, and date ordering, and creates the establishment plus main branch atomically.
- Missing-service request creation is RPC-only for normal users, and its pending-query unique index prevents one exact pending duplicate per account. It does not provide a real anti-spam control (SEC-005).
- Request review is database-authorized for admins, but direct admin table mutation remains enabled alongside the newer RPC (SEC-006).

## Search Review

- Authentication is required; invalid queries return before any wallet change; insufficient balances write a zero-debit log; valid normal-user searches debit exactly one point in the same transaction as the ledger/log writes.
- RLS limits normal users to their own search logs and permits active admin review by explicit policy.
- There is no SQL concatenation or dynamic SQL, so the reviewed RPC does not present a classic SQL-injection path. Pattern wildcards and unbounded aggregation remain an availability/abuse concern (SEC-003).

## Secrets Review

- `.env.local` exists and contains only the required Vite variable names. Values were not printed or inspected in this report.
- No forbidden frontend variable name was found: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `POSTGRES_PASSWORD`, `DATABASE_URL`, or `JWT_SECRET`.
- Static secret-pattern scans found only a documented example and dependency metadata, not an application secret. No secret values are included in this report.
- Remote Supabase secrets, Auth settings, and service-role credentials were not accessed.

## Recommended Fix Plan

### Phase Security 2A — Critical fixes

1. Before any recharge deployment, replace client-authored points/prices with server-derived, bounded offer/payment data and a verified approval state (SEC-001).
2. Reconcile Supabase migration history and give the duplicate `20260819000005` migration a unique version before further rollout (SEC-002).

### Phase Security 2B — High fixes

1. Make unlimited search contingent on active admin/super-admin status and add database tests for suspended/deleted roles (SEC-004).
2. Add a single, auditable request-review write path; remove the residual direct table grant if RPC-only is selected (SEC-006).
3. Introduce append-only audit logging for financial and privileged actions (SEC-007).

### Phase Security 2C — Medium cleanup

1. Add server-side request/search length limits, result caps, wildcard handling, and rate limiting (SEC-003, SEC-005).
2. Review Supabase Auth dashboard controls and remote RLS/function grants against these migrations.
3. Restore TypeScript dictionary parity and rerun the release checks (SEC-008).

## Not Changed

No application source, Supabase migration, RLS policy, RPC, wallet/ledger logic, credential, or dependency was changed during this audit. The only audit artifact created is this report. Existing uncommitted project changes were preserved.

## Checks Performed

- Read all mandatory project and security guidance files.
- Reviewed all 11 SQL migration files, their table policies/grants, and all function definitions in source.
- Reviewed Supabase client setup, Auth/session hooks, route guards, role resolver, frontend validation, browser data access, redirects, and rendering patterns.
- Ran safe static scans for sensitive credential markers, direct client mutations, client imports, RPC calls, and dangerous rendering APIs without printing secrets.
- `npx tsc --noEmit -p tsconfig.app.json`: failed on existing `adminCopy.ts` dictionary type errors (SEC-008).
- `npm run build`: failed for the same TypeScript errors before Vite build.

## Security 2A Fixes

- **Date:** 20 August 2026
- **Fixed:** The admin credit-copy consumers now typecheck against the complete FR/AR/EN `credits` dictionary. A new security migration constrains new recharge rows to the three server-authorized V1 offer pairs `(10 points, 50 MRO)`, `(30, 100)`, and `(100, 500)`; reserves `admin_note` for the team; and replaces approval with a version that rejects any legacy or forged pair before locking the wallet and writing a ledger entry. The approval RPC remains active-admin-only and public/anon execution remains revoked.
- **Remaining:** The historical duplicate `20260819000005` migration versions are both tracked in Git, while the remote Supabase migration history is unavailable. They were deliberately not renamed: changing a possibly applied version could replay or desynchronize production schema changes. A project owner must first reconcile the remote migration history, then choose a safe unique-version corrective migration or a controlled rename for environments where neither was applied. The other Security 2B/2C findings (search abuse controls, suspended-admin unlimited search, request-flow consolidation, and audit logs) remain out of scope.
- **New migrations:** `supabase/migrations/20260820000002_security_2a_recharge_constraints.sql` (unique version; depends on the existing recharge migration).
- **Build/typecheck:** `npx tsc --noEmit -p tsconfig.app.json` passed. `npm run build` passed; Vite emitted its existing chunk-size warning only.
- **Static checks:** No direct browser wallet or credit-ledger mutation was found. Secret-pattern scans found only documentation/dependency metadata markers; no application secret was exposed.

## Security 2B Fixes

- **Date:** 20 August 2026
- **Fixed:**
  - **SEC-003:** `search_services_with_credit` now rejects normalized queries longer than 80 characters, serializes each account's search window, limits searches to 20 per minute, escapes ILIKE wildcard characters, limits establishments to 20 and branches per establishment to 10, and returns the durable search-log identifier.
  - **SEC-004:** Unlimited searches now require both an active profile and an `admin` or `super_admin` role. Suspended or deleted privileged profiles follow the normal wallet-gated path.
  - **SEC-005:** `create_missing_service_request` now bounds query and message length, serializes each account's request window, limits requests to five per hour, and requires the caller's matching `not_found` search log from the last 24 hours. The client passes the search-log identifier returned by the search RPC.
  - **SEC-006:** Direct authenticated/anonymous `UPDATE` access and the legacy admin review policy were removed from `missing_service_requests`; the active-admin, locked RPC is now the only browser write path.
  - **SEC-007:** Added a narrow RLS-protected `admin_audit_events` table. Existing privileged status, role, request-review, establishment, recharge-approval, and recharge-rejection RPCs append compact actor/action events in their existing transactions. Browser roles have no table privileges or policies for audit rows.
- **Deferred:** **SEC-002** remains deferred. Both `20260819000005` migrations remain unchanged because remote Supabase migration history is unavailable. Renaming a potentially applied migration could replay or desynchronize schema changes. A project owner must reconcile remote history first, then make a controlled unique-version decision for environments where it is safe.
- **Accepted V1 risks:** No broader audit system, payment verification flow, dashboard/Auth configuration change, or remote migration reconciliation was added. Remote deployment state and Supabase dashboard controls still require owner verification.
- **New migrations:** `supabase/migrations/20260820000004_security_2b_medium_hardening.sql`
- **Remaining findings:** Critical: 0; High: 0; Medium: 1 (**SEC-002**, migration-history confirmation); Low: 0.
- **Build/typecheck:** `npx tsc --noEmit -p tsconfig.app.json` passed. `npm run build` passed; Vite emitted its existing chunk-size advisory only.
