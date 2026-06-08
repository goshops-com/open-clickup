# 0004. Real-time via in-process SSE pub/sub

- **Status:** Accepted (with a known scaling limit)
- **Date:** 2026-06-08

## Context

We want collaborators to see changes live without polling, while keeping the
self-host story to "one Postgres, no extra services".

## Decision

- A tiny in-process pub/sub on `globalThis` (`lib/events.ts`: `publish` /
  `subscribe`) feeds an SSE endpoint (`app/api/stream`).
- Mutations call `publish({type:"list", listId})` or `{type:"bootstrap"}`; the
  client opens an `EventSource` in `useRealtime` and invalidates the relevant
  TanStack Query caches.

## Alternatives considered

- WebSockets — heavier; SSE is enough for one-way server→client invalidation.
- Redis/Postgres pub/sub now — would add a required dependency for the common
  single-instance case.

## Consequences

- Works great on a single instance. **Does not work across multiple instances**
  behind a load balancer (an event on instance A won't reach a client on B).
- Multi-instance support is roadmapped (swap the transport for Redis behind the
  same `publish`/`subscribe` API). See the `roadmap` issue.
