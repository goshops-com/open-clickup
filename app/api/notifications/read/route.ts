import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { readJson, route } from "@/lib/api-helpers";

// Mark notifications read. Body { ids } marks those; omit/empty marks all.
const schema = z.object({ ids: z.array(z.string()).optional() });

export const POST = route(async (req) => {
  const user = await requireUser();
  const { ids } = await readJson(req, schema).catch(() => ({ ids: undefined }));
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false, ...(ids?.length ? { id: { in: ids } } : {}) },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
});
