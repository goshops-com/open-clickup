import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { taskInclude } from "@/lib/queries";
import { ApiError, readJson, route } from "@/lib/api-helpers";
import { publish } from "@/lib/events";

type Ctx = { params: Promise<{ listId: string }> };
const schema = z.object({ templateId: z.string().min(1) });

type ChecklistSnap = { name: string; items: string[] };

export const POST = route(async (req, { params }: Ctx) => {
  const { listId } = await params;
  const { user } = await requireRole("MEMBER");
  const { templateId } = await readJson(req, schema);

  const template = await prisma.taskTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new ApiError(404, "Template not found");

  const firstStatus = await prisma.status.findFirst({ where: { listId }, orderBy: { position: "asc" } });
  if (!firstStatus) throw new ApiError(400, "List has no statuses");

  const last = await prisma.task.findFirst({
    where: { listId, parentId: null },
    orderBy: { position: "desc" },
  });

  const checklists = (template.checklists as ChecklistSnap[] | null) ?? [];

  const task = await prisma.task.create({
    data: {
      listId,
      statusId: firstStatus.id,
      name: template.taskName,
      description: template.description,
      priority: template.priority,
      position: (last?.position ?? 0) + 1000,
      createdById: user.id,
      checklists: {
        create: checklists.map((c, ci) => ({
          name: c.name,
          position: ci,
          items: { create: c.items.map((name, ii) => ({ name, position: ii })) },
        })),
      },
    },
    include: taskInclude,
  });

  await prisma.activity.create({
    data: { taskId: task.id, userId: user.id, type: "created", data: { fromTemplate: template.name } },
  });
  publish({ type: "list", listId });
  return NextResponse.json(task, { status: 201 });
});
