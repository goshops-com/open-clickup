"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Camera } from "lucide-react";
import { apiSend } from "@/lib/api";
import { initials } from "@/lib/utils";
import { useWorkspace } from "@/components/workspace-context";

export function ProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentUser } = useWorkspace();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(currentUser.name);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["bootstrap"] });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/me/avatar", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Upload failed");
    },
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: (e: Error) => setError(e.message),
  });

  const saveName = useMutation({
    mutationFn: (n: string) => apiSend("/api/me/profile", "PATCH", { name: n }),
    onSuccess: () => {
      refresh();
      onClose();
    },
  });

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(380px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-cu-panel shadow-2xl outline-none">
          <div className="flex items-center justify-between border-b border-cu-border px-4 py-3">
            <Dialog.Title className="text-[14px] font-semibold text-cu-text">My profile</Dialog.Title>
            <Dialog.Close className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="flex flex-col items-center gap-4 px-4 py-5">
            <button
              onClick={() => fileRef.current?.click()}
              className="group relative h-20 w-20 overflow-hidden rounded-full"
              style={{ backgroundColor: currentUser.color }}
              title="Change photo"
            >
              {currentUser.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentUser.avatarUrl} alt={currentUser.name} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white">
                  {initials(currentUser.name)}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar.mutate(f);
                  e.target.value = "";
                }}
              />
            </button>
            {uploadAvatar.isPending && <span className="text-[12px] text-cu-text-tertiary">Uploading…</span>}

            <div className="w-full">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">
                Display name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) saveName.mutate(name.trim());
                }}
                className="w-full rounded-md border border-cu-border bg-cu-bg px-2.5 py-1.5 text-[13px] outline-none focus:border-cu-purple"
              />
            </div>

            {error && <p className="self-start text-[12px] text-cu-urgent">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 border-t border-cu-border px-4 py-3">
            <button onClick={onClose} className="rounded-md px-3 py-1.5 text-[13px] text-cu-text-secondary hover:bg-cu-hover">
              Cancel
            </button>
            <button
              onClick={() => name.trim() && saveName.mutate(name.trim())}
              disabled={!name.trim() || saveName.isPending}
              className="rounded-md bg-cu-purple px-3 py-1.5 text-[13px] font-medium text-white hover:bg-cu-purple-dark disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
