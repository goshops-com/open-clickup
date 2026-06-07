"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import * as Popover from "@radix-ui/react-popover";
import { SmilePlus } from "lucide-react";
import { apiSend } from "@/lib/api";

type Reaction = { id: string; userId: string; emoji: string };

const QUICK_EMOJIS = ["👍", "❤️", "😄", "🎉", "👀", "🚀", "✅", "🔥"];

export function CommentReactions({
  commentId,
  reactions,
  currentUserId,
  onChange,
}: {
  commentId: string;
  reactions: Reaction[];
  currentUserId: string;
  onChange: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const toggle = useMutation({
    mutationFn: (emoji: string) => apiSend(`/api/comments/${commentId}/reactions`, "POST", { emoji }),
    onSuccess: onChange,
  });

  // group by emoji
  const groups = new Map<string, { count: number; mine: boolean }>();
  for (const r of reactions) {
    const g = groups.get(r.emoji) ?? { count: 0, mine: false };
    g.count += 1;
    if (r.userId === currentUserId) g.mine = true;
    groups.set(r.emoji, g);
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {[...groups.entries()].map(([emoji, g]) => (
        <button
          key={emoji}
          onClick={() => toggle.mutate(emoji)}
          className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[12px] transition-colors ${
            g.mine
              ? "border-cu-purple bg-cu-purple-light text-cu-purple"
              : "border-cu-border bg-cu-hover text-cu-text-secondary hover:border-cu-border-strong"
          }`}
        >
          <span>{emoji}</span>
          <span className="tabular-nums">{g.count}</span>
        </button>
      ))}

      <Popover.Root open={pickerOpen} onOpenChange={setPickerOpen}>
        <Popover.Trigger asChild>
          <button
            className="flex h-6 w-6 items-center justify-center rounded-full text-cu-text-tertiary opacity-0 transition-opacity hover:bg-cu-hover hover:text-cu-text group-hover:opacity-100"
            title="Add reaction"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="top"
            align="start"
            sideOffset={4}
            className="z-50 flex gap-0.5 rounded-lg border border-cu-border bg-cu-panel p-1 shadow-lg"
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  toggle.mutate(emoji);
                  setPickerOpen(false);
                }}
                className="flex h-7 w-7 items-center justify-center rounded text-[15px] hover:bg-cu-hover"
              >
                {emoji}
              </button>
            ))}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
