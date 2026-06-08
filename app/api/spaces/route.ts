import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { readJson, route, ApiError } from "@/lib/api-helpers";

const COLORS = ["#7b68ee", "#fd71af", "#ff5722", "#ff7800", "#2ecd6f", "#1bbc9c", "#0ab1e8", "#9b59b6"];
const ICONS = ["🚀", "📣", "⚙️", "🎯", "💡", "📊", "🛠️", "🌱"];

const schema = z.object({ name: z.string().trim().min(1, "name is required") });

export const POST = route(async (req) => {
  await requireRole("ADMIN");
  const { name } = await readJson(req, schema);
  const workspace = await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } });
  if (!workspace) throw new ApiError(404, "No workspace");

  const count = await prisma.space.count({ where: { workspaceId: workspace.id } });
  const space = await prisma.space.create({
    data: {
      workspaceId: workspace.id,
      name,
      color: COLORS[count % COLORS.length],
      icon: ICONS[count % ICONS.length],
      position: count,
    },
  });
  return NextResponse.json(space, { status: 201 });
});
