"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, Plus, Tag as TagIcon } from "lucide-react";
import { useTags, useCreateTag } from "@/lib/hooks";
import { TagChip } from "@/components/ui/primitives";

export function TagControl({
  spaceId,
  selected,
  onChange,
}: {
  spaceId: string;
  selected: { tagId: string; tag: { name: string; color: string } }[];
  onChange: (tagIds: string[]) => void;
}) {
  const { data: tags = [] } = useTags(spaceId);
  const createTag = useCreateTag(spaceId);
  const [query, setQuery] = useState("");

  const selectedIds = new Set(selected.map((s) => s.tagId));
  const filtered = tags.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));
  const exactMatch = tags.some((t) => t.name.toLowerCase() === query.trim().toLowerCase());

  function toggle(tagId: string) {
    const next = new Set(selectedIds);
    if (next.has(tagId)) next.delete(tagId);
    else next.add(tagId);
    onChange([...next]);
  }

  async function create() {
    const name = query.trim();
    if (!name) return;
    const tag = await createTag.mutateAsync(name);
    onChange([...selectedIds, tag.id]);
    setQuery("");
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="flex flex-wrap items-center gap-1 rounded outline-none" onClick={(e) => e.stopPropagation()}>
          {selected.length ? (
            selected.map((s) => <TagChip key={s.tagId} name={s.tag.name} color={s.tag.color} />)
          ) : (
            <span className="flex items-center gap-1 text-[13px] text-cu-text-tertiary hover:text-cu-text-secondary">
              <Plus className="h-3.5 w-3.5" /> Add tag
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align="start"
          className="z-50 w-[240px] rounded-lg border border-cu-border bg-cu-panel p-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 border-b border-cu-border px-2 pb-1.5 pt-1">
            <TagIcon className="h-3.5 w-3.5 text-cu-text-tertiary" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim() && !exactMatch) create();
              }}
              placeholder="Search or create…"
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-cu-text-tertiary"
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto py-1">
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] hover:bg-cu-hover"
              >
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="flex-1 truncate">{t.name}</span>
                {selectedIds.has(t.id) && <Check className="h-3.5 w-3.5 text-cu-purple" />}
              </button>
            ))}
            {query.trim() && !exactMatch && (
              <button
                onClick={create}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] text-cu-purple hover:bg-cu-hover"
              >
                <Plus className="h-3.5 w-3.5" /> Create &ldquo;{query.trim()}&rdquo;
              </button>
            )}
            {!filtered.length && !query.trim() && (
              <div className="px-2 py-2 text-[12px] text-cu-text-tertiary">No tags yet.</div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
