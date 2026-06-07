"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

const GROUPS: { title: string; items: { keys: string[]; label: string }[] }[] = [
  {
    title: "General",
    items: [
      { keys: ["⌘", "K"], label: "Search tasks & lists" },
      { keys: ["/"], label: "Search tasks & lists" },
      { keys: ["?"], label: "Show keyboard shortcuts" },
      { keys: ["Esc"], label: "Close dialog / modal" },
    ],
  },
  {
    title: "Tasks",
    items: [{ keys: ["C"], label: "Create a task in the current list" }],
  },
];

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[22px] items-center justify-center rounded border border-cu-border bg-cu-hover px-1.5 py-0.5 text-[11px] font-medium text-cu-text-secondary">
      {children}
    </kbd>
  );
}

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(460px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-cu-panel shadow-2xl outline-none">
          <div className="flex items-center justify-between border-b border-cu-border px-4 py-3">
            <Dialog.Title className="text-[14px] font-semibold text-cu-text">Keyboard shortcuts</Dialog.Title>
            <Dialog.Close className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="space-y-5 px-4 py-4">
            {GROUPS.map((g) => (
              <div key={g.title}>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">
                  {g.title}
                </div>
                <div className="space-y-1.5">
                  {g.items.map((item) => (
                    <div key={item.label + item.keys.join()} className="flex items-center justify-between">
                      <span className="text-[13px] text-cu-text">{item.label}</span>
                      <span className="flex items-center gap-1">
                        {item.keys.map((k) => (
                          <Key key={k}>{k}</Key>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
