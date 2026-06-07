import { prisma } from "@/lib/db";

/** Extract mentioned user ids from tiptap mention HTML (spans carrying data-id). */
export function extractMentionIds(html: string): string[] {
  const ids = new Set<string>();
  const tags = html.match(/<span\b[^>]*>/g) ?? [];
  for (const tag of tags) {
    if (!/mention/.test(tag)) continue;
    const m = tag.match(/data-id="([^"]+)"/);
    if (m) ids.add(m[1]);
  }
  return [...ids];
}

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
