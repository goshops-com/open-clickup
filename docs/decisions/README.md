# Architecture Decision Records (ADRs)

This is where we write down **why** non-obvious technical choices were made, so a
future agent doesn't re-litigate them or accidentally undo a deliberate trade-off.

## When to write one

Write an ADR when you:
- choose one approach over a viable alternative for a non-trivial reason,
- deliberately *not* do something (e.g. "we did NOT use X because…"),
- adopt a convention others must follow,
- or change a previous decision (supersede the old ADR).

If a future contributor might look at the code and think "why is it like this?" —
that's an ADR.

## How

1. Copy `0000-template.md` to `NNNN-short-title.md` (next number).
2. Fill it in; keep it short (a screenful).
3. Link it from this index. Set status `Accepted` (or `Proposed`).
4. To reverse a decision, add a new ADR with status `Accepted` and mark the old
   one `Superseded by NNNN`.

## Index

| # | Title | Status |
|---|---|---|
| [0001](0001-prisma7-driver-adapter.md) | Prisma 7 with the `pg` driver adapter | Accepted |
| [0002](0002-client-safe-enum-barrel.md) | Client-safe enum barrel (`lib/enums`) | Accepted |
| [0003](0003-services-as-single-source-of-mutations.md) | Mutations go through service functions | Accepted |
| [0004](0004-in-process-sse-realtime.md) | Real-time via in-process SSE pub/sub | Accepted |
| [0005](0005-render-cap-over-virtualization.md) | Render caps instead of list virtualization | Accepted |
| [0006](0006-rbac-single-workspace.md) | Single-workspace RBAC via `requireRole` | Accepted |
| [0007](0007-no-ai-features.md) | No AI features | Accepted |
