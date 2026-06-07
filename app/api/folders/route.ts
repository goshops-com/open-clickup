import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJson, route } from "@/lib/api-helpers";

const schema = z.object({
  spaceId: z.string().min(1),
  name: z.string().trim().min(1, "name is required"),
});

export const POST = route(async (req) => {
  const { spaceId, name } = await readJson(req, schema);
  const last = await prisma.folder.findFirst({ where: { spaceId }, orderBy: { position: "desc" } });
  const folder = await prisma.folder.create({
    data: { spaceId, name, position: (last?.position ?? 0) + 1000 },
  });
  return NextResponse.json(folder, { status: 201 });
});
