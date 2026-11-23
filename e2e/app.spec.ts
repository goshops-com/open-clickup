import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { ListData, TaskWithRelations } from "../lib/queries";

const EMAIL = "santiago@clickuppp.dev";
const PASSWORD = "password";

test("downloads list tasks as CSV", async ({ page }) => {
  await login(page);
  await page.locator("aside").getByText("Backlog", { exact: true }).click();
  await page.getByRole("button", { name: "List actions" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("menuitem", { name: "Export tasks as CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("Backlog.csv");
  const csv = await readFile(await download.path(), "utf8");
  expect(csv).toContain('"Task name","Status","Assignees","Priority","Start date","Due date"');
  expect(csv).toContain('"Mobile app MVP scoping","TO DO","santiago@clickuppp.dev","HIGH"');
});

async function submitLogin(page: Page) {
  await page.getByPlaceholder("you@company.com").fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Log In" }).click();
}

async function login(page: Page) {
  await page.goto("/login");
  await submitLogin(page);
  // after login the app lands on Home ("My Work")
  await page.waitForURL(/\/home/);
}

test("redirects to /login when unauthenticated", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: "Log In" })).toBeVisible();
});

test("rejects bad credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill(EMAIL);
  await page.locator('input[type="password"]').fill("wrongpassword");
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page.getByText(/Invalid email or password/i)).toBeVisible();
});

test("logs in and renders the workspace", async ({ page }) => {
  await login(page);
  // sidebar spaces from the seed
  await expect(page.getByText("Product").first()).toBeVisible();
  // a seeded list
  await expect(page.getByText("Backlog").first()).toBeVisible();
});

test("creates a task that appears in the list", async ({ page }) => {
  await login(page);
  // open a list first (Home has no task composer); scope to the sidebar so we
  // don't match a "Backlog" list chip on a Home task row
  await page.locator("aside").getByText("Backlog", { exact: true }).click();
  await page.waitForURL(/\/l\//);
  const name = `E2E task ${Date.now()}`;
  await page.getByRole("button", { name: "Add Task" }).first().click();
  await page.getByPlaceholder("Task name").fill(name);
  await page.keyboard.press("Enter");
  await expect(page.getByText(name)).toBeVisible();
});

test("opens the Home / My Work view after login", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/home/);
  await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ })).toBeVisible();
});

test("selects cards across Board columns and applies a bulk action", async ({ page }) => {
  await login(page);
  await page.locator("aside").getByText("Backlog", { exact: true }).click();
  await page.waitForURL(/\/l\//);
  const listId = new URL(page.url()).pathname.split("/").pop();
  const listUrl = `/api/lists/${listId}`;
  const listResponse = await page.request.get(listUrl);
  await expect(listResponse).toBeOK();
  const { list }: ListData = await listResponse.json();
  const [firstStatus, secondStatus] = list.statuses;
  const tasks: TaskWithRelations[] = [];

  try {
    for (const status of [firstStatus, secondStatus]) {
      const response = await page.request.post("/api/tasks", {
        data: { listId, name: `E2E Board ${status.name} ${Date.now()}`, statusId: status.id },
      });
      await expect(response).toBeOK();
      tasks.push(await response.json());
    }
    await page.reload();
    await page.getByRole("button", { name: "Board", exact: true }).click();

    const [first, second] = tasks.map((task) => page.getByRole("checkbox", { name: `Select ${task.name}`, exact: true }));
    await page.getByText(tasks[0].name, { exact: true }).hover();
    await first.check();
    await second.focus();
    await page.keyboard.press("Space");
    await expect(first).toBeChecked();
    await expect(second).toBeChecked();
    await expect(page).not.toHaveURL(/task=/);

    await page.getByRole("button", { name: "Priority", exact: true }).click();
    await page.getByRole("menuitem", { name: "Urgent" }).click();
    await expect.poll(async () => {
      const response = await page.request.get(listUrl);
      const { tasks: saved }: ListData = await response.json();
      return tasks.map((task) => {
        const updated = saved.find((t) => t.id === task.id);
        return [updated?.priority, updated?.statusId];
      });
    }).toEqual([["URGENT", firstStatus.id], ["URGENT", secondStatus.id]]);

    await page.getByRole("button", { name: "Clear selection" }).click();
    await expect(first).not.toBeChecked();
    await expect(second).not.toBeChecked();
    await expect(page.getByRole("button", { name: "Priority", exact: true })).toHaveCount(0);

    // Drag from the card body, not the checkbox, and verify that the move persists.
    const source = page.getByText(tasks[0].name, { exact: true });
    const target = page.getByText(tasks[1].name, { exact: true });
    await source.scrollIntoViewIfNeeded();
    await target.scrollIntoViewIfNeeded();
    const from = (await source.boundingBox())!;
    const to = (await target.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 15 });
    await page.mouse.up();
    await expect.poll(async () => {
      const response = await page.request.get(listUrl);
      const { tasks: saved }: ListData = await response.json();
      return saved.find((task) => task.id === tasks[0].id)?.statusId;
    }).toBe(secondStatus.id);
  } finally {
    for (const task of tasks) await expect(await page.request.delete(`/api/tasks/${task.id}`)).toBeOK();
  }
});

test("copies a task link from List and task details, with a manual fallback", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await login(page);
  await page.locator("aside").getByText("Backlog", { exact: true }).click();

  const taskName = "Mobile app MVP scoping";
  const rowActions = page.getByRole("button", { name: `Actions for ${taskName}`, exact: true });
  await rowActions.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitem", { name: "Copy link", exact: true }).click();
  await expect(page.getByText("Task link copied", { exact: true })).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(link).searchParams.get("task")).toBeTruthy();

  const tab = await context.newPage();
  await tab.goto(link);
  const details = tab.getByRole("dialog", { name: "Task details" });
  await expect(details.getByPlaceholder("Task name")).toHaveValue(taskName);
  const taskActions = details.getByRole("button", { name: "Task actions" });
  await tab.evaluate(() => navigator.clipboard.writeText(""));
  await taskActions.click();
  await tab.getByRole("menuitem", { name: "Copy link", exact: true }).click();
  await expect(details.getByText("Task link copied")).toBeVisible();
  expect(await tab.evaluate(() => navigator.clipboard.readText())).toBe(link);

  await tab.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { value: undefined });
  });
  await taskActions.click();
  await tab.getByRole("menuitem", { name: "Copy link", exact: true }).click();
  const fallback = tab.getByRole("dialog", { name: "Copy task link" });
  const input = fallback.getByRole("textbox", { name: "Task link" });
  await expect(input).toHaveValue(link);
  await expect(input).toBeFocused();
  expect(await input.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])).toEqual([0, link.length]);
  await fallback.getByRole("button", { name: "Done" }).click();
  await expect(taskActions).toBeFocused();
});

test("opens the shared task after signing in", async ({ page, context }) => {
  await login(page);
  await page.locator("aside").getByText("Backlog", { exact: true }).click();
  await page.waitForURL(/\/l\//);
  const { pathname } = new URL(page.url());
  const response = await page.request.get(`/api/lists/${pathname.split("/").pop()}`);
  await expect(response).toBeOK();
  const { tasks }: ListData = await response.json();
  const task = tasks.find((item) => item.name === "Mobile app MVP scoping")!;
  const link = `${pathname}?task=${task.id}`;

  await context.clearCookies();
  await page.goto(link);
  await expect(page).toHaveURL(/\/login\?next=/);
  await submitLogin(page);
  await expect(page).toHaveURL(new URL(link, page.url()).href);
  await expect(page.getByRole("dialog", { name: "Task details" }).getByPlaceholder("Task name")).toHaveValue(task.name);
});

test("navigates, selects, and opens tasks with List shortcuts", async ({ page }) => {
  await login(page);
  await page.locator("aside").getByText("Backlog", { exact: true }).click();
  const list = page.getByRole("region", { name: "Task list" });
  const first = list.getByRole("button", { name: "Mobile app MVP scoping", exact: true });
  const second = list.getByRole("button", { name: "Migrate to Postgres 16", exact: true });
  const selection = list.getByRole("checkbox", { name: "Select Migrate to Postgres 16", exact: true });

  await list.focus();
  await page.keyboard.press("j");
  await expect(first).toBeFocused();
  await page.keyboard.press("j");
  await expect(second).toBeFocused();
  await page.keyboard.press("x");
  await expect(selection).toBeChecked();
  await page.keyboard.press("x");
  await expect(selection).not.toBeChecked();
  await page.keyboard.press("k");
  await expect(first).toBeFocused();

  const details = page.getByRole("dialog", { name: "Task details" });
  await page.keyboard.press("e");
  await expect(details.getByPlaceholder("Task name")).toHaveValue("Mobile app MVP scoping");
  await page.keyboard.press("Escape");
  await expect(first).toBeFocused();
  await page.keyboard.press("j");
  await page.keyboard.press("Enter");
  await expect(details.getByPlaceholder("Task name")).toHaveValue("Migrate to Postgres 16");
  await page.keyboard.press("Escape");
  await expect(second).toBeFocused();

  await second.dblclick();
  const editor = list.getByRole("textbox");
  await expect(editor).toBeFocused();
  await editor.fill("");
  await page.keyboard.type("jkxe");
  await expect(editor).toHaveValue("jkxe");
  await expect(selection).not.toBeChecked();
  await page.keyboard.press("Escape");

  await list.getByRole("button", { name: "Collapse TO DO", exact: true }).click();
  await list.focus();
  await page.keyboard.press("j");
  await expect(list).toBeFocused();
  await expect(first).toHaveCount(0);

  await page.keyboard.press("?");
  await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" }).getByText("Focus the next task")).toBeVisible();
});
