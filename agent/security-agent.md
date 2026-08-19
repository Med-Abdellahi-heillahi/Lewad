# Security Agent

## Mission

Keep Lewad's frontend safe by construction: no leaked secrets, no privileged
keys in the browser, no client-side trust for anything that costs money or grants
access. **At this stage this agent documents and audits — it does not create
security infrastructure.**

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
  session guard. `/`, `/auth`, `/contact`, and `/errors/*` remain public.
- DB1 (`profiles`, `wallets`, and `credit_ledger`) and its RLS policies are the
  current data-security baseline. Their live configuration must still be
  reviewed in Supabase before production release.

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
- When adding `/admin`, `/wallet`, `/requests`, `/search`, `/services/:id`, or
  `/add-business`, protect it only when the route exists and pair the UI guard
  with the appropriate RLS or server-side authorization.

## DB1 and RLS awareness

DB1 (`profiles`, `wallets`, and `credit_ledger`) exists with RLS. Do not create
or alter policies, tables, or schema from this agent. The production policy set
must continue to enforce the following:

- Every user-owned table has RLS enabled and only exposes rows belonging to the
  requesting user (`auth.uid() = user_id`, or `auth.uid() = id` for profiles).
- `src/lib/db1.ts` reads the profile, wallet, and ledger and only updates the
  safe profile fields `full_name`, `full_name_ar`, `phone`, and `avatar_url`.
  `role` and `status` are read-only in the UI.
- The frontend does not update `wallets.balance` or insert into
  `credit_ledger`. Balance, payment, approval, and admin adjustments must be
  enforced by trusted database/server code, not by browser state.
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

Recharge selection and the WhatsApp handoff are informational UI only. They do
not update a wallet, insert a payment, or insert a ledger entry. Preserve that
property until a server-validated payment and crediting flow is designed.

## Production decisions requiring a human owner

- Require email confirmation in production or document the approved exception.
- Choose and configure the SMTP provider for password reset and transactional
  email.
- Select a future OTP/SMS provider and its anti-abuse controls.
- Restrict production Supabase Auth redirect URLs.
- Define avatar Storage bucket access and upload policy before enabling uploads.
- Define admin audit logging and the payment-validation/crediting flow.

## Forbidden

- Committing, printing or logging any key, token or session.
- Putting a service role key anywhere in `src/`.
- Creating tables, RLS policies, migrations or Supabase configuration.
- Implementing payment, wallet or credit mutation logic.
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

## How to report

State findings by severity, with the file and line. For each: what is wrong,
what an attacker could do, and the smallest fix. Separate **"fixed now"** from
**"needs a human decision"** — key rotation, git history rewriting and RLS
rollout are always the second kind.
