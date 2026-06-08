import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { userSelect } from "@/lib/queries";
import { ApiError, readJson, route } from "@/lib/api-helpers";
import { publish } from "@/lib/events";

type Ctx = { params: Promise<{ commentId: string }> };
// editing the body is author-only; resolving a thread is allowed for any member
const schema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty").optional(),
  resolved: z.boolean().optional(),
});

async function load(commentId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { task: { select: { listId: true } } },
  });
  if (!comment) throw new ApiError(404, "Comment not found");
  return comment;
}

export const PATCH = route(async (req, { params }: Ctx) => {
  const { commentId } = await params;
  const { user } = await requireRole("MEMBER");
  const { body, resolved } = await readJson(req, schema);
  const existing = await load(commentId);

  if (body !== undefined && existing.userId !== user.id) {
    throw new ApiError(403, "You can only edit your own comments");
  }

  const data: Record<string, unknown> = {};
  if (body !== undefined) data.body = body;
  if (resolved !== undefined) data.resolved = resolved;

  const comment = await prisma.comment.update({
    where: { id: commentId },
    data,
    include: { user: { select: userSelect }, reactions: true },
  });
  publish({ type: "list", listId: existing.task.listId });
  return NextResponse.json(comment);
});

export const DELETE = route(async (_req, { params }: Ctx) => {
  const { commentId } = await params;
  const { user } = await requireRole("MEMBER");
  const existing = await load(commentId);
  if (existing.userId !== user.id) throw new ApiError(403, "You can only delete your own comments");

  await prisma.comment.delete({ where: { id: commentId } });
  publish({ type: "list", listId: existing.task.listId });
  return NextResponse.json({ ok: true });
});
