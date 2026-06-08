import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { userSelect } from "@/lib/queries";
import { ApiError, readJson, route } from "@/lib/api-helpers";
import { publish } from "@/lib/events";

type Ctx = { params: Promise<{ commentId: string }> };
const schema = z.object({ body: z.string().trim().min(1, "Comment cannot be empty") });

async function loadOwned(commentId: string, userId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { task: { select: { listId: true } } },
  });
  if (!comment) throw new ApiError(404, "Comment not found");
  if (comment.userId !== userId) throw new ApiError(403, "You can only modify your own comments");
  return comment;
}

export const PATCH = route(async (req, { params }: Ctx) => {
  const { commentId } = await params;
  const user = await requireUser();
  const { body } = await readJson(req, schema);
  const existing = await loadOwned(commentId, user.id);

  const comment = await prisma.comment.update({
    where: { id: commentId },
    data: { body },
    include: { user: { select: userSelect }, reactions: true },
  });
  publish({ type: "list", listId: existing.task.listId });
  return NextResponse.json(comment);
});

export const DELETE = route(async (_req, { params }: Ctx) => {
  const { commentId } = await params;
  const user = await requireUser();
  const existing = await loadOwned(commentId, user.id);

  await prisma.comment.delete({ where: { id: commentId } });
  publish({ type: "list", listId: existing.task.listId });
  return NextResponse.json({ ok: true });
});
