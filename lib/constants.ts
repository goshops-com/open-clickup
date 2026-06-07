import { Priority, ViewType } from "@/lib/enums";

export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; color: string; order: number }
> = {
  URGENT: { label: "Urgent", color: "#f50000", order: 0 },
  HIGH: { label: "High", color: "#ffcc00", order: 1 },
  NORMAL: { label: "Normal", color: "#6fa1ff", order: 2 },
  LOW: { label: "Low", color: "#b5bcc9", order: 3 },
};

export const PRIORITY_ORDER: Priority[] = ["URGENT", "HIGH", "NORMAL", "LOW"];

export const VIEW_META: Record<ViewType, { label: string; icon: string }> = {
  LIST: { label: "List", icon: "list" },
  BOARD: { label: "Board", icon: "columns" },
  CALENDAR: { label: "Calendar", icon: "calendar" },
  GANTT: { label: "Gantt", icon: "gantt" },
  TABLE: { label: "Table", icon: "table" },
};

// ClickUp-style preset list/space colors
export const SPACE_COLORS = [
  "#7b68ee", "#fd71af", "#ff5722", "#ff7800", "#f9d900",
  "#2ecd6f", "#1bbc9c", "#0ab1e8", "#3d8df5", "#9b59b6",
];
