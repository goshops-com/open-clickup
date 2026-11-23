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

export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function deescapeFormula(value: string): string {
  if (value.startsWith("'")) {
    const rest = value.slice(1);
    if (/^(?:\s*[=+\-@＝＋－＠]|[\t\r\n])/.test(rest)) return rest;
  }
  return value;
}

/**
 * Parse RFC 4180 CSV (quoted fields, doubled quotes).
 * Returns rows as string[][], empty string for empty cells, strips BOM.
 * Does NOT trim spaces inside unquoted fields — caller decides.
 */
export function parseCsv(input: string): string[][] {
  const text = stripBom(input);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        field += c;
        i++;
        continue;
      }
    } else {
      if (c === '"') {
        // start of quoted field when field is empty, otherwise treat as literal
        // (tolerant: allow quote mid-field at start)
        if (field === "") {
          inQuotes = true;
          i++;
          continue;
        } else {
          field += c;
          i++;
          continue;
        }
      }
      if (c === ",") {
        row.push(field);
        field = "";
        i++;
        continue;
      }
      if (c === "\r") {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i++;
        if (text[i] === "\n") i++;
        continue;
      }
      if (c === "\n") {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i++;
        continue;
      }
      field += c;
      i++;
    }
  }

  // trailing field/row
  if (inQuotes) {
    // unclosed quote — treat remainder as field
    row.push(field);
    rows.push(row);
  } else if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Remove completely empty trailing rows (e.g. final newline produces no row now, but guard)
  while (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "" ) {
    // Only trim if the file ended with an extra newline after our logic? Actually encode always ends with \r\n,
    // which creates a last row? Our loop already handles \r\n as row terminator, no extra empty row.
    // Keep single empty rows that are intentional? For safety, only pop one trailing empty row.
    const last = rows[rows.length - 1];
    if (rows.length > 1 && last.length === 1 && last[0] === "") {
      rows.pop();
      break;
    }
    break;
  }

  return rows;
}

export type ParsedCsv = {
  header: string[];
  rows: string[][];
};

/** Parse CSV and split into header + data rows, de-escaping spreadsheet formula markers. */
export function parseCsvWithHeader(input: string): ParsedCsv {
  const raw = parseCsv(input);
  if (raw.length === 0) return { header: [], rows: [] };
  const header = raw[0].map((h) => deescapeFormula(h).trim());
  const rows = raw.slice(1).map((r) => r.map((c) => deescapeFormula(c)));
  return { header, rows };
}

export { deescapeFormula };

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
