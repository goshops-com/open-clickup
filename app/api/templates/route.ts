import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { ApiError, readJson, route } from "@/lib/api-helpers";

// GET — list templates for the current workspace
export const GET = route(async () => {
  const { workspaceId } = await requireRole("MEMBER");
  const templates = await prisma.taskTemplate.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(templates);
});

const schema = z.object({
  fromTaskId: z.string().min(1),
  name: z.string().trim().min(1, "Template name is required"),
});

// POST — snapshot an existing task into a reusable template
export const POST = route(async (req) => {
  const { workspaceId } = await requireRole("MEMBER");
  const { fromTaskId, name } = await readJson(req, schema);

  const task = await prisma.task.findUnique({
    where: { id: fromTaskId },
    include: { checklists: { orderBy: { position: "asc" }, include: { items: { orderBy: { position: "asc" } } } } },
  });
  if (!task) throw new ApiError(404, "Source task not found");

  const checklists = task.checklists.map((c) => ({
    name: c.name,
    items: c.items.map((i) => i.name),
  }));

  const template = await prisma.taskTemplate.create({
    data: {
      workspaceId,
      name,
      taskName: task.name,
      description: task.description,
      priority: task.priority,
      checklists,
    },
  });
  return NextResponse.json(template, { status: 201 });
});
