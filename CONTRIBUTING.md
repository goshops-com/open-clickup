# Contributing to Open ClickUp

Thanks for your interest! This is an open-source, educational ClickUp clone — contributions of all sizes are welcome.

## Setup

See [README.md → Getting started](README.md#-getting-started). TL;DR:

```bash
pnpm install
docker compose up -d
cp .env.example .env
pnpm prisma migrate dev && pnpm db:seed
pnpm dev
```

## Workflow

1. Fork & create a branch off `main` (`feat/...`, `fix/...`).
2. Make your change. Keep the style of the surrounding code.
3. Before pushing:
   - `npx tsc --noEmit` — must pass (Turbopack dev does **not** typecheck).
   - `pnpm lint`
   - `pnpm build` — should succeed.
4. Open a PR with a clear description and screenshots for UI changes.

## Conventions & gotchas

- **Prisma 7**: the runtime client needs the pg driver adapter (`lib/db.ts`); the DB URL lives in `prisma.config.ts`, not the schema.
- **Client bundle**: never import enum *values* from `@/lib/generated/prisma/client` in client components — use `@/lib/enums` (importing *types* is fine).
- **API routes**: wrap handlers in `route()` and validate bodies with `readJson(req, zodSchema)` from `lib/api-helpers.ts`.
- **Design tokens**: use the `--cu-*` CSS variables / `cu-*` Tailwind colors so dark mode keeps working (avoid hardcoded `bg-white`).

## Good first issues

The [roadmap](README.md#️-roadmap) lists planned features — real-time, tests, notifications, attachments, time tracking, dependencies, and role-permission enforcement are all great places to start.
