"use client";

import { useEffect, useState } from "react";
import { PanelLeft } from "lucide-react";
import { useBootstrap, useRealtime } from "@/lib/hooks";
import { WorkspaceProvider } from "@/components/workspace-context";
import { Sidebar } from "@/components/sidebar/sidebar";
import { CommandPalette } from "@/components/command-palette";
import { ShortcutsHelp } from "@/components/shortcuts-help";

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data, isLoading, error } = useBootstrap();
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  useRealtime();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // ⌘K / Ctrl+K — search (works even while typing)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      // single-key shortcuts: skip when typing or holding a modifier
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((o) => !o);
      } else if (e.key === "/") {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        window.dispatchEvent(new Event("create-task"));
      }
    }
    function onOpen() { setPaletteOpen(true); }
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, []);

  if (isLoading) return <BootSkeleton />;
  if (error || !data)
    return (
      <div className="flex h-full items-center justify-center text-sm text-cu-text-secondary">
        Failed to load workspace. Is the database seeded? (`pnpm db:seed`)
      </div>
    );

  return (
    <WorkspaceProvider data={data}>
      <div className="flex h-full w-full overflow-hidden">
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute left-2 top-2 z-20 rounded p-1.5 text-cu-text-secondary hover:bg-cu-hover-strong"
            title="Open sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        ) : (
          <Sidebar onCollapse={() => setCollapsed(true)} />
        )}
        <main className="flex min-w-0 flex-1 flex-col bg-cu-bg">{children}</main>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      </div>
    </WorkspaceProvider>
  );
}

function BootSkeleton() {
  return (
    <div className="flex h-full w-full">
      <div className="w-[260px] shrink-0 space-y-3 border-r border-cu-border bg-cu-sidebar p-3">
        <div className="h-7 w-40 animate-pulse rounded bg-cu-hover-strong" />
        <div className="h-8 w-full animate-pulse rounded bg-cu-hover" />
        <div className="space-y-2 pt-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-6 w-full animate-pulse rounded bg-cu-hover" />
          ))}
        </div>
      </div>
      <div className="flex-1 space-y-3 p-6">
        <div className="h-8 w-64 animate-pulse rounded bg-cu-hover" />
        <div className="space-y-2 pt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 w-full animate-pulse rounded bg-cu-hover" />
          ))}
        </div>
      </div>
    </div>
  );
}
