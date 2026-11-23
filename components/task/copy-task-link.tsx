"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

export function useCopyTaskLink() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copyLink(listId: string, taskId: string, trigger: HTMLButtonElement | null) {
    triggerRef.current = trigger;
    const url = new URL(`/l/${encodeURIComponent(listId)}`, window.location.origin);
    url.searchParams.set("task", taskId);
    const link = url.href;
    clearTimeout(timer.current);
    setCopied(false);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 3000);
    } catch {
      setManualUrl(link);
    }
  }

  const feedback = (
    <>
      <div role="status" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center">
        {copied && (
          <span className="rounded-lg border border-cu-border bg-cu-panel px-3 py-2 text-[13px] text-cu-text shadow-lg">
            Task link copied
          </span>
        )}
      </div>
      <Dialog.Root open={manualUrl !== null} onOpenChange={(open) => { if (!open) setManualUrl(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-[60] w-[min(400px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-cu-border bg-cu-panel p-4 shadow-xl"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              triggerRef.current?.focus();
            }}
          >
            <Dialog.Title className="text-sm font-semibold text-cu-text">Copy task link</Dialog.Title>
            <Dialog.Description className="mt-1 text-[13px] text-cu-text-secondary">
              Your browser didn’t copy the link automatically. You can copy it from the field below.
            </Dialog.Description>
            <input
              aria-label="Task link"
              readOnly
              value={manualUrl ?? ""}
              onFocus={(event) => event.currentTarget.select()}
              className="mt-3 w-full rounded-md border border-cu-border bg-cu-bg px-2.5 py-1.5 text-[13px] text-cu-text focus:border-cu-purple focus:outline-none"
            />
            <div className="mt-3 flex justify-end">
              <Dialog.Close className="rounded-md px-3 py-1.5 text-[13px] text-cu-text-secondary hover:bg-cu-hover">Done</Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );

  return { copyLink, feedback };
}
