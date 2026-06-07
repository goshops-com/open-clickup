import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Stable initials from a display name. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Fractional-index helper for ordering between two positions. */
export function midpoint(a: number | null, b: number | null): number {
  if (a == null && b == null) return 1000;
  if (a == null) return (b as number) - 1000;
  if (b == null) return a + 1000;
  return (a + b) / 2;
}

const PALETTE = [
  "#7b68ee", "#fd71af", "#ff5722", "#ff7800", "#f9d900",
  "#2ecd6f", "#1bbc9c", "#0ab1e8", "#3d8df5", "#9b59b6",
  "#e65100", "#02c0d6", "#667684", "#e91e63", "#536cfe",
];

/** Deterministic color from an arbitrary string (for avatars / tags). */
export function colorFromString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}
