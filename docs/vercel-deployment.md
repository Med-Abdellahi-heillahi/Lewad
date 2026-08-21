# Lewad Vercel Deployment

**Status:** deployment preparation only. Nothing in this document changes the
database, Supabase remote settings, RLS, RPCs, or product logic. It records the
settings the owner must apply in the Vercel and Supabase dashboards.

**Related:** [`dev-log-2026-08-21.md`](./dev-log-2026-08-21.md) ·
[`db4-business-submissions.md`](./db4-business-submissions.md) ·
[`maps-ux-plan.md`](./maps-ux-plan.md) ·
[`migration-repair-command-plan.md`](./migration-repair-command-plan.md)

---

## Prerequisites

Before creating the Vercel project:

1. The checks pass from a clean checkout:

   ```sh
   npm ci
   npm test
   npx tsc --noEmit -p tsconfig.app.json
   npm run build
   ```

2. `git status --short` shows no unintended tracked secret. See
   [Git safety before the first push](#git-safety-before-the-first-push).
3. The Supabase project reference used by `VITE_SUPABASE_URL` is the intended
   one. Do not point a production deployment at a preview project by mistake.
4. **Blocking for `/add-business`:** confirm the remote application status of
   `20260821000003_db4_maps_location_support.sql` with
   `npx supabase migration list`. See
   [The maps migration gate](#the-maps-migration-gate).

---

## Required Vercel settings

| Setting | Value |
| --- | --- |
| Framework Preset | **Vite** |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Root Directory | *(repository root — leave empty)* |
| Node.js Version | 22.x or 24.x |

`npm run build` runs `tsc -b && vite build`, so a type error fails the
deployment before any artefact is produced. That is intentional — keep it.

Node: CI (`.github/workflows/ci.yml`) uses Node 24, and the installed Vite
requires Node ^20.19 || >=22.12. Vercel's default 22.x is fine; if the project
is ever pinned lower, raise it rather than downgrading the toolchain.

---

## Required environment variables

Add these in **Vercel Project → Settings → Environment Variables**, for the
Production, Preview, and Development environments:

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | **Yes** | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Yes** | The publishable / anon key only |
| `VITE_MAP_TILE_URL` | No | Omit entirely to use public OpenStreetMap tiles |

`src/lib/supabaseClient.ts` throws `Missing Supabase environment variables` at
module load when either required value is absent, so a misconfigured project
fails as a blank page rather than degrading quietly. Both variables are read at
**build** time, not at runtime: after changing either one you must **redeploy**,
not just restart.

### `VITE_MAP_TILE_URL` — do not set it blank

`src/components/map/MapLocationPicker.tsx` falls back to the public OSM tile
template with `??`. Vite loads a declared-but-empty variable as `""`, which is
not nullish, so the fallback does not fire and the map renders blank. Either
omit the variable completely or give it a full tile template.

### What must never be added to Vercel

Everything prefixed `VITE_` is inlined into the public JavaScript bundle. Never
add any of these to Vercel, or to any `.env` file in this repository:

```txt
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_SECRET_KEY
DATABASE_URL
POSTGRES_PASSWORD
JWT_SECRET
SMTP credentials
any private API key or client secret
```

Lewad's frontend never needs one. Money and permissions are decided server-side
by RPC and RLS; a service-role key in the browser would bypass every one of
those boundaries.

---

## Supabase Auth redirect URLs

Configure in **Supabase Dashboard → Authentication → URL Configuration** after
the first successful Vercel deploy:

```txt
Site URL:
https://YOUR-VERCEL-DOMAIN.vercel.app

Additional Redirect URLs:
https://YOUR-VERCEL-DOMAIN.vercel.app/**
```

If a custom domain is added later, add it alongside the Vercel domain:

```txt
https://YOUR-DOMAIN/**
```

Keep the local development origin in the redirect list too.

**Why the wildcard matters:** the password-reset email sends the user to
`${window.location.origin}/auth` (`src/lib/auth.ts:30`). Without
`https://YOUR-DOMAIN/**` in the allow list, Supabase rejects that redirect and
the reset link falls back to the Site URL instead of reaching the auth page.

Vercel preview deployments get a new generated hostname per deployment. Auth
flows on a preview URL will not work unless that exact hostname is added to the
redirect list. Treat previews as build checks, not as auth QA environments.

This section is instructions only — no Supabase remote setting was changed by
the task that wrote this document.

---

## SPA routing / `vercel.json`

`vercel.json` at the repository root:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```

**Why it is required.** Lewad routes on `window.location.pathname` in
`useRoute()` (`src/App.tsx`) — there is no server-rendered route table. Without
the rewrite, a direct visit or a browser refresh on any non-root path returns a
Vercel 404 before React ever boots. The rewrite makes the origin return
`index.html` for every path so the client router can resolve it.

Paths that must survive a hard refresh:

```txt
/auth   /app   /profile   /settings   /credits   /recharge   /add-business
/contact   /admin   /admin/profile   /admin/settings
/super-admin   /super-admin/profile   /super-admin/settings
/errors/<code>
```

Vercel checks the filesystem before applying `rewrites`, so real files
(`/manifest.webmanifest`, `/sw.js`, `/icons/*`, `/assets/*`) are still served
directly and are not swallowed by the catch-all.

**Expected side effect:** an unknown path now returns HTTP 200 with the app
shell, and the app renders its own 404 screen. That is normal SPA behaviour, not
a misconfiguration.

The rewrite is a routing fallback only. It grants no access: `/admin` and
`/super-admin` remain guarded client-side for UX, and RPC/RLS active-role checks
remain the real security boundary.

---

## PWA notes

- `public/manifest.webmanifest` uses `start_url: "/"` and `scope: "/"`, which
  match the deployed root. No change is needed for a Vercel domain.
- `public/sw.js` registers in production only
  (`src/lib/registerServiceWorker.ts` returns early unless `import.meta.env.PROD`),
  so the service worker becomes active for the first time on Vercel. Verify it
  there rather than assuming local behaviour.
- The worker returns early for every cross-origin request, so Supabase auth,
  admin, wallet, recharge, and search responses are never cached — and neither
  are map tiles. Do not add caching rules for those on the Vercel side.
- Only the app shell, the manifest, and `/assets/*` + `/icons/*` are cached.
- Vercel serves non-fingerprinted files such as `/sw.js` with revalidation, and
  browsers bypass the HTTP cache for the service-worker script itself, so a new
  deployment is picked up. No custom `headers` block is needed in `vercel.json`.
- After a deploy that changes the worker, a returning installed user may need
  one extra reload before the new shell activates.
- Never claim App Store or Play Store availability. Install remains
  `beforeinstallprompt` where offered, and Share → Add to Home Screen on iOS.

---

## Maps notes

- Leaflet and OpenStreetMap only. **No Google Maps API key and no Google Maps
  SDK.** There is nothing map-related to configure in Vercel.
- "Directions" opens an external
  `https://www.google.com/maps/dir/?api=1&destination=…` URL in a new tab. A URL
  is not an API integration; do not turn it into one.
- Leaflet is code-split and lazy-loaded. The production build confirms it:
  `leaflet-src`, `ServiceMapSheet`, and `MapLocationPicker` are separate chunks,
  so a landing visitor downloads no map code.
- Tiles come from `VITE_MAP_TILE_URL`, defaulting to public OpenStreetMap.
- OSM attribution must stay visible — it is a licensing requirement, not a
  design detail.
- Public OSM tiles suit development and a light V1. If production traffic grows,
  move to a dedicated tile provider (the OSM tile usage policy forbids heavy
  use) by setting `VITE_MAP_TILE_URL`. That is a configuration change, not a
  code change.
- The service worker must never cache map tiles. The cross-origin exclusion
  already covers this; do not add a tile caching rule.

---

## The maps migration gate

`/add-business` sends `p_latitude` and `p_longitude` to
`create_business_submission` (`src/lib/businessSubmissions.ts:325-326`). That
argument list only exists after
`20260821000003_db4_maps_location_support.sql`, which **drops and recreates**
the function with the coordinate parameters.

`20260821000002_db4_business_submissions.sql` (DB4 base) is applied remotely and
its history record is repaired. `20260821000003` is **not confirmed applied**.

**If it is not applied remotely, every business submission from the deployed
site fails**, because PostgREST cannot match the function signature the browser
calls. Search, maps on search results, auth, recharge, and admin review are
unaffected.

Confirm before announcing `/add-business` as live:

```sh
npx supabase migration list
```

Apply or repair it only with explicit owner approval and only under
[`migration-repair-command-plan.md`](./migration-repair-command-plan.md). Do not
run `db push` or `db reset`, and do not replay the historical `20260819000005`
duplicate.

---

## Post-deploy checklist

Run against the deployed Vercel URL, on a real phone where marked.

**Routing — each of these must load on a hard refresh, not only via in-app
navigation:**

```txt
open /
refresh /admin
refresh /super-admin
refresh /add-business
refresh /profile
refresh /settings
refresh /recharge
open an unknown path → app 404 screen, not a Vercel 404
```

**Roles and redirects:**

```txt
login user        → /app
login admin       → /admin
login super_admin → /super-admin
a normal user cannot reach /admin or /super-admin
logout returns to /
```

**Flows:**

```txt
profile avatar upload (JPEG/PNG, 2 MB limit)
/settings password-reset email → link lands on /auth
/recharge creates a pending request, then opens WhatsApp
/add-business submit with a map point → "pending review", never "approved"
/admin approve a business submission → establishment becomes searchable
/app search a service → credit debit is correct
/app "View on map" opens the Leaflet sheet
/app "Directions" opens Google Maps in a new tab
a result without coordinates shows the localized fallback, not a broken map
```

**Platform:**

```txt
PWA install prompt (Android) and Share → Add to Home Screen (iOS)
service worker registers, and a redeploy is picked up after a reload
FR / AR / EN, with Arabic in full RTL
dark and light mode
390px mobile with no horizontal overflow, and 1280px desktop
```

**Confirm from the browser network tab that no Supabase, auth, wallet,
recharge, search, or map-tile response is served from the service worker
cache.**

---

## Git safety before the first push

Nothing here is run automatically. The owner runs it and reviews the output.

```sh
git status --short
git ls-files '.env*'
git ls-files Supabase.docx
git ls-files .claude/settings.json
npm test
npx tsc --noEmit -p tsconfig.app.json
npm run build
git diff --check
```

Expected:

| Path | Expected state |
| --- | --- |
| `.env.example` | tracked, placeholders only |
| `.env`, `.env.local` | **never** tracked |
| `supabase/.temp/` | **never** tracked — it holds the pooler URL and project ref |
| `Supabase.docx` | not tracked, and ignored |
| `.claude/settings.json` | see below |
| `dist/` | not tracked |
| `vercel.json` | tracked |

`.claude/settings.json` is listed in `.gitignore`, but git ignores rules for
files it already tracks. To finish untracking it — without deleting it from
disk, and without committing:

```sh
git rm --cached .claude/settings.json
```

That stages a removal which the next commit applies. It is the owner's call: the
file is shared project permission config, so removing it from the repository
also removes it for anyone else working from this repository.

---

## What this deployment does not change

- No Supabase schema, migration, RLS policy, or RPC.
- No wallet, credit-ledger, recharge, search, or DB4 business logic.
- No payment gateway. Payment stays manual and admin-verified over WhatsApp;
  nothing in the product proves money arrived.
- No service-role key anywhere in the frontend.
