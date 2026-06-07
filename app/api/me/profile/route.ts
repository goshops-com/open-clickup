import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { readJson, route } from "@/lib/api-helpers";
import { publish } from "@/lib/events";

const schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const PATCH = route(async (req) => {
  const user = await requireUser();
  const body = await readJson(req, schema);
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.color !== undefined) data.color = body.color;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: { id: true, name: true, color: true, avatarUrl: true },
  });
  publish({ type: "bootstrap" });
  return NextResponse.json(updated);
});
