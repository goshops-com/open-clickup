import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { colorFromString } from "@/lib/utils";
import { readJson, route, ApiError } from "@/lib/api-helpers";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const POST = route(async (req) => {
  const rl = rateLimit(`signup:${clientIp(req)}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many sign-up attempts. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }
  const { name, email, password } = await readJson(req, schema);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, "An account with that email already exists");

  const user = await prisma.user.create({
    data: { name, email, passwordHash: hashPassword(password), color: colorFromString(email) },
  });

  // add to the (first) workspace as a member so they land in a populated app
  const workspace = await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } });
  if (workspace) {
    await prisma.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: user.id, role: "MEMBER" },
    });
  }

  await createSession(user.id);
  return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 });
});
