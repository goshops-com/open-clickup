import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { userSelect } from "@/lib/queries";
import { readJson, route } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ taskId: string }> };
const schema = z.object({ body: z.string().trim().min(1, "Comment cannot be empty") });

export const POST = route(async (req, { params }: Ctx) => {
  const { taskId } = await params;
  const { body } = await readJson(req, schema);
  const user = await requireUser();
  const comment = await prisma.comment.create({
    data: { taskId, userId: user.id, body },
    include: { user: { select: userSelect }, reactions: true },
  });
  await prisma.activity.create({
    data: { taskId, userId: user.id, type: "commented", data: {} },
  });
  return NextResponse.json(comment, { status: 201 });
});
