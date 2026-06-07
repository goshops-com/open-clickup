import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { readJson, route, ApiError } from "@/lib/api-helpers";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const POST = route(async (req) => {
  const { email, password } = await readJson(req, schema);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new ApiError(401, "Invalid email or password");
  }
  await createSession(user.id);
  return NextResponse.json({ id: user.id, name: user.name, email: user.email });
});
