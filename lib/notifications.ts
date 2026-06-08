import { prisma } from "@/lib/db";

// re-exported for callers that import from this module
export { extractMentionIds } from "@/lib/mentions";

export async function createNotifications(opts: {
  recipientIds: string[];
  actorId: string;
  taskId: string;
  type: "mention" | "assigned" | "comment";
  body: string;
}): Promise<void> {
  const recipients = [...new Set(opts.recipientIds)].filter((id) => id !== opts.actorId);
  if (!recipients.length) return;
  await prisma.notification.createMany({
    data: recipients.map((userId) => ({
      userId,
      actorId: opts.actorId,
      taskId: opts.taskId,
      type: opts.type,
      body: opts.body,
    })),
  });
}
