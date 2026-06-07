import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, route } from "@/lib/api-helpers";
import { publish } from "@/lib/events";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route(async (_req, { params }: Ctx) => {
  const { id } = await params;
  await requireUser();

  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: { task: { select: { listId: true } } },
  });
  if (!attachment) throw new ApiError(404, "Attachment not found");

  await prisma.attachment.delete({ where: { id } });

  // best-effort local file cleanup (only for files we stored under /uploads)
  if (attachment.url.startsWith("/uploads/")) {
    const fileName = attachment.url.replace("/uploads/", "");
    const filePath = path.join(process.cwd(), "public", "uploads", fileName);
    await unlink(filePath).catch(() => {});
  }

  publish({ type: "list", listId: attachment.task.listId });
  return NextResponse.json({ ok: true });
});
