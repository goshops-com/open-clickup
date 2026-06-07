import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { CustomFieldType } from "@/lib/generated/prisma/client";
import { readJson, route } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ listId: string }> };
const OPTION_COLORS = ["#3d8df5", "#2ecd6f", "#ff7800", "#fd71af", "#9b59b6", "#f50000"];

const schema = z.object({
  name: z.string().trim().min(1, "name is required"),
  type: z.enum([
    "TEXT", "TEXTAREA", "NUMBER", "MONEY", "DROPDOWN", "LABELS",
    "DATE", "CHECKBOX", "URL", "EMAIL", "PHONE", "RATING", "PROGRESS",
  ]),
  options: z.array(z.string()).optional(),
});

export const POST = route(async (req, { params }: Ctx) => {
  const { listId } = await params;
  const { name, type, options } = await readJson(req, schema);
  const last = await prisma.customField.findFirst({ where: { listId }, orderBy: { position: "desc" } });
  const needsOptions = type === "DROPDOWN" || type === "LABELS";

  const field = await prisma.customField.create({
    data: {
      listId,
      name,
      type: type as CustomFieldType,
      position: (last?.position ?? 0) + 1,
      options:
        needsOptions && options?.length
          ? {
              create: options
                .filter((o) => o.trim())
                .map((label, i) => ({
                  label: label.trim(),
                  color: OPTION_COLORS[i % OPTION_COLORS.length],
                  position: i,
                })),
            }
          : undefined,
    },
    include: { options: { orderBy: { position: "asc" } } },
  });
  return NextResponse.json(field, { status: 201 });
});
