"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/workspace-context";

export default function Home() {
  const { workspace } = useWorkspace();
  const router = useRouter();

  // first available list across spaces / folders
  const firstList =
    workspace.spaces.flatMap((s) => [
      ...s.lists,
      ...s.folders.flatMap((f) => f.lists),
    ])[0] ?? null;

  useEffect(() => {
    if (firstList) router.replace(`/l/${firstList.id}`);
  }, [firstList, router]);

  return (
    <div className="flex h-full items-center justify-center text-sm text-cu-text-secondary">
      {firstList ? "Opening…" : "No lists yet. Create one to get started."}
    </div>
  );
}
