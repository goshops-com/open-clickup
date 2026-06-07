"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import { Avatar, AvatarStack, AssigneePlaceholder } from "@/components/ui/avatar";
import { useWorkspace } from "@/components/workspace-context";
import type { UserLite } from "@/lib/queries";

export function AssigneeControl({
  assignees,
  onChange,
  size = "md",
  label = "Assignees",
}: {
  assignees: UserLite[];
  onChange: (userIds: string[]) => void;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const { workspace } = useWorkspace();
  const members = workspace.members.map((m) => m.user);
  const selected = new Set(assignees.map((a) => a.id));

  function toggle(userId: string) {
    const next = new Set(selected);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    onChange([...next]);
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex items-center rounded outline-none hover:opacity-90"
          title={label}
        >
          {assignees.length ? (
            <AvatarStack users={assignees} size={size} />
          ) : (
            <AssigneePlaceholder size={size} />
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          align="start"
          className="z-50 max-h-[320px] min-w-[240px] overflow-y-auto rounded-lg border border-cu-border bg-cu-panel p-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">
            {label}
          </div>
          {members.map((u) => (
            <DropdownMenu.Item
              key={u.id}
              onSelect={(e) => {
                e.preventDefault();
                toggle(u.id);
              }}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] outline-none hover:bg-cu-hover focus:bg-cu-hover"
            >
              <Avatar user={u} size="md" />
              <span>{u.name}</span>
              {selected.has(u.id) && <Check className="ml-auto h-4 w-4 text-cu-purple" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
