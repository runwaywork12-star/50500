# 50500.shop — storefront + secure API server in one container.
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# 1) catalog → JSON (server seeds prices from it)  2) type-check the server
# 3) build the storefront  4) bundle the server
RUN npx esbuild scripts/export-catalog.ts --bundle --platform=node --format=esm --outfile=/tmp/export-catalog.mjs --log-level=warning \
 && node /tmp/export-catalog.mjs \
 && npx tsc -p server \
 && npm run build \
 && npx esbuild server/index.ts --bundle --platform=node --format=esm --target=node22 \
      --outfile=server-dist/index.mjs --external:sharp --log-level=warning \
      "--banner:js=import{createRequire as __cr}from'module';const require=__cr(import.meta.url);" \
 && npm prune --omit=dev --no-audit --no-fund

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    STATIC_DIR=/app/dist
WORKDIR /app

# Run as an unprivileged user.
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/server-dist ./server-dist
USER app

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=4s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server-dist/index.mjs"]
