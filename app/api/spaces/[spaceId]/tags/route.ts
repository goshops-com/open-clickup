import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { readJson, route } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ spaceId: string }> };

const PALETTE = [
  "#3d8df5", "#2ecd6f", "#fd71af", "#f50000", "#ff5722",
  "#ff7800", "#f9d900", "#9b59b6", "#1bbc9c", "#0ab1e8",
];

const schema = z.object({
  name: z.string().trim().min(1, "name is required"),
  color: z.string().optional(),
});

export const GET = route(async (_req, { params }: Ctx) => {
  const { spaceId } = await params;
  const tags = await prisma.tag.findMany({ where: { spaceId }, orderBy: { name: "asc" } });
  return NextResponse.json(tags);
});

export const POST = route(async (req, { params }: Ctx) => {
  const { spaceId } = await params;
  await requireRole("MEMBER");
  const { name, color } = await readJson(req, schema);
  const count = await prisma.tag.count({ where: { spaceId } });
  const tag = await prisma.tag.upsert({
    where: { spaceId_name: { spaceId, name } },
    create: { spaceId, name, color: color ?? PALETTE[count % PALETTE.length] },
    update: {},
  });
  return NextResponse.json(tag, { status: 201 });
});
