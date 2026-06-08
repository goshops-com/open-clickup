"use client";

import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { Ellipsis, BookmarkPlus, Check } from "lucide-react";
import { useSaveTemplate } from "@/lib/hooks";

export function TaskMenu({ taskId, defaultName }: { taskId: string; defaultName: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [saved, setSaved] = useState(false);
  const save = useSaveTemplate();

  function submit() {
    if (!name.trim()) return;
    save.mutate(
      { fromTaskId: taskId, name: name.trim() },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => {
            setOpen(false);
            setSaved(false);
          }, 900);
        },
      },
    );
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="rounded p-1.5 text-cu-text-tertiary hover:bg-cu-hover" title="More">
            <Ellipsis className="h-4 w-4" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            sideOffset={6}
            align="end"
            className="z-50 min-w-[180px] rounded-lg border border-cu-border bg-cu-panel p-1 shadow-lg"
          >
            <DropdownMenu.Item
              onSelect={() => {
                setName(defaultName);
                setOpen(true);
              }}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] outline-none hover:bg-cu-hover focus:bg-cu-hover"
            >
              <BookmarkPlus className="h-4 w-4" /> Save as template
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[min(380px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-cu-panel p-4 shadow-2xl outline-none">
            <Dialog.Title className="text-[14px] font-semibold text-cu-text">Save as template</Dialog.Title>
            <p className="mt-1 text-[12px] text-cu-text-tertiary">
              Captures the title, description, priority, and checklists.
            </p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Template name"
              className="mt-3 w-full rounded-md border border-cu-border bg-cu-bg px-2.5 py-1.5 text-[13px] outline-none focus:border-cu-purple"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Dialog.Close className="rounded-md px-3 py-1.5 text-[13px] text-cu-text-secondary hover:bg-cu-hover">
                Cancel
              </Dialog.Close>
              <button
                onClick={submit}
                disabled={!name.trim() || save.isPending}
                className="flex items-center gap-1 rounded-md bg-cu-purple px-3 py-1.5 text-[13px] font-medium text-white hover:bg-cu-purple-dark disabled:opacity-40"
              >
                {saved ? (
                  <>
                    <Check className="h-4 w-4" /> Saved
                  </>
                ) : (
                  "Save template"
                )}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
