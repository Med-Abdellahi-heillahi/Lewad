# Lewad Clean Architecture, Clean Code and Performance Report

**Audit date:** 2026-08-21  
**Scope:** static source and migration review, production-build inspection, and a safe capacity-test design. This is an audit only: no application, SQL, policy, or configuration behaviour was changed.

## Executive Summary

- **Overall architecture status:** Good V1 foundations with clear UI/data separation, typed TypeScript, explicit Supabase RPC boundaries for sensitive actions, and lazy-loaded admin areas. The application is suitable for controlled V1 validation once the deployment and capacity items below are addressed.
- **Current source security posture:** no current Critical or High authorization finding was identified in the reviewed source. The previous Security 2A/2B hardening is present: privileged writes go through authenticated RPCs, the browser uses the publishable key only, and the avatar migration constrains writes to the authenticated user's folder. This is a static conclusion, not confirmation of the remote Supabase state.
- **Principal architecture concern:** a small number of modules own too many responsibilities. In particular, `src/components/AppPages.tsx`, `src/components/AppDemo.tsx`, `src/lib/admin.ts`, and `src/components/admin/adminCopy.ts` concentrate unrelated UI, orchestration, data, and localisation work.
- **Principal performance concern:** the admin overview and analytics are assembled by many browser-side queries and client-side aggregation. `getAdminOverview()` downloads every wallet balance, while `getAdminAnalytics()` performs a wide fan-out and reads capped event sets into the browser. Recharge retrieval is also unpaginated. These are the first likely V1 scaling limits.
- **Production-readiness conclusion:** proceed with a small, instrumented staging load test—not a production load test—after reconciling migration history and prioritising server-side aggregate/pagination work. The present source alone cannot certify a production concurrency capacity.

| Severity | Count | Meaning in this report |
| --- | ---: | --- |
| Critical | 0 | No current source finding that directly enables a critical data/authorization compromise. |
| High | 4 | Likely to affect admin reliability, response time, or release maintainability as usage grows. |
| Medium | 11 | Important correctness, operational, scalability, or maintainability work before/around production. |
| Low | 4 | Cleanup or latent-risk items that should be scheduled, not rushed into the current release. |

The severity counts exclude historical findings already remediated by Security 2A/2B. The remaining documented security deployment item, **SEC-002**, is counted as a current Medium operational risk because the remote migration-history state was not inspected.

## Architecture Review

### What is working well

- UI components do not directly create or import a Supabase client. Browser data access is centralised in `src/lib/`, using the single client in `src/lib/supabaseClient.ts`.
- Sensitive member actions use targeted RPC wrappers: service search/credit debit (`src/lib/db3a.ts`), missing-service requests (`src/lib/db3b.ts`), recharge, admin actions (`src/lib/admin.ts`), and super-admin administration (`src/lib/superAdmin.ts`). This is the correct boundary for RLS-sensitive business operations.
- `src/App.tsx` keeps admin, super-admin, and admin-account routes behind authentication/role guards and lazy imports. The build confirms separate admin chunks rather than forcing those pages into every route load.
- The account and wallet hooks use request identifiers to avoid stale account/ledger responses. Shared settings components (`src/components/settings/`) are reused by member and admin-account surfaces.
- The PWA service worker caches the application shell but does not cache cross-origin Supabase responses. That avoids serving stale authenticated data from a generic cache.
- Internationalisation at `src/i18n/index.tsx` has a typed dictionary contract for French, Arabic, and English.

### Findings

**H-01 — Concentrated responsibilities and split localisation ownership.** `AppPages.tsx` combines route dispatch, profile/avatar update, wallet ledger, recharge flow, WhatsApp hand-off, settings, contact/add-business views, and local French/Arabic/English copy. `AppDemo.tsx` combines search orchestration, matching/suggestions, request submission, result rendering, and another local copy object. `lib/admin.ts` is the single access layer for overview, analytics, users, wallets, ledger, search logs, services, requests, recharges, and finance. `adminCopy.ts` contains the admin copy contract and all three language dictionaries in one large concurrent-edit hotspot.

This structure is understandable for a V1, but it raises regression probability and makes reviewers load too much unrelated context for a small change. It also creates two localisation systems: the typed global i18n dictionaries and page-local translation objects. Split by bounded feature after the production-critical performance work; do not perform a broad mechanical rewrite during stabilisation.

**M-01 — Route orchestration is deliberately simple but will not scale linearly.** `src/App.tsx` uses a pathname switch and full-document anchors. This is adequate for a compact V1, and changing routers now would create unnecessary release risk. As routes, nested states, and test requirements expand, use a typed route registry or a router migration with a clear cutover plan. Treat this as post-V1 architecture work, not an immediate rewrite.

**M-02 — Admin and super-admin pages duplicate dashboard orchestration.** Both `src/components/AdminPage.tsx` and `src/components/SuperAdminPage.tsx` load overview/analytics/services and maintain similar loading/error/page state. This duplication will drift as dashboard contracts change. A small shared dashboard-data hook or feature module is preferable after the aggregate queries are moved server-side.

**M-03 — Admin requests can accept stale responses and management search is unthrottled.** The account hooks protect against out-of-order requests, but `AdminPage` and super-admin management/audit loaders do not apply an equivalent request-id/abort guard. Rapid tab/filter/page changes can render an older response after a newer one. The management search triggers an RPC on each keystroke without debounce. Add a small `useLatestAsync`/abortable-query helper and a short debounce once the product behaviour is stabilised.

**L-01 — Shared sidebar surface can be reduced later.** `AdminSidebar.tsx` and `SuperAdminSidebar.tsx` both implement desktop and drawer navigation shapes. A role-aware navigation primitive would reduce drift, but the current code is serviceable. Also remove the currently unused `onDesktopToggle` prop in `SuperAdminSidebar` only when its call sites are reviewed.

## Clean Code Review

### Strengths

- `tsconfig.app.json` enables `strict`, `isolatedModules`, and consistent filename casing.
- The `src/lib` APIs expose typed result objects and protect implementation details from components.
- Supabase security-definer functions consistently set a restricted `search_path` in the current hardening migrations.
- The recent avatar and partial-profile workflow uploads before persisting the profile path/URL; failure does not erase the existing avatar value.

### Findings

**H-02 — `lib/admin.ts` is both a domain boundary and a large multi-domain module.** It is useful that components call one data-access layer; the issue is that this single file now owns distinct domains with different change rates. Split it into feature-oriented modules such as `admin/overview.ts`, `admin/analytics.ts`, `admin/users.ts`, `admin/recharges.ts`, and `admin/services.ts`, retaining a small public barrel only if it remains useful. The split should follow tests and unchanged public contracts, not a rename-only exercise.

**M-04 — PostgREST join data is forced through unsafe casts.** `src/lib/admin.ts` uses `as unknown as` for joined request rows. That masks schema-contract changes at compile time. Prefer a narrow runtime parser/type guard (similar to the defensive response validation used in `src/lib/superAdmin.ts`) or generated Supabase database types for these joins.

**M-05 — No automated test suite/test script was found.** The package exposes `dev`, `build`, and `preview`, but no unit, integration, or browser test command; no test/spec files were found by the repository scan. Build/typecheck alone do not prove the wallet debit, one-time recharge approval, admin roles, request throttles, or partial profile behaviour. Add focused tests around pure helpers first, then RPC contract/integration tests against disposable local or staging data.

**M-06 — Dependency ranges use `latest` for core build/runtime packages.** The lockfile makes the currently installed build reproducible only when the exact lockfile workflow is honoured, but a fresh unconstrained update can change React, TypeScript, Vite, or the React plugin unexpectedly. Use reviewed version ranges/lockfile updates and `npm ci` in CI. This is release hygiene, not an immediate runtime defect.

**M-07 — Legacy admin recharge messaging is inconsistent with the active flow.** `AdminRechargePanel.tsx` describes an older WhatsApp-only/no-table model while the current application uses `recharge_requests` and the approval flow exposed elsewhere in the admin surface. Keeping a rendered legacy panel risks operator confusion. Reconcile or remove the obsolete view only after product confirmation; do not change financial workflow implicitly.

**L-02 — Latent legacy data-access surface.** `src/lib/db2.ts` is not used by the active member search path (which uses DB3A RPC). Its `searchEstablishments(..., withBranches)` can issue one branch query per establishment and has no result cap. Verify external/non-source consumers; then retire it or protect it with pagination and a batched branch query before any reuse.

**L-03 — Development logging should be intentional.** A small number of development console errors remain (for example the missing-service request and lazy-chunk boundary). They do not expose a service key in the reviewed code, but production logging should use a redacted, centrally controlled telemetry path rather than ad hoc browser console output.

**L-04 — Minor consistency cleanup is available.** A small number of unused/dead legacy exports (for example `SuperAdminPanel`) and local style differences should be resolved in normal feature work after confirming there is no external consumer. This is intentionally low priority.

## Supabase Backend Architecture Review

### Current design strengths

- The browser client is created only with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; no service-role credential was found in frontend source.
- The current secure search RPC (`20260820000004_security_2b_medium_hardening.sql`) validates query length, serialises a user's request with an advisory transaction lock, rate-limits normal users, locks/debits the wallet atomically, limits returned establishments/branches, and grants execution only to `authenticated`.
- Missing-service requests are rate-limited and executed through their own authenticated RPC.
- Super-admin functions verify role status in the database, set a safe `search_path`, revoke public/anonymous execution, and grant only authenticated execution. Audit events are server-owned rather than browser-writable.
- The current avatar migration creates/updates the `avatars` bucket with a deliberately public-read model for displayed avatar URLs while limiting insert/update/delete to an authenticated user's exact first storage folder and allowed image/size constraints. There are no anonymous writes in those policies.

### Findings

**M-08 — Remote migration history/policy deployment remains unverified (SEC-002).** The repository documents a duplicate historical timestamp around `20260819000005` and calls for remote migration-history reconciliation. Static review cannot prove that the remote project has applied the intended migration chain, search hardening, recharge RPCs, super-admin functions, or the avatar storage repair. Resolve the history against the remote Supabase environment with a documented, reversible migration-status procedure before production. Do not rename an already-applied historical migration merely to make local filenames look tidy.

**H-03 — Admin aggregates are executed in the browser rather than as bounded backend summaries.** `getAdminOverview()` issues several exact counts and selects all wallet balances so JavaScript can calculate their sum. `getAdminAnalytics()` runs a broad set of parallel count/select calls and sends capped raw rows to the browser to build time series. This leaves the database doing scans, sends avoidable payload, duplicates chart logic across clients, and makes results inaccurate once any capped series is exceeded. Replace these with restricted admin/super-admin summary RPCs or carefully scoped views that return only aggregate values and pre-bucketed time series.

**H-04 — Recharge data is read without a server-side page/filter boundary.** `getAdminRechargeRequests()` selects the full recharge set, and `getAdminUserFinance()` calls it again before filtering for one user. The credit view then scans that array per rendered wallet. This will grow linearly with financial history and is a poor fit for an operator-facing flow. Add paginated list and per-user finance RPC/query contracts with filters, stable ordering, and indexes appropriate to the approved query plan.

**M-09 — Several super-admin query paths need indexes before their tables grow.** The admin-management RPC counts establishments by `establishments.created_by`, but the base migration defines no index for that column. Audit events have `(actor_id, created_at)` and `(target_table, target_id, created_at)` indexes, but the global audit list ordered by `created_at` has no plain leading timestamp index. Invitation expiry scans pending invitations by status/expiry without a matching composite index. Confirm with `EXPLAIN (ANALYZE, BUFFERS)` on staging, then add only the indexes used by the final query shapes—at minimum likely `establishments(created_by)` and an audit/list index such as `(created_at desc)` or an appropriate filter-aware alternative.

**M-10 — Search uses substring `ILIKE` over text columns.** The secure search RPC correctly escapes wildcard input and caps result rows, but a `'%query%'` predicate still requires a scan without a suitable text-search/trigram strategy. Existing B-tree indexes on `name` and `lower(name)` do not make arbitrary infix search efficient. Do not add an index blindly: first capture representative queries and plans, then choose `pg_trgm`, full-text search, or a product-driven prefix/structured search rule.

**M-11 — Exact counts and offset pagination have a finite scaling window.** Most admin lists correctly bound page size (up to 100), but `count: 'exact'` and growing offsets can become expensive on high-cardinality history tables. This is acceptable for a small V1 admin dataset. For search logs, ledger, recharge, and audit history, introduce filter-aware server queries and keyset/cursor pagination before history becomes large.

## Performance Review

### Production build baseline

The requested production build completed successfully on 2026-08-21. Vite transformed 2,339 modules in approximately 497 ms. The output is functionally split for protected admin routes:

| Build output | Minified | gzip | Assessment |
| --- | ---: | ---: | --- |
| Main `index` JavaScript | 728.45 kB | 209.57 kB | Above Vite's 500 kB warning threshold; the main public path deserves further splitting/asset inspection. |
| `AdminPage` | 65.66 kB | 15.11 kB | Lazy-loaded; reasonable for a dashboard feature chunk. |
| `adminCopy` | 65.44 kB | 18.29 kB | Large localisation payload, separately loaded. |
| `AdminUsers` | 48.42 kB | 12.81 kB | Lazy-loaded feature chunk. |
| `SuperAdminPage` | 41.57 kB | 10.61 kB | Lazy-loaded feature chunk. |
| Main CSS | 76.56 kB | 13.96 kB | Not the immediate bottleneck. |

The warning does not make the application broken. It does, however, make first-load performance on lower-end mobile devices and slower networks a measured concern. Keep the current role-route lazy loading, profile the main route in a production preview, and split large non-critical public/member views by route or feature. Do not merely raise Vite's warning threshold.

### Runtime hot paths

1. **Admin overview:** full wallet-balance selection plus multiple exact counts; payload and browser work grow with wallets.
2. **Admin analytics:** many concurrent requests and up to thousands of raw event rows used for client-side charting; some capped series can become silently partial.
3. **Recharge/finance view:** full history fetch and repeated in-memory scans.
4. **Member search:** security controls are sound, but infix `ILIKE` becomes a database CPU/IO bottleneck as establishments grow. The atomic credit debit intentionally serialises concurrent searches per user; that is correct for integrity, so performance work must preserve it.
5. **Admin/super-admin global lists:** exact count/offset pagination and unindexed aggregate relationships are acceptable at tiny scale, then degrade as audit/establishment history grows.

### Frontend performance notes

- The SVG charts are memo-friendly and bounded by a 90-day view; chart rendering itself is not the first issue.
- Admin route code splitting is already effective; preserve it when refactoring.
- The service worker's same-origin shell strategy avoids a class of stale authenticated API-data problems.
- Add request cancellation/latest-response guards and debounce management search to prevent unnecessary work and visual state races.

## Request Capacity Analysis

### What can and cannot be inferred

Source inspection and one local production build cannot yield an honest requests-per-second or maximum-concurrent-user guarantee. Capacity depends on the Supabase plan/region, database size and statistics, indexes, network, browser/device mix, row-level-policy cost, connection behaviour, and the production deployment configuration—all of which are outside this static audit.

The following is therefore a **conservative staging validation range**, not a production promise:

| Scenario | Initial safe staging target | Conditional next step | Reason |
| --- | --- | --- | --- |
| Ordinary authenticated browsing/search | 10–25 concurrent interactive users | 50 after meeting success metrics | Secure search is rate-limited per user and likely becomes scan-bound with more establishments. |
| Simultaneous admin dashboards | 1–2 active dashboards | 5 after server aggregates/pagination are in place | Current dashboard loads fan out into many queries and include unbounded data reads. |
| Super-admin management/audit activity | 1 active operator | 2–3 after index/plan checks | Counts, offset lists, and audit history are the relevant pressure points. |
| Recharge approval | 1–3 controlled operators | 5 after idempotency/duplicate-approval assertions pass | Financial state requires correctness over raw throughput. |

For a modest V1, validate first at **10–25 concurrent authenticated user journeys plus one active admin**, then increase only if the metrics below remain within target. Do not translate this number into a marketing/production capacity claim until staging or production-like tests, database plans, and observability support it.

### Suggested pass criteria

- At least 99% successful expected responses; 0 unexpected 5xx responses.
- p95 member search and normal page/API responses within the product SLO selected by the team (a starting discussion target is 1–2 seconds end-to-end on staging, excluding intentionally slow network simulation).
- p95 dashboard load under an agreed operator SLO, with no client-side truncated/incorrect series.
- No negative balances, duplicate ledger debit, duplicate recharge decision, cross-user storage write, or unexpected RLS denial.
- Database CPU, IO, active connections, lock waits, and slow-query samples remain stable through the test plateau and short burst.
- The app remains usable during a 10–15 minute steady-state run, not only a short spike.

## Safe Load Testing Plan

### Preconditions

1. Use a dedicated staging/local Supabase project or a production-like restored copy containing only approved synthetic data. Never run destructive or high-volume tests against the production project.
2. Reconcile and record migration status first, including the documented duplicate historical timestamp. Verify the intended storage bucket/policies and RPC grants in the staging project.
3. Seed disposable test users, establishments, wallets/credits, recharges, and audit history. Use clearly labelled data and a documented cleanup/restore path.
4. Use real authenticated test sessions obtained through the supported auth flow; never embed production keys, service-role keys, or real personal data in a load-test file.
5. Enable observability before the run: Supabase/Postgres metrics and logs, browser/network error capture, and a dashboard for application/API error rate and latency.

### Tooling and scenario design

Use k6, Artillery, or an equivalent controlled HTTP/browser-load tool. k6 is a reasonable default because staged ramping, thresholds, and scenario separation are explicit. Store scripts without secrets and use environment-variable placeholders for the staging URL and test-user credentials/tokens.

Run the following independently before combining them:

| Scenario | Representative action | Guardrail |
| --- | --- | --- |
| Member browse | Load public/member routes and paginated lists | Do not synthesize excessive cache-bypass traffic. |
| Member secure search | Call the ordinary search flow with valid test-user credits | Respect the per-user rate limit; distribute activity across disposable test users. |
| Missing-service request | Submit valid, distinct test requests | Respect the per-user hourly constraint; verify no duplicate writes. |
| Admin overview | Open/reload dashboard with one or two operator sessions | Capture query count, payload size, and p95 load; do not start at high concurrency. |
| Recharge list/finance | Page/filter records and view a test user's finance | Verify all results remain bounded and correct. |
| Super-admin list/audit | Search/page admins and audit events | Measure count/offset performance using realistic history volumes. |
| Avatar upload | Upload allowed JPEG/PNG files within the test size limit | Verify own-folder-only write, denied cross-user write, and old avatar preservation on simulated failure. |

### Controlled ramp

1. **Smoke:** 1 virtual user per scenario, 5–10 minutes; validate data correctness and request traces.
2. **Baseline:** 5 concurrent member journeys and 1 admin, 10 minutes.
3. **Initial V1 range:** 10, then 25 concurrent member journeys plus 1 active admin; hold each level 10–15 minutes.
4. **Conditional expansion:** 50 concurrent member journeys only after baseline metrics, SQL plans, and datastore resource metrics are healthy. Keep dashboard operators separate and low until aggregate work is complete.
5. **Short burst:** 1.5–2x the proven steady-state level for 1–2 minutes to reveal queueing/lock behaviour. Stop on error-rate, data-integrity, or resource thresholds.

Record exact dataset size, migration version, region, tool version, virtual-user profile, p50/p95/p99 latency, error classes, database metrics, and any data-integrity assertions with each run. This makes results comparable after refactors.

## Likely Bottlenecks

| Priority | Bottleneck | Why it appears first | Safe direction |
| --- | --- | --- | --- |
| 1 | `getAdminOverview()` wallet scan | It transfers all wallet balances to the browser just to sum them. | Restricted aggregate RPC/view returning a numeric total only. |
| 2 | `getAdminAnalytics()` query fan-out/raw series | Multiple exact counts plus capped raw event reads create DB round trips, payload, and incomplete charts. | One versioned dashboard-summary RPC with pre-bucketed series. |
| 3 | Unpaginated recharge retrieval | Financial history grows indefinitely and is rescanned for lists/user finance. | Server pagination/filtering plus stable indexes/order. |
| 4 | Infix establishment search | `ILIKE '%…%'` gets slower with catalogue size despite output caps. | Measure plans, then use the appropriate text search/trigram strategy. |
| 5 | Audit/admin list counts and offsets | History tables and relation counts grow; missing leading indexes exacerbate it. | Targeted indexes and cursor/keyset pagination for history. |
| 6 | Main route JavaScript | 209.57 kB gzip is noticeable on constrained devices even with admin code split. | Route/feature split low-priority UI and profile assets after profiling. |

## Recommended Refactor Plan

### Phase CA-1 — Must fix before GitHub push

These are release-control actions, not a request for an unsafe broad code rewrite:

1. Add a CI gate that runs `npm ci`, `npx tsc --noEmit -p tsconfig.app.json`, and `npm run build` against the committed lockfile.
2. Add a minimal automated test foundation and cover the highest-risk invariants: secure search debit is single/atomic, recharge decision is one-time, privileged RPC denies non-admin/super-admin callers, partial profile update retains old avatar when upload fails, and storage cross-folder writes are denied.
3. Reconcile stale operator-facing recharge wording/panel with the real recharge workflow, with product confirmation, so a reviewer or administrator is not misled.
4. Document the current migration status procedure and resolve SEC-002 on the intended remote environment before claiming deploy readiness. Do not modify historical migration filenames as a shortcut.

### Phase CA-2 — Must fix before production

1. Replace browser-side overview/analytics aggregation with a restricted, tested server-side summary contract. Return aggregate values and bounded time buckets only.
2. Make recharge list and per-user finance queries server-paginated/filterable; eliminate full-history transfer and repeated client scans.
3. Capture staging `EXPLAIN (ANALYZE, BUFFERS)` for admin list/audit/search scenarios, then add only evidenced indexes. Prioritise `establishments(created_by)` and an audit timestamp/list strategy if plans confirm the need.
4. Resolve remote migration/policy state, then verify role/RPC grants and storage policy behaviour with negative tests (anonymous and cross-user attempts).
5. Run the safe staging load plan through 10–25 concurrent user journeys plus one admin; do not expand without metrics and integrity assertions.
6. Add latest-response/abort handling to admin/super-admin asynchronous loaders and debounce remote management search.
7. Define a production observability baseline: latency, errors, slow queries, lock waits, storage failures, and financial-integrity alerts.

### Phase CA-3 — Nice cleanup after V1

1. Split `AppPages.tsx`, `AppDemo.tsx`, and `lib/admin.ts` by feature/domain while preserving their current public contracts.
2. Consolidate page-local translations into the typed global i18n structure, or establish one equally typed feature-local convention—not both.
3. Extract a shared role-aware admin navigation primitive and dashboard data hook only after the data contracts are stable.
4. Retire or harden unused DB2 search functions; remove confirmed dead exports/props and standardise telemetry.
5. Profile the main bundle in production preview and split only the modules shown to harm first interaction. Keep lazy role-route loading intact.
6. Evaluate a router migration only when route complexity/testability justifies the migration cost.

## File/Module Findings

| Area | File | Issue | Severity | Recommendation |
| --- | --- | --- | --- | --- |
| Member page composition | `src/components/AppPages.tsx` | Route dispatch, profile, wallet, recharge, settings, contact, and local copy coexist. | High | Split into feature views/hooks after CA-2; preserve partial-profile and avatar failure semantics. |
| Search/member experience | `src/components/AppDemo.tsx` | Search orchestration, matching, request flow, rendering, and local translations coexist. | High | Separate search controller/data hook, result presentation, and feature copy. |
| Admin data boundary | `src/lib/admin.ts` | Many independent admin domains and heavy aggregate logic live in one module. | High | First move aggregates/recharge paging server-side, then split by bounded domain. |
| Admin localisation | `src/components/admin/adminCopy.ts` | Large three-language dictionary is a merge/edit hotspot separate from global i18n. | High | Adopt one typed localisation boundary and feature files. |
| Application routing | `src/App.tsx` | Hand-maintained pathname switch/full navigations grow in complexity. | Medium | Keep V1 stable; plan a typed registry/router later. |
| Admin page fetches | `src/components/AdminPage.tsx` | No latest-response guard; search logs are filtered only in loaded page data. | Medium | Add abort/request sequencing and server-side filter parameters/pagination. |
| Super-admin orchestration | `src/components/SuperAdminPage.tsx` | Duplicates dashboard loading patterns with admin page. | Medium | Reuse a small dashboard-data hook after API summary consolidation. |
| Admin management | `src/components/super-admin/AdminManagement.tsx` | Multi-modal state and per-keystroke remote search increase complexity/work. | Medium | Extract modal flows; debounce and cancel search. |
| Legacy recharge UI | `src/components/admin/AdminRechargePanel.tsx` | Old no-table/WhatsApp description conflicts with current recharge workflow. | Medium | Confirm desired product surface and remove or update it deliberately. |
| Data types | `src/lib/admin.ts` | Unsafe join casts mask database contract drift. | Medium | Use generated types or a narrow runtime parser. |
| Tests/release checks | `package.json` / repository | No test script or test files found; core packages use `latest`. | Medium | Add focused tests, CI checks, reviewed dependency updates, and `npm ci`. |
| Legacy DB2 search | `src/lib/db2.ts` | Latent unbounded N+1 branch expansion. | Low | Confirm non-use, then remove or make query bounded/batched before reuse. |
| Super-admin navigation | `src/components/super-admin/SuperAdminSidebar.tsx` | Unused prop and duplicated sidebar structure. | Low | Remove only after consumer check; consider shared primitive post-V1. |
| Legacy component surface | `src/components/admin/SuperAdminPanel.tsx` | No in-repository import/use found. | Low | Verify external consumers then retire dead code. |
| Client logging | `src/lib/db3b.ts`, `src/components/system/ChunkErrorBoundary.tsx` | Ad hoc development console logging. | Low | Use redacted production telemetry when observability is introduced. |

## Query/RPC Findings

| RPC/Query | Risk | Expected Bottleneck | Recommendation |
| --- | --- | --- | --- |
| `getAdminOverview()` | Fetches all wallet balances for client-side sum plus several exact counts. | DB work/payload grows with wallet rows; dashboard latency. | Create a restricted aggregate summary returning counts and total balance only. |
| `getAdminAnalytics()` | Wide fan-out and raw capped event series aggregated in browser; some capped series can be incomplete. | Round trips, DB scans, payload, inaccurate charts at scale. | Server-side time buckets/aggregates with explicit limits and documented semantics. |
| `getAdminRechargeRequests()` | No page/filter limit. | Growing financial-history transfer and client scans. | Paginated/filterable server query/RPC with stable ordering and suitable indexes. |
| `getAdminUserFinance()` | Calls full recharge query then filters a single user locally. | Repeated full-history reads. | Per-user bounded finance endpoint/query; keep explicit totals-truncation semantics where needed. |
| `search_services_with_credit()` | Correctly rate-limited/atomic, but uses infix `ILIKE`. | Catalogue scan CPU/IO as establishments grow. | Obtain plans; add trigram/full-text/structured search only with measured evidence; retain locks/debit ordering. |
| `super_admin_list_admins()` | Relation count per returned admin and wildcard search. | Relation count/index cost and text-search scan as admin set grows. | Add/verify `establishments(created_by)`; measure search plans before choosing an index strategy. |
| `super_admin_list_audit_events()` | Exact count + offset ordered history without a global timestamp-leading index. | History paging and count time as audit grows. | Add proven timestamp/filter index and migrate history to cursor pagination when needed. |
| Invitation expiry query | Pending/expired records updated by status and expiry. | Scan as invitations accumulate. | Evaluate `(status, expires_at)` or a partial equivalent after plan inspection. |
| Legacy `searchEstablishments()` in DB2 | Optional branch expansion makes one query per result. | N+1 DB round trips if revived. | Retire or batch child fetches with pagination. |

## Final Recommendation

Lewad has a sound V1 security/data-boundary direction: single browser client, typed `src/lib` adapters, authenticated RPCs for sensitive work, RLS-oriented migrations, and intentional storage controls. The appropriate next move is **not** a wholesale architecture rewrite.

Prioritise the three highest-value refactors:

1. Move admin overview and analytics aggregation to a restricted server-side contract.
2. Replace unbounded recharge/history reads with server pagination and per-user finance queries.
3. Split the largest feature/data modules and unify localisation ownership after the production data paths are stable.

Before production, reconcile remote migration history/policies, add a minimal test/CI safety net, instrument the system, and run the staged 10–25 concurrent-user validation plan. With those controls, the existing architecture can support a cautious V1 release while leaving broader cleanup to an evidence-driven post-V1 iteration.

## Not Changed

- No application source code, UI flow, Supabase client, RLS policy, RPC, database migration, storage bucket, or configuration was changed for this audit.
- No production/staging load test was executed; the capacity section is a safe test plan and a conservative validation range, not a measured throughput result.
- No secrets, service-role credential, external account, remote database, or Supabase project state was accessed.
- No commit, push, dependency update, deletion, or destructive action was performed.
- The only artifact created by this task is this report.

## CA-1 Implementation Notes

- Added a locked-dependency GitHub Actions workflow for tests, application type
  checking, and production builds on Node 24 LTS.
- Added `20260821000001_ca1_admin_read_summaries.sql`. Its active-admin-only,
  `security definer` read contracts return dashboard aggregates and day buckets,
  not raw dashboard rows or PII. The contracts validate the supported 7/30/90
  day windows, use `search_path = ''`, revoke public/anonymous execution, and
  grant execution only to `authenticated`.
- `getAdminOverview()` and `getAdminAnalytics()` now consume those contracts
  and validate the response shape. An unapplied CA-1 migration falls back to
  the previous RLS-scoped reads so the UI remains recoverable while deployment
  status is fixed.
- Recharge history now has a server-side page/status/user boundary, and the
  credits table asks for a bounded current state for visible wallets. Per-user
  finance counts recharges directly instead of downloading and filtering the
  complete history. The migration adds composite user/date indexes for these
  bounded paths.
- Reconciled the legacy dashboard recharge card with the implemented approval
  flow; it now points operators to Credits and contains no invented amounts.
- Added focused Vitest coverage for pagination bounds and conservative role
  normalisation, plus a 300 ms debounce and request-id stale-response guard for
  super-admin management search/details.

Remaining work: H-01 and H-02 still require a deliberate feature-module split;
H-03 and H-04 require the new migration to be applied and verified in the target
environment; SEC-002 remains a remote project-owner reconciliation task under
`docs/migration-history-reconciliation.md`. No production load test, migration
application, payment flow change, broad RLS change, or service-role frontend
access was performed.

## Validation Performed

- `npx tsc --noEmit -p tsconfig.app.json` — passed.
- `npm run build` — passed. Vite emitted a chunk-size advisory for the 728.45 kB (209.57 kB gzip) main JavaScript bundle; this is recorded above as a performance improvement item, not a build failure.
