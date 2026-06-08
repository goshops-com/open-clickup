# 0006. Single-workspace RBAC via `requireRole`

- **Status:** Accepted
- **Date:** 2026-06-08

## Context

The app needs role-based permissions, but is currently single-workspace. Threading
a `workspaceId` through every route and resolving per-entity workspace ownership
would add a lot of plumbing for no current benefit.

## Decision

- `lib/permissions.ts` defines a role rank (`GUEST < MEMBER < ADMIN < OWNER`) and
  `requireRole(min)`, which resolves the current user's (single) workspace
  membership and throws 401/403 as appropriate.
- Policy: task & content writes require `MEMBER` (guests are read-only); space and
  workspace management require `ADMIN`. Reads require authentication.
- **Every mutating route** must call `requireRole(...)` (or `requireUser()` for
  self/read routes).

## Alternatives considered

- Full multi-workspace, per-entity authorization now — premature; more surface to
  get wrong.

## Consequences

- When multi-workspace lands, `requireRole` must take a `workspaceId` (resolved
  from the entity being mutated) — a contained change since all routes already go
  through this one helper.
- Don't add a write route without a role check (a past gap left several routes
  unauthenticated; all are now guarded — keep it that way).
