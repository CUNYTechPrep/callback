# The web app's image. CI is the only place this gets built
# (docs/specs/deploy.md), so no contributor needs docker. The build context
# is the repo root, because the app depends on workspace packages:
#   docker build -f apps/web/Dockerfile .

# ---- build: every dependency, the Prisma client, the Next build ----
FROM node:24-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@11.17.0
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# The lockfile alone decides what gets downloaded, so a code-only change
# reuses this layer instead of fetching every package again.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch

COPY . .
RUN pnpm install --frozen-lockfile --offline
RUN pnpm prisma:generate && pnpm --filter @project/web build

# ---- run: same base (so Prisma's engine matches), no build tools, not root ----
# Also the same /app path: the Next build records where the Prisma client
# lives (apps/web/next.config.ts), so it has to be there at runtime too.
FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3000

# Migrate, then serve. Migrations run here, inside Azure, because the
# Postgres firewall admits Azure services and not GitHub's runners. A failed
# migration exits non-zero, the server never starts, the smoke test fails,
# and traffic stays on the old revision. `exec` hands signals to Next.
CMD ["sh", "-c", "cd apps/migrate && ./node_modules/.bin/tsx src/index.ts && cd ../web && exec ./node_modules/.bin/next start"]
