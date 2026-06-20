import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { readJson, route } from "@/lib/api-helpers";
import { taskInclude } from "@/lib/queries";

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

// ---------------------------------------------------------------------------
// GET — Export tasks to CSV
// ---------------------------------------------------------------------------

export const GET = route(async (req) => {
  const { user } = await requireRole("MEMBER");
  const { searchParams } = new URL(req.url);
  const listId = searchParams.get("listId");
  if (!listId) {
    return NextResponse.json({ error: "listId is required" }, { status: 400 });
  }

  const list = await prisma.list.findUnique({
    where: { id: listId },
    include: {
      statuses: { orderBy: { position: "asc" } },
      customFields: { orderBy: { position: "asc" } },
    },
  });

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  const tasks = await prisma.task.findMany({
    where: { listId, parentId: null, archived: false },
    orderBy: { position: "asc" },
    include: {
      ...taskInclude,
      customFieldValues: true,
    },
  });

  // Build header: name, status, priority, due_date, start_date, assignees, tags, custom fields...
  const headers = [
    "name",
    "status",
    "priority",
    "dueDate",
    "startDate",
    "assignees",
    "tags",
    ...list.customFields.map((cf) => `cf_${cf.name}`),
  ];

  const rows = tasks.map((task) => {
    const vals: string[] = [
      escapeCsv(task.name),
      escapeCsv(task.status.name),
      escapeCsv(task.priority ?? ""),
      escapeCsv(task.dueDate ? new Date(task.dueDate).toISOString() : ""),
      escapeCsv(task.startDate ? new Date(task.startDate).toISOString() : ""),
      escapeCsv(task.assignees.map((a) => a.user.name).join("; ")),
      escapeCsv(task.tags.map((t) => t.tag.name).join("; ")),
    ];

    // Custom field values
    for (const cf of list.customFields) {
      const found = task.customFieldValues.find((cv) => cv.customFieldId === cf.id);
      vals.push(escapeCsv(found?.value ?? ""));
    }

    return vals;
  });

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${list.name.replace(/[^a-zA-Z0-9]/g, "_")}.csv"`,
    },
  });
});

// ---------------------------------------------------------------------------
// POST — Import tasks from CSV
// ---------------------------------------------------------------------------

const importSchema = z.object({
  listId: z.string().min(1),
  csv: z.string(),
});

export const POST = route(async (req) => {
  const { user } = await requireRole("MEMBER");
  const body = await readJson(req, importSchema);
  const { listId, csv } = body;

  const list = await prisma.list.findUnique({
    where: { id: listId },
    include: {
      statuses: true,
      customFields: { include: { options: true } },
      space: { select: { id: true } },
    },
  });

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  const lines = csv.trim().split("\n");
  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV must have header + at least one row" }, { status: 400 });
  }

  const headers = parseCsvLine(lines[0]);
  const created: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 2) continue; // skip empty rows

    const getField = (idx: number) => cols[idx]?.trim() ?? "";
    const name = getField(0);
    if (!name) continue;

    // Resolve status
    const statusName = getField(1);
    let statusId = list.statuses[0]?.id ?? "";
    for (const s of list.statuses) {
      if (s.name.toLowerCase() === statusName.toLowerCase()) {
        statusId = s.id;
        break;
      }
    }

    // Resolve priority
    const priorityRaw = getField(2);
    const priorityMap: Record<string, string | null> = {
      urgent: "URGENT", high: "HIGH", normal: "NORMAL", low: "LOW",
    };
    const priority = priorityMap[priorityRaw.toLowerCase()] ?? null;

    // Resolve dates
    const dueDate = getField(3);
    const startDate = getField(4);

    // Resolve assignees
    const assigneeNames = getField(5).split(";").map((s) => s.trim()).filter(Boolean);

    // Resolve tags (space-level)
    const tagNames = getField(6).split(";").map((s) => s.trim()).filter(Boolean);

    // Build task input
    const taskInput: Record<string, unknown> = {
      listId,
      name,
      statusId,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      startDate: startDate ? new Date(startDate) : null,
    };

    // Create task
    const task = await prisma.task.create({
      data: taskInput as any,
      select: { id: true },
    });
    created.push(task.id);

    // Assign assignees
    if (assigneeNames.length > 0) {
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: user.workspaceId },
        include: { user: true },
      });
      const assigneeLinks = members
        .filter((m) => assigneeNames.some((n) => m.user.name.toLowerCase() === n.toLowerCase()))
        .map((m) => ({ taskId: task.id, userId: m.userId }));
      if (assigneeLinks.length > 0) {
        await prisma.taskAssignee.createMany({ data: assigneeLinks, skipDuplicates: true });
      }
    }

    // Create tags if needed (space-level)
    if (tagNames.length > 0) {
      const existingTags = await prisma.tag.findMany({
        where: { spaceId: list.space.id },
        select: { name: true, id: true },
      });
      for (const tagName of tagNames) {
        const existing = existingTags.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
        if (existing) {
          await prisma.taskTag.create({
            data: { taskId: task.id, tagId: existing.id },
          });
        } else {
          const tag = await prisma.tag.create({
            data: { name: tagName, spaceId: list.space.id },
            select: { id: true },
          });
          existingTags.push({ name: tagName, id: tag.id });
          await prisma.taskTag.create({
            data: { taskId: task.id, tagId: tag.id },
          });
        }
      }
    }

    // Set custom field values
    const cfStart = 7; // after name, status, priority, dueDate, startDate, assignees, tags
    for (let ci = 0; ci < list.customFields.length; ci++) {
      const val = getField(cfStart + ci);
      if (val) {
        await prisma.customFieldValue.create({
          data: {
            taskId: task.id,
            customFieldId: list.customFields[ci].id,
            value: val,
          },
        });
      }
    }
  }

  return NextResponse.json({ created: created.length, taskIds: created }, { status: 201 });
});
