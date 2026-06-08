import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { readJson, route } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ taskId: string; fieldId: string }> };
const schema = z.object({ value: z.any() });

// upsert (or clear) a custom field value for a task
export const PUT = route(async (req, { params }: Ctx) => {
  const { taskId, fieldId } = await params;
  await requireRole("MEMBER");
  const { value } = await readJson(req, schema);

  const isEmpty =
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

  if (isEmpty) {
    await prisma.customFieldValue.deleteMany({ where: { taskId, customFieldId: fieldId } });
    return NextResponse.json({ ok: true, cleared: true });
  }

  const saved = await prisma.customFieldValue.upsert({
    where: { taskId_customFieldId: { taskId, customFieldId: fieldId } },
    create: { taskId, customFieldId: fieldId, value },
    update: { value },
  });
  return NextResponse.json(saved);
});
