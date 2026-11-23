import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/permissions";
import { readJson, route } from "@/lib/api-helpers";
import { importTasksFromCsv } from "@/lib/csv-import";

type Ctx = { params: Promise<{ listId: string }> };

const schema = z.object({
  csv: z.string().min(1, "csv is required"),
});

export const POST = route(async (req, { params }: Ctx) => {
  const { listId } = await params;
  const { user } = await requireRole("MEMBER");
  const body = await readJson(req, schema);
  const result = await importTasksFromCsv({ listId, csvContent: body.csv, actorId: user.id });
  return NextResponse.json(result, { status: 201 });
});
