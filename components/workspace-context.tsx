"use client";

import { createContext, useContext } from "react";
import { useBootstrap, type Bootstrap } from "@/lib/hooks";

const Ctx = createContext<Bootstrap | null>(null);

export function WorkspaceProvider({
  data,
  children,
}: {
  data: Bootstrap;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useWorkspace() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return v;
}

/** Convenience hook that also exposes the loading/error state. */
export function useWorkspaceData() {
  return useBootstrap();
}

export type { Bootstrap };
