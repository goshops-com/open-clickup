"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useNotifications, useMarkNotificationsRead, type NotificationItem } from "@/lib/hooks";
import { Avatar } from "@/components/ui/avatar";

export function InboxButton() {
  const router = useRouter();
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const [open, setOpen] = useState(false);

  const unread = data?.unread ?? 0;
  const items = data?.notifications ?? [];

  function openNotif(n: NotificationItem) {
    if (n.task) router.push(`/l/${n.task.listId}?task=${n.task.id}`);
    markRead.mutate([n.id]);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-cu-text hover:bg-cu-hover-strong">
          <Inbox className="h-4 w-4 text-cu-text-secondary" />
          <span>Inbox</span>
          {unread > 0 && (
            <span className="ml-auto rounded-full bg-cu-purple px-1.5 py-px text-[10px] font-semibold text-white">
              {unread}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="right"
          align="start"
          sideOffset={8}
          className="z-50 w-[340px] overflow-hidden rounded-lg border border-cu-border bg-cu-panel shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-cu-border px-3 py-2">
            <span className="text-[13px] font-semibold">Inbox</span>
            {unread > 0 && (
              <button onClick={() => markRead.mutate(undefined)} className="text-[11px] text-cu-purple hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {items.length === 0 && (
              <div className="px-3 py-10 text-center text-[13px] text-cu-text-tertiary">You&apos;re all caught up 🎉</div>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => openNotif(n)}
                className={cn(
                  "flex w-full items-start gap-2.5 border-b border-cu-border/60 px-3 py-2.5 text-left last:border-0 hover:bg-cu-hover",
                  !n.read && "bg-cu-purple-light/50",
                )}
              >
                {n.actor ? (
                  <Avatar user={n.actor} size="md" />
                ) : (
                  <span className="h-6 w-6 shrink-0 rounded-full bg-cu-hover-strong" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] leading-snug">
                    <span className="font-semibold">{n.actor?.name ?? "Someone"}</span> {n.body}
                  </div>
                  {n.task && <div className="truncate text-[12px] text-cu-text-secondary">{n.task.name}</div>}
                  <div className="mt-0.5 text-[11px] text-cu-text-tertiary">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </div>
                </div>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cu-purple" />}
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
