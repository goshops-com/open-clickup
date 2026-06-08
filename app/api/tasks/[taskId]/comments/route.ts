import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { userSelect } from "@/lib/queries";
import { readJson, route } from "@/lib/api-helpers";
import { extractMentionIds, createNotifications } from "@/lib/notifications";
import { publish } from "@/lib/events";

type Ctx = { params: Promise<{ taskId: string }> };
const schema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty"),
  parentId: z.string().nullish(),
});

export const POST = route(async (req, { params }: Ctx) => {
  const { taskId } = await params;
  const { body, parentId } = await readJson(req, schema);
  const { user } = await requireRole("MEMBER");
  const comment = await prisma.comment.create({
    data: { taskId, userId: user.id, body, parentId: parentId ?? null },
    include: { user: { select: userSelect }, reactions: true },
  });

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { listId: true } });
  if (task) publish({ type: "list", listId: task.listId });
  await prisma.activity.create({
    data: { taskId, userId: user.id, type: "commented", data: {} },
  });

  const mentioned = extractMentionIds(body);
  if (mentioned.length) {
    await createNotifications({
      recipientIds: mentioned,
      actorId: user.id,
      taskId,
      type: "mention",
      body: "mentioned you in a comment",
    });
  }
  return NextResponse.json(comment, { status: 201 });
});
