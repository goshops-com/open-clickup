@AGENTS.md

# Open ClickUp — a ClickUp clone

Feature-parity clone of ClickUp's project/task management (no AI features). UX aims to be identical to ClickUp.

## Commands

```bash
docker compose up -d      # start Postgres (localhost:5544)
pnpm dev                  # dev server (Turbopack) on :3000
pnpm db:seed              # seed sample data (workspace, users, spaces, tasks…)
pnpm db:reset             # migrate reset + reseed
pnpm db:studio            # Prisma Studio
pnpm prisma migrate dev --name <x>   # new migration after schema edits
pnpm prisma generate      # regenerate client (output → lib/generated/prisma)
npx tsc --noEmit          # typecheck (dev/Turbopack does NOT typecheck)
```

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Prisma 7 + Postgres · @dnd-kit · Radix UI · TanStack Query · tiptap (rich text) · date-fns · lucide-react.

## Architecture

- **SPA-style**: all interactive UI is client components backed by REST Route Handlers in `app/api/**`. TanStack Query for fetching + optimistic updates. No server actions.
- **Routing**: route group `app/(app)/` — `layout.tsx` renders `<AppShell>` (sidebar + Cmd+K palette); `l/[listId]/page.tsx` renders the list with its view tabs. Task modal opens via `?task=<id>` (shareable URLs).
- **Data layer**: `lib/db.ts` (Prisma client w/ pg adapter), `lib/queries.ts` (shared include shapes + exported payload TYPES — single source of truth for API↔client), `lib/tasks.ts` / `lib/hierarchy.ts` (mutation services), `lib/hooks.ts` (all TanStack Query hooks), `lib/api.ts` (apiGet/apiSend).
- **Auth**: `lib/auth.ts` — current user via `cu_uid` cookie, falls back to workspace owner. Switch user via `/api/me` (sidebar footer `UserSwitcher`).
- **View state**: `lib/view-state.ts` (filters/sort/groupBy applied client-side in `list-page.tsx` via `applyViewState`), `lib/grouping.ts` (`groupTasks` for List view group-by).
- **Components**: `components/views/*` (list/board/calendar/gantt/table + filter-sort + custom-field controls), `components/menus/*` (status/priority/assignee/date/tag controls), `components/task/*` (modal, checklists), `components/status/*` (status manager), `components/sidebar/*`.

## Data model (prisma/schema.prisma)

Workspace → Space → Folder? → List → Task → Subtask(parentId). Per-List: Status (typed NOT_STARTED/ACTIVE/DONE/CLOSED), CustomField (+options/values), View. Task has assignees, tags (space-level), comments (threaded, rich HTML), checklists, activity, watchers. Positions are Floats (fractional indexing).

## Conventions & gotchas

- **Prisma 7**: NO `url` in schema datasource — it's in `prisma.config.ts`. Runtime client REQUIRES a driver adapter (`@prisma/adapter-pg`, see `lib/db.ts`). `datasourceUrl` constructor option does NOT exist.
- **Client bundle**: NEVER import enum VALUES from `@/lib/generated/prisma/client` in client components (pulls the whole Prisma runtime → Turbopack build error). Use `@/lib/enums` (re-exports the standalone generated `enums.ts`). Importing TYPES from `lib/queries` is fine (use `import type`).
- **lucide-react@1.x renamed icons**: Kanban (not Trello), ChartNoAxesGantt (not GanttChartSquare), List (not AlignJustify), Ellipsis (not MoreHorizontal), TextAlignStart (not AlignLeft), SquareCheckBig (not CheckSquare), House (not Home).
- **tiptap**: needs `immediatelyRender: false` for Next SSR (see `components/ui/rich-editor.tsx`).
- **Styling**: ClickUp design tokens are CSS vars in `app/globals.css` (`--cu-*`) exposed as Tailwind colors (`cu-purple`, `cu-sidebar`, etc.). Rich text uses the `.rich` class.
- Route handler params are async: `{ params }: { params: Promise<{ id: string }> }` then `await params`.
