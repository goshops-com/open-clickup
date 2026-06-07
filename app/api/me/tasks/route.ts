import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { route } from "@/lib/api-helpers";

// Tasks assigned to the current user, across every list ("My Work" / Home).
export const GET = route(async () => {
  const user = await requireUser();
  const tasks = await prisma.task.findMany({
    where: { archived: false, assignees: { some: { userId: user.id } } },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      listId: true,
      priority: true,
      startDate: true,
      dueDate: true,
      status: { select: { name: true, color: true, type: true } },
      list: { select: { name: true, space: { select: { name: true, color: true } } } },
    },
  });
  return NextResponse.json({ tasks });
});
