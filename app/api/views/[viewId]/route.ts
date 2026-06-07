import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJson, route } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ viewId: string }> };
const schema = z.object({
  config: z.any().optional(),
  name: z.string().trim().min(1).optional(),
});

export const PATCH = route(async (req, { params }: Ctx) => {
  const { viewId } = await params;
  const body = await readJson(req, schema);
  const data: Record<string, unknown> = {};
  if (body.config !== undefined) data.config = body.config;
  if (body.name !== undefined) data.name = body.name;
  const view = await prisma.view.update({ where: { id: viewId }, data });
  return NextResponse.json(view);
});
