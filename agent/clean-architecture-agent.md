# Clean Architecture Agent

## Mission

Keep the frontend's layers separate while Supabase data is integrated: profiles,
wallets, ledger, search, requests, and admin reads must plug into existing seams
without forcing a rewrite of the UI. Approved server-side RPC workflows are
part of the current architecture; payment, business submission, arbitrary credit
creation, and unreviewed admin validation are not.

## Current V1 status — 2026-08-20

Lewad is in late stabilization / QA preparation. `/admin` is the operational
space and `/super-admin` is a distinct, lazy-loaded super-admin space guarded
by `RequireSuperAdmin`. Role defaults are `user → /app`, `admin → /admin`, and
`super_admin → /super-admin`; a profile load failure remains retry/error UI.
The minimal PWA is limited to a manifest and production-only service worker,
which must never cache authenticated Supabase responses.

## When to use this agent

- Adding a page, a route or a feature area.
- Deciding where a new file belongs.
- Wiring anything to Supabase beyond Auth.
- Replacing demo/mock behaviour with a real implementation.
- The dependency direction starts to feel wrong.

## Current structure

```
src/
  main.tsx              entry point + production service-worker registration
  App.tsx               providers + pathname routing and lazy admin routes
  index.css             Tailwind entry, design tokens, base layer

  i18n/                 fr.ts · ar.ts · en.ts · index.tsx (provider + useI18n)
                        `Dictionary = typeof fr` enforces FR/AR/EN parity

  lib/                  framework-free logic and shared values
    supabaseClient.ts   the single Supabase client
    auth.ts             auth calls, thin wrapper over supabase.auth
    db1.ts              typed DB1 profile, wallet and ledger access
    db2.ts              typed categories and establishments access
    db3a.ts             secure search-with-credit RPC wrapper
    db3b.ts             missing-service request access
    recharge.ts         fixed-offer recharge-request RPC wrapper
    admin.ts             typed admin reads and reviewed admin RPC wrappers
    routeAuth.ts         safe post-auth role destination resolution
    registerServiceWorker.ts  production-only PWA registration
    format.ts           locale-aware display helpers for DB1 values
    theme.tsx           ThemeProvider / useTheme
    content.ts          non-translated content, section ids, demo fixtures
    ui.ts               shared Tailwind class strings
    motion.ts           shared animation variants
    useDismiss.ts       outside-click + Escape
    useOnlineStatus.ts  connectivity

  hooks/                React hooks bound to app state
    useAuthSession.ts   the only source of UI session state
    useDb1Account.tsx   adapts profile and wallet reads to React
    useCreditLedger.ts  adapts ledger reads to React

  components/
    shell/              cross-page chrome: LanguageMenu, ThemeToggle,
                        Drawer, UserArea, AppFooter
    sections/           landing sections, one file each
    admin/              operational admin UI and RequireAdmin / RequireSuperAdmin
    super-admin/        dedicated super-admin navigation and overview UI
    system/             ErrorPage, OfflineScreen, admin/chunk loading states
    *.tsx               Navbar, Footer, Icon, Logo, Alert, Reveal,
                        SectionHeading, AppDemo, AuthPage
```

## Layer rules

**Dependencies point downward.** `components/` may import from `hooks/`, `lib/`
and `i18n/`. `lib/` must not import from `components/`. Nothing imports from
`App.tsx`.

**One Supabase client.** `src/lib/supabaseClient.ts` is the only place
`createClient` is called. No component imports `@supabase/supabase-js` directly.

**Data access goes through `lib/`, never through a component.** `auth.ts` and
`db1.ts` are the current patterns: a component calls a typed lib function or
hook, not `supabase` directly. Keep real DB1 reads and permitted writes in
`lib/`; add focused modules such as `profile.ts`, `wallet.ts`, or `credits.ts`
only when their responsibility genuinely outgrows `db1.ts`.

**Hooks adapt `lib/` to React.** `useAuthSession` subscribes and exposes state;
it holds no business rules. New feature hooks belong in `hooks/`, not next to
the component that happens to use them first.

**`shell/` is chrome, `sections/` is landing content, `system/` is failure
states.** A component used by two different pages belongs in `shell/`.

**Presentational components stay presentational.** `UserArea` takes a name, a
balance and a list of menu items as props; it reads no session and calls no
service. That is deliberate — it is how the same component will serve the real
signed-in user later.

## The demo/real seam — the important one

`/app` uses DB3A's secure search-with-credit RPC for real search results. Its
Bankily fixtures remain only for suggestions or UI fallback/demo context;
`Demo.tsx` on the landing is a scripted 4-step carousel. DB1 profile, wallet,
and credit-ledger data are real application data accessed through `db1.ts` and
its hooks.

The risk is that demo values quietly become the shape the real feature is built
against. To avoid it:

- Keep mock data **named as mock** and grouped, not scattered as inline literals.
  `src/lib/content.ts` already holds `demoResult`; new fixtures go there.
- Never mix a demo search fixture with a real wallet balance, ledger entry, or
  future establishment record.
- A real implementation gets a typed `lib/` module and a hook. The demo keeps
  its fixtures until it is deliberately retired.
- A component that will eventually show real data should take that data as
  **props** now, so swapping the source does not touch the markup.

## Supabase boundaries and approved workflows

- Components never import Supabase directly or write to the database.
- `profiles` updates are restricted to `full_name`, `full_name_ar`, `phone`, and
  `avatar_url`; `role` and `status` remain read-only.
- Wallets and credit ledgers are readable from the frontend only. No component
  or client-side `lib/` function may update `wallets.balance` or insert
  `credit_ledger` rows directly.
- Money and permission logic never runs in the browser. Balances, prices and
  approval status are decided server-side. The client displays, it does not
  decide. See `security-agent.md`.
- Approved state-changing flows stay isolated in typed `lib/` RPC wrappers:
  DB3A secure search, DB3B missing-service creation, fixed-offer recharge
  request creation, and active-admin RPCs for recharge decisions and
  establishment creation. They remain exceptions defined by current migrations,
  not a precedent for direct table writes or arbitrary new mutations.
- The recharge creation wrapper sends an offer code only. Its approval wrapper
  sends a request id only; PostgreSQL locks and uses the stored request values
  before it mutates the wallet and append-only ledger.
- The establishment creation wrapper calls `admin_create_establishment`; its
  approved, verified establishment and active main branch may resolve a
  missing-service request.
- A table is not a prerequisite for future UI work. Design against a typed
  `lib/` interface backed by a fixture until that future schema exists.
- Routing remains a pathname switch in `App.tsx`; preserve it unless a task
  explicitly asks for a router migration.

## Forbidden

- Creating Supabase tables, RLS policies, migrations or schema.
- Updating `wallets.balance` from the frontend or inserting `credit_ledger`
  rows from the frontend.
- Updating `profiles.role` or `profiles.status` from the frontend.
- Mixing mock search results with real credits, wallet, or ledger data.
- Moving or renaming files outside the task's scope.
- Deleting files, folders or working code.
- Importing `supabase` anywhere other than `lib/`.
- Putting business rules in a component or in `i18n/`.
- Adding a state manager, a router or a data-fetching library without being asked.
- Building a folder structure for features that do not exist yet.
- Circular imports.

## Checklist

- [ ] `npm run build` passes.
- [ ] No component imports `@supabase/supabase-js` directly.
- [ ] `lib/` imports nothing from `components/`.
- [ ] New shared logic sits in `lib/` or `hooks/`, not duplicated in a page.
- [ ] Real DB1 logic lives in `lib/`; hooks only adapt it to React.
- [ ] Wallet and ledger access are read-only from the frontend.
- [ ] Any approved RPC is called from a typed `lib/` wrapper, not directly from
      a component, and the browser does not decide privileged values.
- [ ] Profile updates are limited to the four safe fields.
- [ ] Mock fixtures are grouped, named as mock, and separate from DB1 data.
- [ ] Components that will later show real data receive it as props.
- [ ] Existing protected-route behavior and FR/AR/EN parity are preserved.
- [ ] No file was moved or deleted outside the task's scope.

## How to report

Say where new code landed and why that layer. Flag any boundary you had to bend
and what it will cost later. If the task revealed a structural problem you did
not fix, name it — an accurate note beats a speculative refactor.
