# syntax=docker/dockerfile:1
# Production image for Open ClickUp (Next.js 16 + Prisma 7 + Postgres).

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# --- install dependencies (cached on lockfile) ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# pnpm 10 gates dependency build scripts behind an interactive approval; in a
# non-interactive build we skip them, then explicitly rebuild the few we need
# (Prisma engines for migrate, esbuild for the tsx-based seed script).
RUN pnpm install --frozen-lockfile --ignore-scripts \
  && pnpm rebuild @prisma/engines prisma esbuild

# --- build the app ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# generate the Prisma client (output is gitignored) then build.
# a dummy DATABASE_URL satisfies imports; no DB is touched at build time.
RUN pnpm prisma generate \
  && DATABASE_URL="postgresql://build:build@localhost:5432/build" NEXT_TELEMETRY_DISABLED=1 pnpm build

# --- runtime ---
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# full app (incl. node_modules with the pnpm symlink farm intact, .next, prisma, generated client)
COPY --from=build /app ./
EXPOSE 3000
# apply migrations then start the server
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start"]
