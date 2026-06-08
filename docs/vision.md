# Product vision

## One line

**Open ClickUp** is an open-source, self-hostable project-management app that
gives teams the ClickUp *management* experience they already know — without
per-seat pricing, lock-in, or AI gimmicks.

## Who it's for

- Teams that want ClickUp-style task management but need to **own their data**
  (self-host on their own Postgres).
- Developers who want a **clean, modern, fully-typed codebase** to extend or
  embed.

## What "done right" means here

The north star is **familiarity**: someone who uses ClickUp should feel at home
immediately. When a design question comes up, the default answer is *"what does
ClickUp do?"* — match its layout, interactions, and terminology unless there's a
strong reason not to.

## Scope

**In scope** — the management surface:
- Hierarchy: Workspace → Space → Folder → List → Task → Subtask
- Tasks: statuses, priorities, assignees, dates, tags, custom fields,
  checklists, dependencies, time tracking, attachments, recurring, templates
- Views: List, Board, Calendar, Gantt, Table (each interactive)
- Collaboration: comments (threaded, reactions, resolve, @mentions), watchers,
  an Inbox with notifications, a per-task activity timeline
- Productivity: filter/sort/group, ⌘K, bulk actions, dark mode, "My Work" home
- Run-in-production basics: auth + sessions, RBAC, validated API, Docker,
  health check, tests + CI

**Explicitly out of scope (for now)**
- **No AI features.** This was a founding constraint and remains one. Don't add
  "AI assist", summarization, etc.
- Not trying to clone billing, enterprise SSO/SCIM admin, or ClickApps breadth on
  day one — those live on the roadmap (GitHub Issues), prioritized deliberately.

## Non-negotiables

1. **Self-hostable with one Postgres.** No required third-party services. Optional
   integrations (Redis, S3, email) must degrade gracefully to a single-box default.
2. **UX fidelity to ClickUp.** Identical-feeling interactions over novel ones.
3. **Production-grade defaults.** Auth, RBAC, validation, and security headers are
   part of "a feature works", not extras.
4. **MIT, no per-seat pricing.** It stays free to run for the whole team.
5. **Fully typed, no `any` creep.** Types flow from Prisma through `lib/queries.ts`
   to the client as the single source of truth.

## How we decide what's next

The roadmap is the set of GitHub Issues labeled `roadmap`. Prioritize by: does it
deepen ClickUp parity for management, does it help self-hosters, does it harden
production-readiness. Capture new ideas as issues rather than building them ad hoc.
