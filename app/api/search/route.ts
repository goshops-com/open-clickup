import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ tasks: [], lists: [] });

  const [tasks, lists] = await Promise.all([
    prisma.task.findMany({
      where: { name: { contains: q, mode: "insensitive" }, archived: false },
      take: 12,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        listId: true,
        status: { select: { name: true, color: true, type: true } },
        list: { select: { name: true } },
      },
    }),
    prisma.list.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 6,
      select: {
        id: true,
        name: true,
        color: true,
        space: { select: { name: true } },
      },
    }),
  ]);

  return NextResponse.json({ tasks, lists });
}
