import type { CustomFieldWithOptions, ListData } from "@/lib/queries";

type Cell = string | number | boolean | null;

export function encodeCsv(rows: Cell[][]): string {
  return rows.map((row) => row.map((cell) => {
    let text = String(cell ?? "");
    // CSV quoting alone does not stop spreadsheets from interpreting text as a formula.
    if (typeof cell === "string" && /^(?:\s*[=+\-@＝＋－＠]|[\t\r\n])/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  }).join(",")).join("\r\n") + "\r\n";
}

function fieldCell(field: CustomFieldWithOptions, value: unknown): Cell {
  if (value == null) return null;
  if (field.type === "DROPDOWN" || field.type === "LABELS") {
    const ids = new Set(Array.isArray(value) ? value : [value]);
    return field.options.filter((option) => ids.has(option.id)).map((option) => option.label).join("; ");
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return JSON.stringify(value) ?? null;
}

export function listCsv({ list, tasks }: Pick<ListData, "list" | "tasks">): string {
  const fields = list.customFields;
  const rows: Cell[][] = [["Task name", "Status", "Assignees", "Priority", "Start date", "Due date", ...fields.map((field) => `Custom: ${field.name}`)]];
  for (const task of tasks) {
    const values = new Map(task.customFieldValues.map((entry) => [entry.customFieldId, entry.value]));
    rows.push([
      task.name,
      task.status.name,
      task.assignees.map(({ user }) => user.email).join("; "),
      task.priority,
      task.startDate ? new Date(task.startDate).toISOString() : null,
      task.dueDate ? new Date(task.dueDate).toISOString() : null,
      ...fields.map((field) => fieldCell(field, values.get(field.id))),
    ]);
  }
  // UTF-8 BOM for spreadsheet apps that otherwise guess a legacy encoding.
  return `\uFEFF${encodeCsv(rows)}`;
}
