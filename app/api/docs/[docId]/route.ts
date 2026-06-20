import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { readJson, route } from "@/lib/api-helpers";

// ---------------------------------------------------------------------------
// GET /api/docs/:docId — get doc with pages
// ---------------------------------------------------------------------------

export const GET = route(async (req, { params }: { params: Promise<{ docId: string }> }) => {
  const { user } = await requireRole("MEMBER");
  const { docId } = await params;

  const doc = await prisma.doc.findUnique({
    where: { id: docId },
    include: {
      pages: {
        orderBy: { position: "asc" },
        include: { children: { orderBy: { position: "asc" } } },
      },
    },
  });

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
});

// ---------------------------------------------------------------------------
// PATCH /api/docs/:docId — update doc
// ---------------------------------------------------------------------------

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  position: z.number().optional(),
});

export const PATCH = route(async (req, { params }: { params: Promise<{ docId: string }> }) => {
  const { user } = await requireRole("ADMIN");
  const { docId } = await params;
  const body = await readJson(req, updateSchema);

  const doc = await prisma.doc.findUnique({
    where: { id: docId },
    select: { spaceId: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const space = await prisma.space.findUnique({
    where: { id: doc.spaceId },
    select: { workspaceId: true },
  });
  if (!space) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspaceId: space.workspaceId },
  });
  if (!member) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const updated = await prisma.doc.update({
    where: { id: docId },
    data: body,
  });

  return NextResponse.json(updated);
});

// ---------------------------------------------------------------------------
// DELETE /api/docs/:docId
// ---------------------------------------------------------------------------

export const DELETE = route(async (_req, { params }: { params: Promise<{ docId: string }> }) => {
  const { user } = await requireRole("ADMIN");
  const { docId } = await params;

  const doc = await prisma.doc.findUnique({
    where: { id: docId },
    select: { spaceId: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const space = await prisma.space.findUnique({
    where: { id: doc.spaceId },
    select: { workspaceId: true },
  });
  if (!space) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspaceId: space.workspaceId },
  });
  if (!member) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  await prisma.doc.delete({ where: { id: docId } });
  return NextResponse.json({ ok: true });
});
