# ── Stage 1: Build frontend ────────────────────────────────────────────────────
FROM node:20-alpine AS build-frontend
WORKDIR /app
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build
# Output lands in /app/dist (vite.config.js: outDir: "../dist")


# ── Stage 2: Runtime ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Build tools required to compile better-sqlite3 native bindings
RUN apk add --no-cache python3 make g++

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Remove build tools to keep the image lean
RUN apk del python3 make g++

COPY server/ ./server/
COPY --from=build-frontend /app/dist ./dist

ENV DB_PATH=/data/habits.db
ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "server/index.js"]
