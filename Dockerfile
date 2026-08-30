FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite compiles these public browser values into the JavaScript bundle.
# Never pass a service-role key or any other secret as a build argument.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_MAP_TILE_URL

RUN set -eu; \
    : "${VITE_SUPABASE_URL:?VITE_SUPABASE_URL build argument is required}"; \
    : "${VITE_SUPABASE_PUBLISHABLE_KEY:?VITE_SUPABASE_PUBLISHABLE_KEY build argument is required}"; \
    if [ -z "${VITE_MAP_TILE_URL:-}" ]; then unset VITE_MAP_TILE_URL; fi; \
    npm run build

FROM nginx:1.28-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
