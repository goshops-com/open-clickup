import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";

// ----------------------------------------------------------------------------
// Reusable include shapes (single source of truth for API <-> client types)
// ----------------------------------------------------------------------------

export const userSelect = {
  id: true,
  name: true,
  email: true,
  color: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

export const taskInclude = {
  status: true,
  assignees: { include: { user: { select: userSelect } } },
  tags: { include: { tag: true } },
  customFieldValues: true,
  subtasks: {
    where: { archived: false },
    orderBy: { position: "asc" },
    include: {
      status: true,
      assignees: { include: { user: { select: userSelect } } },
    },
  },
  _count: { select: { comments: true, subtasks: true, checklists: true } },
} satisfies Prisma.TaskInclude;

export type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;
export type SubtaskWithRelations = TaskWithRelations["subtasks"][number];
export type UserLite = Prisma.UserGetPayload<{ select: typeof userSelect }>;

// ----------------------------------------------------------------------------
// Workspace tree (for sidebar)
// ----------------------------------------------------------------------------

export async function getWorkspaceTree() {
  const workspace = await prisma.workspace.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      members: { include: { user: { select: userSelect } } },
      spaces: {
        orderBy: { position: "asc" },
        include: {
          folders: {
            orderBy: { position: "asc" },
            include: {
              lists: {
                orderBy: { position: "asc" },
                include: { _count: { select: { tasks: true } } },
              },
            },
          },
          lists: {
            where: { folderId: null },
            orderBy: { position: "asc" },
            include: { _count: { select: { tasks: true } } },
          },
        },
      },
    },
  });
  return workspace;
}

export type WorkspaceTree = NonNullable<Awaited<ReturnType<typeof getWorkspaceTree>>>;
export type SpaceNode = WorkspaceTree["spaces"][number];
export type FolderNode = SpaceNode["folders"][number];
export type ListNode = SpaceNode["lists"][number];

// ----------------------------------------------------------------------------
// List detail (statuses, custom fields, views, tasks)
// ----------------------------------------------------------------------------

export async function getListData(listId: string) {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    include: {
      space: { select: { id: true, name: true, color: true, icon: true } },
      folder: { select: { id: true, name: true } },
      statuses: { orderBy: { position: "asc" } },
      customFields: {
        orderBy: { position: "asc" },
        include: { options: { orderBy: { position: "asc" } } },
      },
      views: { orderBy: { position: "asc" } },
    },
  });
  if (!list) return null;

  const tasks = await prisma.task.findMany({
    where: { listId, parentId: null, archived: false },
    orderBy: { position: "asc" },
    include: taskInclude,
  });

  return { list, tasks };
}

export type ListData = NonNullable<Awaited<ReturnType<typeof getListData>>>;
export type ListWithMeta = ListData["list"];
export type StatusModel = ListWithMeta["statuses"][number];
export type CustomFieldWithOptions = ListWithMeta["customFields"][number];

// ----------------------------------------------------------------------------
// Task detail (full, for the task modal)
// ----------------------------------------------------------------------------

export async function getTaskDetail(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: {
      ...taskInclude,
      createdBy: { select: userSelect },
      watchers: { include: { user: { select: userSelect } } },
      attachments: { orderBy: { createdAt: "desc" } },
      timeEntries: {
        orderBy: { startedAt: "desc" },
        include: { user: { select: userSelect } },
      },
      blockedBy: {
        include: {
          blocker: {
            select: { id: true, name: true, listId: true, status: { select: { name: true, color: true, type: true } } },
          },
        },
      },
      blocking: {
        include: {
          blocked: {
            select: { id: true, name: true, listId: true, status: { select: { name: true, color: true, type: true } } },
          },
        },
      },
      checklists: {
        orderBy: { position: "asc" },
        include: { items: { orderBy: { position: "asc" } } },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: userSelect },
          reactions: true,
        },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: userSelect } },
      },
      list: {
        select: {
          id: true,
          name: true,
          spaceId: true,
          statuses: { orderBy: { position: "asc" } },
          customFields: {
            orderBy: { position: "asc" },
            include: { options: { orderBy: { position: "asc" } } },
          },
        },
      },
    },
  });
}

export type TaskDetail = NonNullable<Awaited<ReturnType<typeof getTaskDetail>>>;
