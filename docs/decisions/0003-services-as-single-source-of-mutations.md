# 0003. Mutations go through service functions

- **Status:** Accepted
- **Date:** 2026-06-08

## Context

Tasks can be mutated from several entry points: the task modal, inline edits,
bulk actions, the public-ish bulk route, templates, move, recurrence. If each
route reimplemented the logic, activity logging, notifications, and SSE events
would drift.

## Decision

Business logic lives in service functions (`lib/tasks.ts`: `createTask`,
`updateTask`, `spawnNextOccurrence`; `lib/hierarchy.ts`). Routes are thin: auth +
Zod validation + call the service. Services own:
- the field-diffing + activity-log entries (created, status_changed, renamed,
  priority_changed, due_changed, assignee_added/removed, moved…),
- side effects like recurrence spawn and `createNotifications`,
- the `publish()` SSE event.

## Alternatives considered

- Per-route logic — leads to inconsistent activity logs / missed notifications.

## Consequences

- New task behaviors should be added in the service so every caller benefits and
  the activity timeline stays complete. Integration tests target the services
  directly (`tests/tasks.integration.test.ts`).
