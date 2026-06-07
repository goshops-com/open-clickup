import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, route } from "@/lib/api-helpers";
import { publish } from "@/lib/events";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export const POST = route(async (req) => {
  const user = await requireUser();

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "No file provided");
  if (!file.type.startsWith("image/")) throw new ApiError(400, "Avatar must be an image");
  if (file.size > MAX_SIZE) throw new ApiError(413, "Image exceeds 5 MB limit");

  const ext = (path.extname(file.name).slice(0, 12).replace(/[^a-zA-Z0-9.]/g, "")) || ".png";
  const stored = `avatar-${randomUUID()}${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, stored), Buffer.from(await file.arrayBuffer()));

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: `/uploads/${stored}` },
    select: { id: true, avatarUrl: true },
  });
  publish({ type: "bootstrap" });
  return NextResponse.json(updated);
});
