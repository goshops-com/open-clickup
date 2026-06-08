# 0001. Prisma 7 with the `pg` driver adapter

- **Status:** Accepted
- **Date:** 2026-06-08

## Context

Prisma 7 changed how the client connects and is configured versus most training
data. The schema's `datasource` block must **not** contain a `url`, and the
runtime client **requires** a driver adapter — the old `datasourceUrl`
constructor option does not exist.

## Decision

- Migration/CLI DB URL lives in `prisma.config.ts` (`datasource.url` ← `DATABASE_URL`).
- The runtime client uses `@prisma/adapter-pg`:
  `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })` (see `lib/db.ts`).
- Generated client output is `lib/generated/prisma/` (gitignored; run
  `pnpm prisma generate`).

## Alternatives considered

- The pre-7 `datasourceUrl` / `url`-in-schema setup — not valid in Prisma 7.

## Consequences

- After `prisma migrate dev` + `generate` you **must restart `pnpm dev`** or
  routes 500 on new models (stale client).
- The new `prisma-client` generator emits TS + a wasm query compiler; standalone
  Next output does not reliably trace it, which is why the Docker image copies the
  whole app rather than using `output: "standalone"` (see Dockerfile).
