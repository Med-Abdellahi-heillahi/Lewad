# Lewad Docker Production Image

Docker is an optional static-hosting and local production-preview path for
Lewad. Vercel remains the primary deployment target and `vercel.json` remains
unchanged. This image contains only the built React/Vite frontend and nginx; it
does not add a backend or replace the managed Supabase project.

## Build

Run the build from the repository root with public, browser-safe values for the
two required Vite variables:

```sh
docker build \
  --build-arg VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY \
  -t lewad-frontend:prod .
```

The Dockerfile deliberately fails when either required argument is empty. To
use a dedicated map-tile provider, add a non-empty optional argument:

```sh
--build-arg 'VITE_MAP_TILE_URL=https://tiles.example/{z}/{x}/{y}.png'
```

Omit `VITE_MAP_TILE_URL` entirely to retain Lewad's OpenStreetMap fallback; do
not pass it as an empty string.

## Environment warning

Vite substitutes `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` during `npm run build`. They are part of the
public browser bundle, not runtime secrets. Changing them requires rebuilding
the image; passing them with `docker run -e` does not reconfigure an existing
image.

Never pass `SUPABASE_SERVICE_ROLE_KEY`, a database URL or password, a JWT
secret, or any other private credential to this build. `.dockerignore` excludes
local environment files, Supabase temporary state, dependencies, generated
output, logs, Git metadata, and local/private artefacts so `.env.local` cannot
be copied by `COPY . .`.

## Run

```sh
docker run --rm --name lewad-frontend -p 8080:80 lewad-frontend:prod
```

Open `http://localhost:8080`. The container health endpoint is
`http://localhost:8080/healthz`.

The nginx fallback serves `index.html` for client routes such as `/auth`,
`/app`, `/admin`, `/super-admin`, `/profile`, `/history`, `/add-business`, and
`/recharge`. Missing files below `/assets/` or `/icons/` return 404 instead of
the app shell.

## Static and PWA behavior

- `index.html` and `/sw.js` use `no-store` so a new app shell or service worker
  is discovered promptly.
- The manifest revalidates on every use.
- Fingerprinted Vite assets use a one-year immutable cache. Other public assets
  use a one-day cache with background revalidation.
- `/sw.js` is allowed to control the root scope. The existing worker still
  excludes all cross-origin traffic, including Supabase and map tiles.
- nginx sends `nosniff`, clickjacking, and strict referrer headers without a
  content-security policy that could break the current Supabase/PWA/map flows.

Public self-hosting must put the container behind an HTTPS reverse proxy or
load balancer. Browsers require a secure context for normal production service
worker and install behavior. TLS and Supabase Auth redirect configuration stay
operator responsibilities; see [Vercel Deployment](./vercel-deployment.md) for
the existing production checklist.

No Compose file is included because Lewad needs only this one stateless
frontend container; Supabase is external and must not be duplicated locally as
part of the production image.
