import { NextResponse } from "next/server";
import { z } from "zod";
import { createTask } from "@/lib/tasks";
import { requireUser } from "@/lib/auth";
import { readJson, route } from "@/lib/api-helpers";

const schema = z.object({
  listId: z.string().min(1),
  name: z.string().trim().min(1, "name is required"),
  statusId: z.string().optional(),
  parentId: z.string().nullish(),
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]).nullish(),
  assigneeIds: z.array(z.string()).optional(),
});

export const POST = route(async (req) => {
  const body = await readJson(req, schema);
  const user = await requireUser();
  const task = await createTask({
    listId: body.listId,
    name: body.name,
    statusId: body.statusId,
    parentId: body.parentId ?? null,
    priority: body.priority ?? null,
    assigneeIds: body.assigneeIds ?? [],
    createdById: user.id,
  });
  return NextResponse.json(task, { status: 201 });
});
