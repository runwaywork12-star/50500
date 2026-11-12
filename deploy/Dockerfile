# ---------- stage 1: build the storefront ----------
FROM node:20-alpine AS web
WORKDIR /web
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- stage 2: minimal production runtime ----------
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
RUN apk add --no-cache vips-dev curl tini \
 && addgroup -S app && adduser -S app -G app
WORKDIR /app

COPY server/package.json ./server/package.json
RUN cd server && npm install --omit=dev && npm cache clean --force

COPY server ./server
COPY --from=web /web/dist ./dist

RUN mkdir -p /data/uploads && chown -R app:app /data /app
USER app
ENV PORT=8080 STATIC_DIR=/app/dist STORAGE_DIR=/data/uploads
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/api/health || exit 1
ENTRYPOINT ["/sbin/tini","--"]
CMD ["sh","-c","node server/src/migrate.mjs && node server/src/index.mjs"]
