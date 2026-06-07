import { prisma } from "@/lib/db";
import { StatusType, ViewType } from "@/lib/generated/prisma/client";

export const STATUS_TEMPLATE = [
  { name: "TO DO", color: "#87909e", type: StatusType.NOT_STARTED },
  { name: "IN PROGRESS", color: "#5b9fff", type: StatusType.ACTIVE },
  { name: "IN REVIEW", color: "#a875ff", type: StatusType.ACTIVE },
  { name: "COMPLETE", color: "#6bc950", type: StatusType.DONE },
];

const DEFAULT_VIEWS = [
  { name: "List", type: ViewType.LIST },
  { name: "Board", type: ViewType.BOARD },
  { name: "Calendar", type: ViewType.CALENDAR },
  { name: "Gantt", type: ViewType.GANTT },
  { name: "Table", type: ViewType.TABLE },
];

const LIST_COLORS = ["#7b68ee", "#fd71af", "#ff7800", "#2ecd6f", "#0ab1e8", "#9b59b6"];

/** Create a list with the default status workflow + the five views. */
export async function createListWithDefaults(opts: {
  spaceId: string;
  folderId?: string | null;
  name: string;
}) {
  const count = await prisma.list.count({ where: { spaceId: opts.spaceId } });
  const last = await prisma.list.findFirst({
    where: { spaceId: opts.spaceId, folderId: opts.folderId ?? null },
    orderBy: { position: "desc" },
  });

  return prisma.list.create({
    data: {
      spaceId: opts.spaceId,
      folderId: opts.folderId ?? null,
      name: opts.name,
      color: LIST_COLORS[count % LIST_COLORS.length],
      position: (last?.position ?? 0) + 1000,
      statuses: { create: STATUS_TEMPLATE.map((s, i) => ({ ...s, position: i })) },
      views: { create: DEFAULT_VIEWS.map((v, i) => ({ ...v, position: i })) },
    },
  });
}
