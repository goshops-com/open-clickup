import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readJson, route, ApiError } from "@/lib/api-helpers";

const schema = z.object({ userId: z.string().min(1) });

// dev convenience: "log in as" another seeded user (creates a real session)
export const POST = route(async (req) => {
  const { userId } = await readJson(req, schema);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");
  await createSession(userId);
  return NextResponse.json({ ok: true });
});
