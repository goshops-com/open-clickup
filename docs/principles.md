# Engineering principles (the constitution)

These are the rules of the road. They exist so any agent can make changes that
fit the codebase and don't regress it. When in doubt, follow the existing code —
it already embodies most of this.

## 1. Verify before you commit

A change isn't done until you've proven it works:

- `npx tsc --noEmit` is clean (dev/Turbopack does **not** typecheck — this is the
  only way to catch type errors).
- You exercised the actual behavior: `curl` the API route (happy path **and** an
  auth/permission failure), or drive the UI in a browser and look at it.
- For pure logic, add/extend a unit test; for core mutations, an integration test
  (see `tests/tasks.integration.test.ts`).

Report outcomes honestly. "Tests pass" must mean you ran them.

## 2. Keep `main` green — and check that it is

- Lint stays at **0 errors** (warnings are tolerated; don't add new error-level
  rules casually). Unit + e2e tests pass. Prod `pnpm build` compiles.
- **After every push, run `gh run list`** and confirm CI went green. CI silently
  stayed red for several pushes once because nobody checked — don't repeat that.

## 3. Respect "this is not the Next.js you know"

Read `node_modules/next/dist/docs/` for the relevant API before using it. Heed
deprecations (the `middleware`→`proxy` rename is already applied). Don't assume
training-data Next.js behavior.

## 4. Types are the source of truth

- Prisma generates types; `lib/queries.ts` exports the include-shapes and payload
  types that **both** the API and client import. Add new shapes there, don't
  hand-write parallel interfaces.
- **Never import enum *values* from `@/lib/generated/prisma/client` in client
  components** — it drags the Prisma runtime into the bundle (Turbopack build
  error). Use `@/lib/enums` for values; `import type` from `lib/queries` for types.

## 5. Security is part of the feature

- Every mutating route calls `requireRole(...)` from `lib/permissions.ts`
  (or `requireUser()` for read/self routes). Default to `MEMBER` for writes;
  `ADMIN` for space/workspace management. Guests are read-only.
- Validate every request body with Zod via `readJson(req, schema)`.
- Never leak `passwordHash`; never trust the client for authorization.

## 6. Match the established patterns

- **Data fetching/mutations:** TanStack Query hooks in `lib/hooks.ts`, with
  optimistic updates where it improves feel. `apiGet`/`apiSend` from `lib/api.ts`.
- **Server mutations:** the services in `lib/tasks.ts` / `lib/hierarchy.ts` — put
  business logic there so every entry point (UI, bulk, API) shares it and emits
  the same activity-log + SSE events.
- **Realtime:** after a mutation, `publish({type:"list", listId})` (or
  `"bootstrap"`); the client invalidates via `useRealtime`.
- **Styling:** Tailwind 4 with the `--cu-*` design tokens (see `app/globals.css`),
  exposed as `cu-*` colors. Don't hard-code hex unless a token is genuinely
  missing (and prefer adding a token).
- **Icons:** `lucide-react@1.x` renamed many icons — check before importing
  (see CLAUDE.md's gotcha list).

## 7. Schema changes are a ritual

When you touch `prisma/schema.prisma`:
`pnpm prisma migrate dev --name <x>` → `pnpm prisma generate` → **restart the dev
server** (a stale Prisma client 500s on new models). Then code against it.

## 8. Don't silently degrade UX or scale

- Keep interactions optimistic and live.
- If you cap/scope something for performance (e.g. render caps), say so in the UI
  and in an ADR — don't let "covered everything" be a lie.

## 9. Leave a trail

Record decisions (`docs/decisions/`), gotchas (CLAUDE.md), roadmap (issues), and
product changes (README/vision). See [workflow.md](workflow.md) for exactly where.

## 10. Don't manufacture churn

When the product is healthy and there's no genuinely valuable change to make,
**don't invent busywork**. A no-op health check is a fine outcome. Prefer one real
improvement (or none) over many cosmetic ones.
