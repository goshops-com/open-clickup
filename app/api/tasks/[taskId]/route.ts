import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { updateTask } from "@/lib/tasks";
import { getTaskDetail } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import { readJson, route, ApiError } from "@/lib/api-helpers";
import { publish } from "@/lib/events";

type Ctx = { params: Promise<{ taskId: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().nullish(),
  statusId: z.string().optional(),
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]).nullish(),
  position: z.number().optional(),
  startDate: z.string().datetime().nullish(),
  dueDate: z.string().datetime().nullish(),
  timeEstimate: z.number().int().nullish(),
  archived: z.boolean().optional(),
  assigneeIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
});

export const GET = route(async (_req, { params }: Ctx) => {
  const { taskId } = await params;
  const task = await getTaskDetail(taskId);
  if (!task) throw new ApiError(404, "Task not found");
  return NextResponse.json(task);
});

export const PATCH = route(async (req, { params }: Ctx) => {
  const { taskId } = await params;
  const patch = await readJson(req, patchSchema);
  const user = await requireUser();
  const task = await updateTask(taskId, patch, user.id);
  return NextResponse.json(task);
});

export const DELETE = route(async (_req, { params }: Ctx) => {
  const { taskId } = await params;
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { listId: true } });
  await prisma.task.delete({ where: { id: taskId } });
  if (task) publish({ type: "list", listId: task.listId });
  return NextResponse.json({ ok: true });
});
