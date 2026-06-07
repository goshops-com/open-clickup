"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, List as ListIcon, CornerDownLeft } from "lucide-react";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";
import { StatusCircle } from "@/components/menus/status-control";
import type { StatusType } from "@/lib/enums";

type SearchResult = {
  tasks: {
    id: string;
    name: string;
    listId: string;
    status: { name: string; color: string; type: StatusType };
    list: { name: string };
  }[];
  lists: { id: string; name: string; color: string | null; space: { name: string } }[];
};

type Flat =
  | { kind: "task"; id: string; name: string; listId: string; sub: string; status: { color: string; type: StatusType } }
  | { kind: "list"; id: string; name: string; sub: string; color: string };

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 150);
    return () => clearTimeout(t);
  }, [q]);

  // reset when opened
  useEffect(() => {
    if (open) { setQ(""); setDebounced(""); setActive(0); }
  }, [open]);

  const { data } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => apiGet<SearchResult>(`/api/search?q=${encodeURIComponent(debounced)}`),
    enabled: open && debounced.length > 0,
  });

  const flat = useMemo<Flat[]>(() => {
    if (!data) return [];
    return [
      ...data.tasks.map((t) => ({
        kind: "task" as const,
        id: t.id,
        name: t.name,
        listId: t.listId,
        sub: t.list.name,
        status: { color: t.status.color, type: t.status.type },
      })),
      ...data.lists.map((l) => ({
        kind: "list" as const,
        id: l.id,
        name: l.name,
        sub: l.space.name,
        color: l.color ?? "#7b68ee",
      })),
    ];
  }, [data]);

  useEffect(() => { setActive(0); }, [flat.length]);

  function activate(item: Flat) {
    if (item.kind === "task") router.push(`/l/${item.listId}?task=${item.id}`);
    else router.push(`/l/${item.id}`);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && flat[active]) { e.preventDefault(); activate(flat[active]); }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content
          className="fixed left-1/2 top-[18%] z-50 w-[min(640px,92vw)] -translate-x-1/2 overflow-hidden rounded-xl border border-cu-border bg-cu-panel shadow-2xl outline-none"
          onKeyDown={onKeyDown}
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <div className="flex items-center gap-2.5 border-b border-cu-border px-4 py-3">
            <Search className="h-4 w-4 text-cu-text-tertiary" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tasks and lists…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-cu-text-tertiary"
            />
            <kbd className="rounded bg-cu-hover px-1.5 py-0.5 text-[10px] text-cu-text-tertiary">ESC</kbd>
          </div>

          <div ref={listRef} className="max-h-[400px] overflow-y-auto p-1.5">
            {debounced && flat.length === 0 && (
              <div className="px-3 py-8 text-center text-[13px] text-cu-text-tertiary">No results for “{debounced}”</div>
            )}
            {!debounced && (
              <div className="px-3 py-8 text-center text-[13px] text-cu-text-tertiary">
                Type to search tasks and lists across your workspace.
              </div>
            )}
            {flat.map((item, i) => (
              <button
                key={`${item.kind}-${item.id}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => activate(item)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left",
                  i === active ? "bg-cu-purple-light" : "hover:bg-cu-hover",
                )}
              >
                {item.kind === "task" ? (
                  <StatusCircle status={item.status} size={14} />
                ) : (
                  <ListIcon className="h-4 w-4" style={{ color: item.color }} />
                )}
                <span className="flex-1 truncate text-[13px] text-cu-text">{item.name}</span>
                <span className="truncate text-[11px] text-cu-text-tertiary">
                  {item.kind === "task" ? `in ${item.sub}` : item.sub}
                </span>
                {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-cu-text-tertiary" />}
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
