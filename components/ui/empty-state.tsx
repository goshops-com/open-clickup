"use client";

import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cu-hover text-cu-text-tertiary">
        {icon}
      </div>
      <div>
        <p className="text-[15px] font-semibold text-cu-text">{title}</p>
        {subtitle && <p className="mt-1 text-[13px] text-cu-text-tertiary">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
