import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-helpers";
import { parseCsvWithHeader, deescapeFormula } from "@/lib/list-csv";
import { StatusType, CustomFieldType } from "@/lib/enums";
import { publish } from "@/lib/events";

type ImportResult = {
  created: number;
  statusesCreated: number;
  tagsCreated: number;
  fieldsCreated: number;
  optionsCreated: number;
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function parsePriority(raw: string): "URGENT" | "HIGH" | "NORMAL" | "LOW" | null {
  const v = raw.trim().toUpperCase();
  if (v === "URGENT" || v === "HIGH" || v === "NORMAL" || v === "LOW") return v;
  return null;
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function splitMulti(raw: string): string[] {
  if (!raw) return [];
  // Export uses "; " but accept both ";" and "," and line breaks
  return raw
    .split(/[;\n]+/)
    .flatMap((part) => part.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseBool(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (["true", "1", "yes", "y", "checked"].includes(v)) return true;
  if (["false", "0", "no", "n", "unchecked"].includes(v)) return false;
  return null;
}

function statusTypeForName(name: string): StatusType {
  const low = name.toLowerCase();
  if (low.includes("done") || low.includes("complete") || low.includes("closed")) return StatusType.DONE;
  if (low === "to do" || low === "todo" || low.includes("not started")) return StatusType.NOT_STARTED;
  return StatusType.ACTIVE;
}

function colorFromStringFallback(s: string): string {
  // simple deterministic color fallback, matches existing util pattern maybe
  // use a small palette
  const palette = ["#87909e", "#5b9fff", "#a875ff", "#6bc950", "#ffcc00", "#ff7800", "#fd71af", "#2ecd6f"];
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

export async function importTasksFromCsv(opts: {
  listId: string;
  csvContent: string;
  actorId: string;
}): Promise<ImportResult> {
  const { listId, csvContent, actorId } = opts;
  if (!csvContent || csvContent.trim().length === 0) throw new ApiError(400, "CSV is empty");
  if (csvContent.length > 5 * 1024 * 1024) throw new ApiError(413, "CSV exceeds 5 MB limit");

  const list = await prisma.list.findUnique({
    where: { id: listId },
    include: {
      space: true,
      statuses: { orderBy: { position: "asc" } },
      customFields: { include: { options: { orderBy: { position: "asc" } } }, orderBy: { position: "asc" } },
    },
  });
  if (!list) throw new ApiError(404, "List not found");

  const workspaceId = list.space.workspaceId;
  const spaceId = list.spaceId;

  const parsed = parseCsvWithHeader(csvContent);
  const header = parsed.header;
  if (header.length === 0) throw new ApiError(400, "CSV header is missing");

  // Map indexes
  const findIdx = (names: string[]) => {
    const lowered = header.map((h) => h.toLowerCase());
    for (const n of names) {
      const idx = lowered.indexOf(n.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const taskNameIdx = findIdx(["task name", "name", "task"]);
  if (taskNameIdx === -1) throw new ApiError(400, "Missing required column: Task name");

  const statusIdx = findIdx(["status"]);
  const assigneesIdx = findIdx(["assignees", "assignee"]);
  const priorityIdx = findIdx(["priority"]);
  const startDateIdx = findIdx(["start date", "start"]);
  const dueDateIdx = findIdx(["due date", "due"]);
  const tagsIdx = findIdx(["tags", "tag"]);

  // custom fields: header starts with "custom:" prefix
  const customCols: { idx: number; fieldName: string }[] = [];
  header.forEach((h, i) => {
    const low = h.toLowerCase();
    if (low.startsWith("custom:")) {
      const name = h.slice(h.indexOf(":") + 1).trim();
      if (name) customCols.push({ idx: i, fieldName: name });
    }
  });

  type RowData = {
    name: string;
    statusName: string;
    assigneesRaw: string;
    priorityRaw: string;
    startRaw: string;
    dueRaw: string;
    tagsRaw: string;
    customs: Map<string, string>; // fieldName -> raw value
  };

  const rowsData: RowData[] = [];
  const uniqueStatuses = new Set<string>();
  const assigneeEmails = new Set<string>();
  const tagNames = new Set<string>();
  const customFieldNames = new Set<string>();

  for (const rawRow of parsed.rows) {
    // pad row to header length
    const row = [...rawRow];
    while (row.length < header.length) row.push("");
    // skip fully empty row
    if (row.every((c) => c.trim() === "")) continue;

    const get = (idx: number) => (idx >= 0 && idx < row.length ? row[idx] ?? "" : "");

    const nameRaw = get(taskNameIdx);
    const name = deescapeFormula(nameRaw).trim();
    if (!name) continue;

    const statusName = deescapeFormula(get(statusIdx)).trim();
    const assigneesRaw = deescapeFormula(get(assigneesIdx));
    const priorityRaw = deescapeFormula(get(priorityIdx)).trim();
    const startRaw = deescapeFormula(get(startDateIdx)).trim();
    const dueRaw = deescapeFormula(get(dueDateIdx)).trim();
    const tagsRaw = deescapeFormula(get(tagsIdx));

    const customs = new Map<string, string>();
    for (const { idx, fieldName } of customCols) {
      const v = deescapeFormula(get(idx));
      customs.set(fieldName, v);
      customFieldNames.add(fieldName);
    }

    if (statusName) uniqueStatuses.add(statusName);

    if (assigneesRaw) {
      for (const em of splitMulti(assigneesRaw)) {
        // basic email check
        if (em.includes("@")) assigneeEmails.add(em.toLowerCase());
      }
    }

    if (tagsRaw) {
      for (const tn of splitMulti(tagsRaw)) tagNames.add(tn);
    }

    // For dropdown/labels detection, we need to know field types later.
    // Collect raw custom values for later option creation — we do second pass after fetching fields.
    rowsData.push({ name, statusName, assigneesRaw, priorityRaw, startRaw, dueRaw, tagsRaw, customs });
  }

  if (rowsData.length === 0) throw new ApiError(400, "CSV contains no tasks");

  // Existing maps
  const statusMap = new Map<string, { id: string; type: StatusType; name: string }>();
  for (const s of list.statuses) statusMap.set(norm(s.name), { id: s.id, type: s.type as StatusType, name: s.name });

  let statusesCreated = 0;
  // Create missing statuses
  {
    const maxPos = list.statuses.length ? Math.max(...list.statuses.map((s) => s.position)) : 0;
    let nextPos = maxPos + 1000;
    for (const stName of uniqueStatuses) {
      if (!statusMap.has(norm(stName))) {
        const created = await prisma.status.create({
          data: {
            listId,
            name: stName,
            color: colorFromStringFallback(stName),
            type: statusTypeForName(stName),
            position: nextPos,
          },
        });
        nextPos += 1000;
        statusMap.set(norm(stName), { id: created.id, type: created.type as StatusType, name: created.name });
        statusesCreated++;
      }
    }
  }

  // Users: find by email (case-insensitive)
  const userMap = new Map<string, string>(); // email lower -> userId
  if (assigneeEmails.size) {
    const emails = [...assigneeEmails];
    // Prisma: findMany with email in list, case-insensitive can't do array mode easily, so fetch all matching lowercased?
    // We'll fetch where email in emails (exact) plus also lowercased variant via OR? Simpler: fetch all users whose email lowercased is in set? Use PostgreSQL lower? Do client filtering: fetch users where email in emails OR where we can query all members of workspace and filter.
    const users = await prisma.user.findMany({
      where: {
        email: { in: emails, mode: "insensitive" },
      },
      select: { id: true, email: true },
    });
    for (const u of users) userMap.set(u.email.toLowerCase(), u.id);

    // Also ensure they are members of workspace? Check membership — filter to workspace members.
    // For import, we only allow assignees who are members of the workspace. Fetch memberships.
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId, userId: { in: [...userMap.values()] } },
      select: { userId: true },
    });
    const memberSet = new Set(members.map((m) => m.userId));
    // Remove non-members from map
    for (const [em, uid] of [...userMap.entries()]) {
      if (!memberSet.has(uid)) userMap.delete(em);
    }
  }

  // Tags
  const tagMap = new Map<string, string>(); // name lower -> id
  const existingTags = await prisma.tag.findMany({ where: { spaceId }, select: { id: true, name: true } });
  for (const t of existingTags) tagMap.set(norm(t.name), t.id);
  let tagsCreated = 0;
  {
    for (const tn of tagNames) {
      if (!tagMap.has(norm(tn))) {
        const created = await prisma.tag.create({
          data: { spaceId, name: tn, color: colorFromStringFallback(tn) },
        });
        tagMap.set(norm(tn), created.id);
        tagsCreated++;
      }
    }
  }

  // Custom fields
  const fieldMap = new Map<string, (typeof list.customFields)[number]>(); // name lower -> field
  for (const f of list.customFields) fieldMap.set(norm(f.name), f);

  let fieldsCreated = 0;
  // Create missing custom fields as TEXT
  {
    const maxPos = list.customFields.length ? Math.max(...list.customFields.map((f) => f.position)) : 0;
    let nextPos = maxPos + 1000;
    for (const cfName of customFieldNames) {
      if (!fieldMap.has(norm(cfName))) {
        const created = await prisma.customField.create({
          data: {
            listId,
            name: cfName,
            type: CustomFieldType.TEXT,
            position: nextPos,
          },
          include: { options: true },
        });
        nextPos += 1000;
        fieldMap.set(norm(cfName), created as typeof list.customFields[number]);
        fieldsCreated++;
      }
    }
  }

  // For existing DROPDOWN/LABELS fields, ensure options exist for imported labels
  let optionsCreated = 0;
  {
    // collect needed labels per field
    const neededPerField = new Map<string, Set<string>>(); // fieldId -> labels
    for (const row of rowsData) {
      for (const [fieldName, rawVal] of row.customs.entries()) {
        const field = fieldMap.get(norm(fieldName));
        if (!field) continue;
        if (field.type !== CustomFieldType.DROPDOWN && field.type !== CustomFieldType.LABELS) continue;
        if (!rawVal.trim()) continue;
        const labels = field.type === CustomFieldType.LABELS ? splitMulti(rawVal) : [rawVal.trim()];
        if (labels.length === 0) continue;
        const key = field.id;
        if (!neededPerField.has(key)) neededPerField.set(key, new Set());
        const set = neededPerField.get(key)!;
        for (const lbl of labels) {
          if (lbl) set.add(lbl);
        }
      }
    }

    for (const [fieldId, labels] of neededPerField.entries()) {
      const field = [...fieldMap.values()].find((f) => f.id === fieldId);
      if (!field) continue;
      const existingLabelMap = new Map<string, string>();
      for (const opt of field.options) existingLabelMap.set(norm(opt.label), opt.id);
      const maxOptPos = field.options.length ? Math.max(...field.options.map((o) => o.position)) : 0;
      let nextOptPos = maxOptPos + 1000;
      for (const lbl of labels) {
        if (!existingLabelMap.has(norm(lbl))) {
          const created = await prisma.customFieldOption.create({
            data: { customFieldId: fieldId, label: lbl, color: colorFromStringFallback(lbl), position: nextOptPos },
          });
          nextOptPos += 1000;
          // update fieldMap entry options
          field.options.push(created);
          existingLabelMap.set(norm(lbl), created.id);
          optionsCreated++;
        }
      }
    }

    // For TEXT fields that were newly created, no options needed.
  }

  // Now create tasks
  // Determine starting position
  const lastTask = await prisma.task.findFirst({
    where: { listId, parentId: null },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  let nextPos = (lastTask?.position ?? 0) + 1000;

  // For fast lookup of option ids by label for each field
  const optionIdByFieldAndLabel = new Map<string, Map<string, string>>(); // fieldId -> (label lower -> optionId)
  for (const f of fieldMap.values()) {
    const m = new Map<string, string>();
    for (const opt of f.options) m.set(norm(opt.label), opt.id);
    optionIdByFieldAndLabel.set(f.id, m);
  }

  let created = 0;
  for (const row of rowsData) {
    const statusEntry = row.statusName ? statusMap.get(norm(row.statusName)) : undefined;
    const statusId = statusEntry?.id ?? list.statuses[0]?.id ?? [...statusMap.values()][0]?.id;
    if (!statusId) throw new ApiError(400, "List has no statuses");

    const priority = parsePriority(row.priorityRaw);
    const startDate = parseDate(row.startRaw);
    const dueDate = parseDate(row.dueRaw);

    const statusType = statusEntry?.type ?? (list.statuses.find((s) => s.id === statusId)?.type as StatusType | undefined);

    const assigneeIds: string[] = [];
    if (row.assigneesRaw) {
      for (const em of splitMulti(row.assigneesRaw)) {
        const uid = userMap.get(em.toLowerCase());
        if (uid) assigneeIds.push(uid);
      }
    }

    const tagIds: string[] = [];
    if (row.tagsRaw) {
      for (const tn of splitMulti(row.tagsRaw)) {
        const tid = tagMap.get(norm(tn));
        if (tid) tagIds.push(tid);
      }
    }

    // dedup
    const uniqAssignee = [...new Set(assigneeIds)];
    const uniqTags = [...new Set(tagIds)];

    const task = await prisma.task.create({
      data: {
        listId,
        statusId,
        name: row.name,
        priority: priority ?? undefined,
        position: nextPos,
        startDate,
        dueDate,
        completedAt: statusType === StatusType.DONE ? new Date() : null,
        createdById: actorId,
        assignees: uniqAssignee.length ? { create: uniqAssignee.map((userId) => ({ userId })) } : undefined,
        tags: uniqTags.length ? { create: uniqTags.map((tagId) => ({ tagId })) } : undefined,
      },
    });
    nextPos += 1000;

    // custom field values
    for (const [fieldName, rawVal] of row.customs.entries()) {
      if (!rawVal.trim()) continue;
      const field = fieldMap.get(norm(fieldName));
      if (!field) continue;
      let value: unknown = null;
      const trimmed = rawVal.trim();

      switch (field.type) {
        case CustomFieldType.DROPDOWN: {
          const map = optionIdByFieldAndLabel.get(field.id);
          const optId = map?.get(norm(trimmed));
          if (optId) value = optId;
          break;
        }
        case CustomFieldType.LABELS: {
          const labels = splitMulti(trimmed);
          const map = optionIdByFieldAndLabel.get(field.id);
          const ids = labels.map((l) => map?.get(norm(l))).filter(Boolean) as string[];
          if (ids.length) value = ids;
          break;
        }
        case CustomFieldType.NUMBER:
        case CustomFieldType.MONEY:
        case CustomFieldType.RATING:
        case CustomFieldType.PROGRESS: {
          const n = Number(trimmed);
          if (!Number.isNaN(n)) value = n;
          break;
        }
        case CustomFieldType.CHECKBOX: {
          const b = parseBool(trimmed);
          if (b !== null) value = b;
          break;
        }
        case CustomFieldType.DATE: {
          const d = parseDate(trimmed);
          if (d) value = d.toISOString();
          break;
        }
        default: {
          // TEXT, TEXTAREA, URL, EMAIL, PHONE etc: store as string
          value = trimmed;
        }
      }

      if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) continue;

      await prisma.customFieldValue.upsert({
        where: { taskId_customFieldId: { taskId: task.id, customFieldId: field.id } },
        create: { taskId: task.id, customFieldId: field.id, value: value as never },
        update: { value: value as never },
      });
    }

    await prisma.activity.create({
      data: { taskId: task.id, userId: actorId, type: "created", data: { source: "csv_import" } },
    });

    created++;
  }

  publish({ type: "list", listId });

  return { created, statusesCreated, tagsCreated, fieldsCreated, optionsCreated };
}
