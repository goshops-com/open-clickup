import { NextResponse } from "next/server";
import { z } from "zod";
import { createListWithDefaults } from "@/lib/hierarchy";
import { readJson, route } from "@/lib/api-helpers";

const schema = z.object({
  spaceId: z.string().min(1),
  folderId: z.string().nullish(),
  name: z.string().trim().min(1, "name is required"),
});

export const POST = route(async (req) => {
  const { spaceId, folderId, name } = await readJson(req, schema);
  const list = await createListWithDefaults({ spaceId, folderId: folderId ?? null, name });
  return NextResponse.json(list, { status: 201 });
});
