# 0002. Client-safe enum barrel (`lib/enums`)

- **Status:** Accepted
- **Date:** 2026-06-08

## Context

Importing enum **values** from `@/lib/generated/prisma/client` into a client
component pulls the entire Prisma runtime into the browser bundle, which breaks
the Turbopack build.

## Decision

- Client components import enum **values** from `@/lib/enums` (a standalone
  re-export of the generated `enums.ts`, no runtime dependency).
- Types may still be imported from `lib/queries` with `import type`.

## Alternatives considered

- Importing from the generated client directly — causes the bundle/build error.
- Hand-maintaining duplicate enum constants — drifts from the schema.

## Consequences

- One rule to remember (and it's in CLAUDE.md): **values from `lib/enums`, types
  via `import type`**. New enums should be re-exported through `lib/enums`.
