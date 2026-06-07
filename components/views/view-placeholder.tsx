"use client";

export function ViewPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-cu-text-tertiary">
      <div className="text-sm font-medium">{label} view</div>
      <div className="text-xs">Coming up next in the build.</div>
    </div>
  );
}
