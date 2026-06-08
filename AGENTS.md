# AGENTS.md — start here

You're an AI agent (or human) about to work on **Open ClickUp**. This file is the
entrypoint to the project's guidance. Read it fully, then follow the links to the
deeper docs before making changes.

> This file is imported into `CLAUDE.md`, so it is loaded into context every
> session. Keep it tight; put depth in `docs/`.

## What this is

An open-source, self-hostable **ClickUp clone for project/task management** —
feature parity for *management* (no AI features), with a UX intended to match
ClickUp closely. Next.js 16 + React 19 + Prisma 7 + Postgres. MIT-licensed.

→ Product vision, scope, and non-negotiables: **[docs/vision.md](docs/vision.md)**

## ⚠️ This is NOT the Next.js you know

<!-- BEGIN:nextjs-agent-rules -->
This Next.js version has breaking changes — APIs, conventions, and file structure
may differ from your training data. **Read the relevant guide in
`node_modules/next/dist/docs/` before writing any code.** Heed deprecation
notices (e.g. the `middleware`→`proxy` rename already done in this repo).
<!-- END:nextjs-agent-rules -->

## Prime directives (the short version)

1. **Verify before you commit.** Typecheck, and exercise the change for real
   (curl the route, drive the UI with the browser). Don't claim something works
   on faith.
2. **Keep `main` green.** After every push, check CI (`gh run list`). Lint must
   stay at 0 errors; unit + e2e must pass.
3. **Match the surrounding code.** Reuse the established patterns (hooks,
   services, primitives) and the `--cu-*` design tokens. Read neighbors first.
4. **Security is not optional.** Every mutating route requires auth + the right
   role (`requireRole`). Guests are read-only.
5. **Leave the docs better than you found them.** Record decisions and progress
   where they belong (see below).

→ The full engineering constitution: **[docs/principles.md](docs/principles.md)**

## How to work

- **Pick work** from the roadmap: GitHub Issues labeled `roadmap`
  (`gh issue list --label roadmap`).
- **Build a feature end-to-end** following the recipe in
  **[docs/workflow.md](docs/workflow.md)** (schema → migrate → regenerate →
  restart dev → service → route+RBAC → hook → UI → test → verify → commit).
- **Architecture, commands, data model, and the running list of gotchas** live in
  **[CLAUDE.md](CLAUDE.md)** — that's the canonical engineering reference.

## Where to auto-document (important)

| What | Where |
|---|---|
| **Why** a non-obvious technical choice was made | a new ADR in **[docs/decisions/](docs/decisions/)** |
| A new gotcha / convention / "don't do X" | **[CLAUDE.md](CLAUDE.md)** conventions section |
| Future feature ideas / planned work | **GitHub Issues** (`roadmap` label) |
| Product direction / scope changes | **[docs/vision.md](docs/vision.md)** |
| User-facing features & setup | **[README.md](README.md)** |

If you make a decision a future agent would otherwise re-litigate or accidentally
undo (e.g. "we deliberately chose X over Y"), **write an ADR**. That's the single
most valuable thing you can leave behind.
