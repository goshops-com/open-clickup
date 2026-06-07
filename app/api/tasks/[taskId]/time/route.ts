import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { userSelect } from "@/lib/queries";
import { ApiError, readJson, route } from "@/lib/api-helpers";
import { publish } from "@/lib/events";

type Ctx = { params: Promise<{ taskId: string }> };

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("stop") }),
  z.object({
    action: z.literal("log"),
    durationSeconds: z.number().int().positive(),
    description: z.string().trim().max(500).optional(),
  }),
]);

export const POST = route(async (req, { params }: Ctx) => {
  const { taskId } = await params;
  const user = await requireUser();
  const input = await readJson(req, schema);

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { listId: true } });
  if (!task) throw new ApiError(404, "Task not found");

  if (input.action === "start") {
    // one running timer per user — stop any other running entry first
    const running = await prisma.timeEntry.findFirst({
      where: { userId: user.id, endedAt: null },
    });
    if (running) {
      const elapsed = Math.max(0, Math.round((Date.now() - running.startedAt.getTime()) / 1000));
      await prisma.timeEntry.update({
        where: { id: running.id },
        data: { endedAt: new Date(), duration: elapsed },
      });
    }
    const entry = await prisma.timeEntry.create({
      data: { taskId, userId: user.id },
      include: { user: { select: userSelect } },
    });
    publish({ type: "list", listId: task.listId });
    return NextResponse.json(entry, { status: 201 });
  }

  if (input.action === "stop") {
    const running = await prisma.timeEntry.findFirst({
      where: { taskId, userId: user.id, endedAt: null },
    });
    if (!running) throw new ApiError(400, "No running timer for this task");
    const elapsed = Math.max(0, Math.round((Date.now() - running.startedAt.getTime()) / 1000));
    const entry = await prisma.timeEntry.update({
      where: { id: running.id },
      data: { endedAt: new Date(), duration: elapsed },
      include: { user: { select: userSelect } },
    });
    publish({ type: "list", listId: task.listId });
    return NextResponse.json(entry);
  }

  // manual log
  const now = new Date();
  const entry = await prisma.timeEntry.create({
    data: {
      taskId,
      userId: user.id,
      duration: input.durationSeconds,
      description: input.description,
      startedAt: new Date(now.getTime() - input.durationSeconds * 1000),
      endedAt: now,
    },
    include: { user: { select: userSelect } },
  });
  publish({ type: "list", listId: task.listId });
  return NextResponse.json(entry, { status: 201 });
});
