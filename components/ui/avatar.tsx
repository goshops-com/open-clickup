"use client";

import { cn, initials } from "@/lib/utils";
import type { UserLite } from "@/lib/queries";

const SIZES = {
  xs: "h-4 w-4 text-[8px]",
  sm: "h-5 w-5 text-[9px]",
  md: "h-6 w-6 text-[10px]",
  lg: "h-8 w-8 text-[11px]",
  xl: "h-10 w-10 text-sm",
};

export function Avatar({
  user,
  size = "md",
  className,
  ring,
}: {
  user: Pick<UserLite, "name" | "color" | "avatarUrl">;
  size?: keyof typeof SIZES;
  className?: string;
  ring?: boolean;
}) {
  return (
    <span
      title={user.name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none",
        SIZES[size],
        ring && "ring-2 ring-white",
        className,
      )}
      style={{ backgroundColor: user.color }}
    >
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt={user.name} className="h-full w-full rounded-full object-cover" />
      ) : (
        initials(user.name)
      )}
    </span>
  );
}

export function AvatarStack({
  users,
  size = "md",
  max = 4,
}: {
  users: Pick<UserLite, "id" | "name" | "color" | "avatarUrl">[];
  size?: keyof typeof SIZES;
  max?: number;
}) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((u) => (
        <Avatar key={u.id} user={u} size={size} ring />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-gray-200 font-semibold text-cu-text-secondary ring-2 ring-white",
            SIZES[size],
          )}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

/** Dashed empty assignee slot (ClickUp "assign" affordance). */
export function AssigneePlaceholder({ size = "md" }: { size?: keyof typeof SIZES }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-cu-border-strong text-cu-text-tertiary",
        SIZES[size],
      )}
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5.5 20a6.5 6.5 0 0 1 13 0" strokeLinecap="round" />
      </svg>
    </span>
  );
}
