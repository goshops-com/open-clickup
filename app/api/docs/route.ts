import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { readJson, route } from "@/lib/api-helpers";

// ---------------------------------------------------------------------------
// GET /api/docs — list docs in a space
// ---------------------------------------------------------------------------

export const GET = route(async (req) => {
  await requireRole("MEMBER");
  const { searchParams } = new URL(req.url);
  const spaceId = searchParams.get("spaceId");
  if (!spaceId) return NextResponse.json({ error: "spaceId required" }, { status: 400 });

  const docs = await prisma.doc.findMany({
    where: { spaceId },
    orderBy: { position: "asc" },
    include: { pages: { orderBy: { position: "asc" } } },
  });

  return NextResponse.json(docs);
});

// ---------------------------------------------------------------------------
// POST /api/docs — create a new doc
// ---------------------------------------------------------------------------

const createSchema = z.object({
  spaceId: z.string().min(1),
  title: z.string().min(1),
});

export const POST = route(async (req) => {
  const { user } = await requireRole("ADMIN");
  const body = await readJson(req, createSchema);
  const { spaceId, title } = body;

  // Verify user belongs to workspace that owns the space
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { workspaceId: true },
  });
  if (!space) return NextResponse.json({ error: "Space not found" }, { status: 404 });

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspaceId: space.workspaceId },
  });
  if (!member) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const doc = await prisma.doc.create({
    data: { spaceId, title },
  });

  // Create a root page
  const page = await prisma.docPage.create({
    data: {
      docId: doc.id,
      spaceId,
      title: "Welcome",
      content: "<h1>Welcome to this doc</h1>",
    },
  });

  return NextResponse.json({ ...doc, pages: [page] }, { status: 201 });
});
