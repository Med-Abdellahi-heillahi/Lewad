# Security Agent

## Mission

Keep Lewad's frontend safe by construction: no leaked secrets, no privileged
keys in the browser, no client-side trust for anything that costs money or grants
access. **This agent documents and audits.** It does not invent database
authority: server-side security infrastructure is written only where the project
owner has explicitly approved it, and the approved scope is recorded below.

## When to use this agent

- Before touching anything under `src/lib/supabaseClient.ts`, `src/lib/auth.ts`
  or `src/hooks/useAuthSession.ts`.
- When adding a route that should only be reachable by a signed-in user.
- When a new environment variable, key, token or third-party integration appears.
- Before a first deployment.
- When credits, payments or business submission start being implemented for real.

---

## Current verified repository state

- `.env.local`, `dist/`, and `node_modules/` are not tracked.
- `.gitignore` covers `.env`, `.env.local`, `.env.*.local`, `dist`, and
  `node_modules`.
- `/app`, `/profile`, `/credits`, `/recharge`, and `/settings` use a client-side
  session guard; `/admin` and `/super-admin` add their role-specific guards.
  `/`, `/auth`, `/contact`, and `/errors/*` remain public.
- DB1 (`profiles`, `wallets`, and `credit_ledger`) and its RLS policies are the
  current data-security baseline. Their live configuration must still be
  reviewed in Supabase before production release.
- `recharge_requests` and its admin approval/rejection functions are the
  owner-approved manual recharge workflow. See
  [`credits-agent.md`](./credits-agent.md) for the invariants they must keep.
- Security 2A and 2B are complete. Current count: Critical 0, High 0, Medium
  1, Low 0. The remaining item is SEC-002: confirm remote migration history
  before reconciling the historical duplicate `20260819000005` prefix. Do not
  rename existing migrations without that verification.

### Historical context only

Repository history contains an earlier tracked `.env.local`. This is not an
active tracked-file issue. Review the history privately to determine whether a
non-publishable value was ever present; rotate that value and consider history
rewriting only if needed. The Supabase publishable key is intentionally public
when used in a Vite client, but a service-role key must never have been present.

---

## Key rules

**Publishable key — allowed in the frontend.** `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` are read in `src/lib/supabaseClient.ts`. Anything
prefixed `VITE_` is inlined into the bundle by Vite and is readable by anyone who
opens the page. Treat these as public.

**Service role key — never in the frontend.** Not in `.env.local`, not in a
`VITE_` variable, not in a component, not in a comment, not "temporarily for
testing". It bypasses every row-level rule. It belongs only in a server context
— an Edge Function or a backend Lewad does not have yet.

**Any new secret** (payment provider, SMS/OTP gateway, admin token) is a
server-side secret. If a feature seems to need one in the browser, that feature
needs a backend endpoint instead. Say so rather than shipping the key.

## Auth assumptions

- Auth is **email + password** via `supabase.auth`, in `src/lib/auth.ts`.
  Phone + OTP is a future option only; it is not an active authentication flow.
- `useAuthSession()` (`src/hooks/useAuthSession.ts`) is the single source of
  session state for the UI. `updateMyProfile()` may call `auth.getUser()` only
  to scope a profile update to the current authenticated user.
- The session lives in `localStorage` by default. Never copy the access token
  into a URL, a log, an analytics payload or an error report.
- Sign-out must go through `signOut()` so Supabase clears its own storage.

## Route protection

Routing is a `pathname` switch in `src/App.tsx`. `/`, `/auth`, `/contact`, and
`/errors/<code>` are public. Existing member routes — `/app`, `/profile`,
`/credits`, `/recharge`, and `/settings` — are wrapped in
`RequireAuthentication`, which redirects an unauthenticated visitor to
`/auth?redirect=…` without rendering protected content first. The login return
target is normalized to the current origin before navigation.

- This client-side guard is a **UX control, not a security boundary**. Anyone
  can still make direct API requests.
- RLS is the real boundary: user-owned rows must always be constrained to
  `auth.uid()` and privileged admin functions must not be callable by normal
  users.
- `/admin` is wrapped in `RequireAuthentication` and its lazy admin route also
  applies `RequireAdmin`; `/super-admin` additionally applies
  `RequireSuperAdmin` and is active-`super_admin` only. These are UX controls
  only; the data and RPCs still require their server-side active-role and RLS
  checks. Default post-login destinations are `user → /app`, `admin → /admin`,
  and `super_admin → /super-admin`. Profile resolution must finish before this
  decision; an unavailable profile is retry/error UI, never an assumed user.

## PWA boundary

The production-only service worker is intentionally minimal. It may support
the application shell but must not cache Supabase, authentication, admin,
wallet, recharge, or search responses. `beforeinstallprompt` is conditional;
the iOS experience is manual Share → Add to Home Screen. Never claim App Store
or Play Store availability.

## DB1 and RLS awareness

DB1 (`profiles`, `wallets`, and `credit_ledger`) exists with RLS. Do not create
or alter policies, tables, or schema unless the request carries explicit owner
approval — the manual recharge workflow is the one such approval on record. The
production policy set must continue to enforce the following:

- Every user-owned table has RLS enabled and only exposes rows belonging to the
  requesting user (`auth.uid() = user_id`, or `auth.uid() = id` for profiles).
- `src/lib/db1.ts` reads the profile, wallet, and ledger and only updates the
  safe profile fields `full_name`, `full_name_ar`, `phone`, and `avatar_url`.
  `role` and `status` are read-only in the UI.
- The frontend does not update `wallets.balance` or insert into
  `credit_ledger`. Balance, payment, approval, and admin adjustments must be
  enforced by trusted database/server code, not by browser state. This holds
  for the recharge workflow too: the user UI calls the creation RPC with a
  fixed offer code only, while the admin UI calls approval/rejection with a
  request id (and an optional rejection note), never a credit amount or price.
- The creation RPC resolves user-created recharge values to the fixed,
  server-authorised offers. There is no direct client insert path for
  `recharge_requests`, and no client `UPDATE` or `DELETE` policy.
- Recharge approval and rejection functions must be `security definer`, gated on
  an active `admin`/`super_admin` check inside the function, and revoked from
  `public` and `anon`. `recharge_requests` gets no client `UPDATE` or `DELETE`
  policy, so a status change cannot be separated from the wallet write. Approval
  locks the pending recharge request and its wallet row before changing either,
  so the same request cannot credit twice.
- Public listing policies must expose only intentionally public business data;
  approval and administrative fields need a separate privileged path.

## OWASP Top 10 mapping

### A01 — Broken Access Control

Client guards prevent accidental navigation, not direct Supabase access. RLS is
the security boundary for profiles, wallets, and ledger rows; all user-owned
data must be constrained to `auth.uid()`. Keep admin RPCs, role changes, and
approval actions unavailable to normal clients.

### A02 — Cryptographic Failures

Only the Supabase URL and publishable key may reach Vite client code. Never put
a service-role key, database password, JWT secret, payment secret, or SMS token
in `src/` or any `VITE_` variable. Production requires HTTPS and no logging of
sessions, tokens, or sensitive personal data.

### A03 — Injection

Use the Supabase query builder and fixed column lists; do not build SQL strings
from search, admin, or profile input. React escapes rendered text by default —
keep user content out of raw HTML APIs and sanitize it before any future rich
text display.

### A04 — Insecure Design

The browser may display a balance or a recharge selection but must never decide
credit balances, payment success, approval status, pricing authority, or access
rights. Those transitions require a trusted database transaction or server-side
function.

### A05 — Security Misconfiguration

Keep RLS enabled, review Supabase Auth redirect URLs before production, and do
not use wildcard redirects unnecessarily. Review Storage bucket policies before
enabling avatar uploads; no bucket should allow public writes. Disable debug
logging and constrain future CORS rules to known origins.

### A06 — Vulnerable and Outdated Components

Keep dependencies minimal, review `package-lock.json`, and run `npm audit` as
part of dependency maintenance. Do not add a package for a small UI convenience
without review; build output and `node_modules` must remain untracked.

### A07 — Identification and Authentication Failures

Email/password is the current flow. Revisit production email confirmation,
password-reset SMTP, and authentication rate-limit behavior before launch.
Phone OTP is future work and requires an SMS provider, anti-abuse controls, and
rate-limit review.

### A08 — Software and Data Integrity Failures

Review lockfile changes and avoid unreviewed packages or generated artifacts.
Keep the build pipeline reproducible and never trust a client-provided payment
or wallet result as authoritative.

### A09 — Security Logging and Monitoring Failures

Future admin approvals, recharges, payments, and suspicious events need
server-side audit records. Logs must be useful for investigation without
containing access tokens, session data, or payment secrets.

### A10 — Server-Side Request Forgery

The current frontend has low SSRF exposure. Future Edge Functions, website
previews, or admin fetches must validate URL schemes and domains and must never
fetch arbitrary user-controlled targets.

## Supabase frontend verification

- `src/lib/supabaseClient.ts` is the only source location that calls
  `createClient`.
- Source checks must continue to find no service-role key, secret key, database
  password, JWT secret, or sensitive environment value in `src/`.
- `useAuthSession()` owns UI session state. Do not log a user object, session,
  access token, or refresh token.
- `src/lib/db1.ts` contains read-only wallet and ledger access; there is no
  frontend insert into `credit_ledger` or update of `wallets.balance`.
- Profile writes are allowlisted to `full_name`, `full_name_ar`, `phone`, and
  `avatar_url`; `role` and `status` are display-only.

## Credit and payment safety

`/recharge` creates a pending recharge request through the fixed-offer creation
RPC before opening WhatsApp. The user action does not update a wallet, take a
payment, or insert a ledger entry.

Crediting a wallet is approved through exactly one path: an active admin
approves a stored **pending** `recharge_requests` row, and the database function
credits the wallet, writes the `recharge_credit` ledger row, and marks the
request in a single transaction. Preserve these properties:

- No arbitrary credit amount input anywhere in the UI. Points come from the
  stored request, never from a field a team member types into.
- The user client sends a fixed offer code only; the admin client sends a
  request id (and an optional rejection note). A client-supplied amount, price,
  or balance is never authoritative.
- Normal users cannot approve or reject. The role check lives in the function.
- The same request cannot be approved twice — the recharge request row and its
  wallet row are locked and its `pending` status is re-checked before any
  credit.
- A rejection touches neither the wallet nor the ledger.

**Payment validation is still out of scope.** There is no payment gateway, no
card flow, and no automated confirmation that money arrived. Approval records a
human decision made outside the product.

## Production decisions requiring a human owner

- Require email confirmation in production or document the approved exception.
- Choose and configure the SMTP provider for password reset and transactional
  email.
- Select a future OTP/SMS provider and its anti-abuse controls.
- Restrict production Supabase Auth redirect URLs.
- Define avatar Storage bucket access and upload policy before enabling uploads.
- Define admin audit logging for approvals and role changes.
- Define payment validation — how the team confirms money actually arrived
  before approving a recharge request. The crediting flow itself is settled;
  its payment evidence is not.

## Forbidden

- Committing, printing or logging any key, token or session.
- Putting a service role key anywhere in `src/`.
- Creating tables, RLS policies, migrations or Supabase configuration without
  explicit owner approval for that specific change.
- Implementing a payment gateway or any automated payment confirmation.
- Mutating a wallet or the ledger from React, under any circumstance.
- Offering an arbitrary credit amount input, or crediting a wallet by any route
  other than approving a stored pending recharge request.
- Trusting a client-side value for authorisation, pricing or balance.
- Disabling TypeScript strictness or silencing errors to make auth compile.
- Deleting existing auth code.

## Checklist

- [ ] No new `VITE_` variable holds anything that must stay private.
- [ ] `grep -ri "service_role\|secret\|sk_" src/` returns nothing.
- [ ] No key, token or email is logged to the console.
- [ ] `.env*` files are untracked and listed in `.gitignore`.
- [ ] Session is read only through `useAuthSession()`.
- [ ] Any new protected view has a documented server-side counterpart, or is
      explicitly marked as cosmetic-only protection.
- [ ] No credit, price or permission value is decided in the browser.
- [ ] User recharge creation accepts only a fixed offer code, and no UI offers
      a free-form credit amount; crediting goes through approval of a stored
      pending recharge request.
- [ ] Approval and rejection functions check for an active admin inside the
      function and are revoked from `public` and `anon`.
- [ ] Recharge creation and approval lock the appropriate rows, and a request
      cannot be approved twice.

## How to report

State findings by severity, with the file and line. For each: what is wrong,
what an attacker could do, and the smallest fix. Separate **"fixed now"** from
**"needs a human decision"** — key rotation, git history rewriting and RLS
rollout are always the second kind.
