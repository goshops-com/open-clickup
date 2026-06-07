import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient, Priority, StatusType, CustomFieldType, ViewType } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// same scheme as lib/auth.ts hashPassword (salt:hash, scrypt)
function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}
const DEMO_PASSWORD = "password";

const STATUS_TEMPLATE = [
  { name: "TO DO", color: "#87909e", type: StatusType.NOT_STARTED },
  { name: "IN PROGRESS", color: "#5b9fff", type: StatusType.ACTIVE },
  { name: "IN REVIEW", color: "#a875ff", type: StatusType.ACTIVE },
  { name: "COMPLETE", color: "#6bc950", type: StatusType.DONE },
];

function daysFromNow(d: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + d);
  date.setHours(17, 0, 0, 0);
  return date;
}

async function main() {
  console.log("🧹 Clearing database...");
  // delete in FK-safe order
  await prisma.commentReaction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.checklist.deleteMany();
  await prisma.customFieldValue.deleteMany();
  await prisma.customFieldOption.deleteMany();
  await prisma.customField.deleteMany();
  await prisma.taskAssignee.deleteMany();
  await prisma.taskWatcher.deleteMany();
  await prisma.taskTag.deleteMany();
  await prisma.task.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.status.deleteMany();
  await prisma.view.deleteMany();
  await prisma.list.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.space.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  console.log("👤 Creating users...");
  const userData = [
    { email: "santiago@clickuppp.dev", name: "Santiago Cotto", color: "#7b68ee" },
    { email: "maya@clickuppp.dev", name: "Maya Chen", color: "#fd71af" },
    { email: "diego@clickuppp.dev", name: "Diego Romero", color: "#2ecd6f" },
    { email: "priya@clickuppp.dev", name: "Priya Nair", color: "#ff7800" },
    { email: "lucas@clickuppp.dev", name: "Lucas Martin", color: "#0ab1e8" },
  ];
  const users = await Promise.all(
    userData.map((u) => prisma.user.create({ data: { ...u, passwordHash: hashPassword(DEMO_PASSWORD) } })),
  );

  console.log("🏢 Creating workspace...");
  const workspace = await prisma.workspace.create({
    data: {
      name: "Acme Inc.",
      color: "#7b68ee",
      members: {
        create: users.map((u, i) => ({
          userId: u.id,
          role: i === 0 ? "OWNER" : "MEMBER",
        })),
      },
    },
  });

  // helper to build a list with statuses + default views
  async function createList(opts: {
    spaceId: string;
    folderId?: string;
    name: string;
    color?: string;
    position: number;
  }) {
    const list = await prisma.list.create({
      data: {
        spaceId: opts.spaceId,
        folderId: opts.folderId,
        name: opts.name,
        color: opts.color,
        position: opts.position,
        statuses: {
          create: STATUS_TEMPLATE.map((s, i) => ({ ...s, position: i })),
        },
        views: {
          create: [
            { name: "List", type: ViewType.LIST, position: 0 },
            { name: "Board", type: ViewType.BOARD, position: 1 },
            { name: "Calendar", type: ViewType.CALENDAR, position: 2 },
            { name: "Gantt", type: ViewType.GANTT, position: 3 },
            { name: "Table", type: ViewType.TABLE, position: 4 },
          ],
        },
      },
      include: { statuses: { orderBy: { position: "asc" } } },
    });
    return list;
  }

  console.log("🌌 Creating spaces, folders, lists...");

  // ---- SPACE: Product ----
  const product = await prisma.space.create({
    data: { workspaceId: workspace.id, name: "Product", color: "#7b68ee", icon: "🚀", position: 0 },
  });
  const tags = await Promise.all(
    [
      { name: "frontend", color: "#3d8df5" },
      { name: "backend", color: "#2ecd6f" },
      { name: "design", color: "#fd71af" },
      { name: "bug", color: "#f50000" },
      { name: "urgent", color: "#ff5722" },
    ].map((t) => prisma.tag.create({ data: { ...t, spaceId: product.id } })),
  );

  const sprintFolder = await prisma.folder.create({
    data: { spaceId: product.id, name: "Sprints", position: 0 },
  });
  const sprintList = await createList({ spaceId: product.id, folderId: sprintFolder.id, name: "Sprint 24", color: "#7b68ee", position: 0 });
  await createList({ spaceId: product.id, folderId: sprintFolder.id, name: "Sprint 25", color: "#fd71af", position: 1 });
  const backlog = await createList({ spaceId: product.id, name: "Backlog", color: "#ff7800", position: 1 });
  await createList({ spaceId: product.id, name: "Roadmap", color: "#2ecd6f", position: 2 });

  // ---- SPACE: Marketing ----
  const marketing = await prisma.space.create({
    data: { workspaceId: workspace.id, name: "Marketing", color: "#fd71af", icon: "📣", position: 1 },
  });
  await createList({ spaceId: marketing.id, name: "Campaigns", color: "#fd71af", position: 0 });
  await createList({ spaceId: marketing.id, name: "Content Calendar", color: "#0ab1e8", position: 1 });

  // ---- SPACE: Engineering ----
  const eng = await prisma.space.create({
    data: { workspaceId: workspace.id, name: "Engineering", color: "#0ab1e8", icon: "⚙️", position: 2 },
  });
  await createList({ spaceId: eng.id, name: "Infra", color: "#0ab1e8", position: 0 });

  console.log("🔧 Creating custom fields on Sprint 24...");
  const cfSprintPoints = await prisma.customField.create({
    data: { listId: sprintList.id, name: "Story Points", type: CustomFieldType.NUMBER, position: 0 },
  });
  const cfEnv = await prisma.customField.create({
    data: {
      listId: sprintList.id,
      name: "Environment",
      type: CustomFieldType.DROPDOWN,
      position: 1,
      options: {
        create: [
          { label: "Dev", color: "#3d8df5", position: 0 },
          { label: "Staging", color: "#ff7800", position: 1 },
          { label: "Production", color: "#f50000", position: 2 },
        ],
      },
    },
    include: { options: true },
  });

  console.log("✅ Creating tasks...");
  const S = sprintList.statuses; // [TO DO, IN PROGRESS, IN REVIEW, COMPLETE]

  type TaskSeed = {
    name: string;
    statusIdx: number;
    priority?: Priority;
    assignees?: number[];
    due?: number;
    start?: number;
    tags?: number[];
    desc?: string;
    points?: number;
    env?: number;
    subtasks?: { name: string; statusIdx: number; assignees?: number[] }[];
  };

  const sprintTasks: TaskSeed[] = [
    {
      name: "Build authentication flow",
      statusIdx: 1, priority: Priority.URGENT, assignees: [0, 1], due: 2, start: -1,
      tags: [0, 1], points: 8, env: 0,
      desc: "<p>Implement Google OAuth and email/password login with session handling.</p>",
      subtasks: [
        { name: "OAuth callback handler", statusIdx: 3, assignees: [0] },
        { name: "Session middleware", statusIdx: 1, assignees: [0] },
        { name: "Login UI", statusIdx: 0, assignees: [1] },
      ],
    },
    { name: "Design new dashboard layout", statusIdx: 2, priority: Priority.HIGH, assignees: [1], due: 1, tags: [2], points: 5 },
    { name: "Fix board drag-and-drop flicker", statusIdx: 0, priority: Priority.HIGH, assignees: [2], due: 0, tags: [3, 0], points: 3, env: 1 },
    { name: "Add custom fields to list view", statusIdx: 1, priority: Priority.NORMAL, assignees: [0, 2], due: 4, tags: [0], points: 5 },
    { name: "Set up CI pipeline", statusIdx: 3, priority: Priority.NORMAL, assignees: [4], due: -2, tags: [1], points: 3, env: 2 },
    { name: "Write API documentation", statusIdx: 0, priority: Priority.LOW, assignees: [3], due: 7, points: 2 },
    { name: "Optimize task query performance", statusIdx: 0, priority: Priority.HIGH, assignees: [4], due: 5, tags: [1], points: 8 },
    { name: "User onboarding tooltips", statusIdx: 2, priority: Priority.NORMAL, assignees: [1, 3], due: 3, tags: [2, 0], points: 5 },
    { name: "Dark mode support", statusIdx: 0, priority: Priority.LOW, assignees: [2], due: 12, tags: [0, 2], points: 5 },
    { name: "Notification system", statusIdx: 1, priority: Priority.URGENT, assignees: [0], due: 1, tags: [1], points: 13, env: 0 },
  ];

  let pos = 0;
  for (const t of sprintTasks) {
    const status = S[t.statusIdx];
    const task = await prisma.task.create({
      data: {
        listId: sprintList.id,
        statusId: status.id,
        name: t.name,
        description: t.desc,
        priority: t.priority,
        position: (pos += 1000),
        startDate: t.start != null ? daysFromNow(t.start) : null,
        dueDate: t.due != null ? daysFromNow(t.due) : null,
        completedAt: status.type === "DONE" ? new Date() : null,
        createdById: users[0].id,
        assignees: { create: (t.assignees ?? []).map((i) => ({ userId: users[i].id })) },
        tags: { create: (t.tags ?? []).map((i) => ({ tagId: tags[i].id })) },
      },
    });

    if (t.points != null) {
      await prisma.customFieldValue.create({
        data: { taskId: task.id, customFieldId: cfSprintPoints.id, value: t.points },
      });
    }
    if (t.env != null) {
      await prisma.customFieldValue.create({
        data: { taskId: task.id, customFieldId: cfEnv.id, value: cfEnv.options[t.env].id },
      });
    }

    let subPos = 0;
    for (const sub of t.subtasks ?? []) {
      await prisma.task.create({
        data: {
          listId: sprintList.id,
          statusId: S[sub.statusIdx].id,
          parentId: task.id,
          name: sub.name,
          position: (subPos += 1000),
          createdById: users[0].id,
          assignees: { create: (sub.assignees ?? []).map((i) => ({ userId: users[i].id })) },
        },
      });
    }
  }

  // a couple of comments on the first task
  const firstTask = await prisma.task.findFirst({ where: { listId: sprintList.id, parentId: null }, orderBy: { position: "asc" } });
  if (firstTask) {
    await prisma.comment.create({ data: { taskId: firstTask.id, userId: users[1].id, body: "<p>Started on the OAuth callback, should have a PR by EOD.</p>" } });
    await prisma.comment.create({ data: { taskId: firstTask.id, userId: users[0].id, body: "<p>Nice — make sure to handle the COOP popup issue 🙂</p>" } });
    await prisma.activity.create({ data: { taskId: firstTask.id, userId: users[0].id, type: "created", data: {} } });
  }

  // Backlog tasks (simpler)
  const BL = backlog.statuses;
  const backlogTasks = [
    { name: "Mobile app MVP scoping", statusIdx: 0, priority: Priority.HIGH, assignees: [0] },
    { name: "Migrate to Postgres 16", statusIdx: 0, priority: Priority.NORMAL, assignees: [4] },
    { name: "Accessibility audit", statusIdx: 0, priority: Priority.LOW, assignees: [1] },
    { name: "Gantt view dependencies", statusIdx: 0, priority: Priority.NORMAL, assignees: [2] },
  ];
  pos = 0;
  for (const t of backlogTasks) {
    await prisma.task.create({
      data: {
        listId: backlog.id, statusId: BL[t.statusIdx].id, name: t.name, priority: t.priority,
        position: (pos += 1000), createdById: users[0].id,
        assignees: { create: t.assignees.map((i) => ({ userId: users[i].id })) },
      },
    });
  }

  console.log("✨ Seed complete!");
  console.log(`   Workspace: ${workspace.name} (${workspace.id})`);
  console.log(`   Users: ${users.length}, Spaces: 3`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
