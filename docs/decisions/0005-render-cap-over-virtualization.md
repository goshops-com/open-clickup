# 0005. Render caps instead of list virtualization

- **Status:** Accepted (revisitable)
- **Date:** 2026-06-08

## Context

Large lists could render thousands of DOM nodes. True windowing
(`@tanstack/react-virtual`) is the textbook fix, but it interacts awkwardly with
dnd-kit drag-to-reorder and our grouping/inline-edit code.

## Decision

Cap rendering per group at `PAGE_SIZE = 50` with a "Show N more" button (List and
Table views). This keeps the DOM bounded without endangering drag/reorder,
grouping, or selection.

## Alternatives considered

- `@tanstack/react-virtual` — higher regression risk with dnd-kit; deferred.

## Consequences

- Good 80/20 for realistic list sizes; very large lists still page in chunks.
- The cap is visible to users ("Show N more") — not a silent truncation.
- True virtualization remains a roadmap item if/when very large lists matter.
