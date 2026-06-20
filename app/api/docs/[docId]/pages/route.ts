import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { readJson, route } from "@/lib/api-helpers";

// ---------------------------------------------------------------------------
// GET /api/docs/:docId/pages — list pages in a doc
// ---------------------------------------------------------------------------

export const GET = route(async (_req, { params }: { params: Promise<{ docId: string }> }) => {
  await requireRole("MEMBER");
  const { docId } = await params;

  const pages = await prisma.docPage.findMany({
    where: { docId },
    orderBy: { position: "asc" },
  });

  return NextResponse.json(pages);
});

// ---------------------------------------------------------------------------
// POST /api/docs/:docId/pages — create a page
// ---------------------------------------------------------------------------

const createSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  parentId: z.string().nullish(),
  position: z.number().optional(),
});

export const POST = route(async (req, { params }: { params: Promise<{ docId: string }> }) => {
  const { user } = await requireRole("MEMBER");
  const { docId } = await params;
  const body = await readJson(req, createSchema);

  const doc = await prisma.doc.findUnique({ where: { id: docId } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const page = await prisma.docPage.create({
    data: {
      docId,
      spaceId: doc.spaceId,
      title: body.title,
      content: body.content ?? null,
      parentId: body.parentId ?? null,
      position: body.position ?? 0,
    },
  });

  return NextResponse.json(page, { status: 201 });
});

// ---------------------------------------------------------------------------
// PATCH /api/docs/:docId/pages/:pageId
// ---------------------------------------------------------------------------

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  parentId: z.string().nullish(),
  position: z.number().optional(),
});

export const PATCH = route(
  async (req, { params }: { params: Promise<{ docId: string; pageId: string }> }) => {
    const { user } = await requireRole("MEMBER");
    const { pageId } = await params;
    const body = await readJson(req, patchSchema);

    const page = await prisma.docPage.findUnique({
      where: { id: pageId },
      select: { docId: true, spaceId: true },
    });
    if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.docPage.update({
      where: { id: pageId },
      data: body,
    });

    return NextResponse.json(updated);
  },
);

// ---------------------------------------------------------------------------
// DELETE /api/docs/:docId/pages/:pageId
// ---------------------------------------------------------------------------

export const DELETE = route(
  async (_req, { params }: { params: Promise<{ docId: string; pageId: string }> }) => {
    const { user } = await requireRole("MEMBER");
    const { pageId } = await params;

    await prisma.docPage.delete({ where: { id: pageId } });
    return NextResponse.json({ ok: true });
  },
);
