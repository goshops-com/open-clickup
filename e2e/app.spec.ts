import { test, expect, type Page } from "@playwright/test";
import type { ListData, TaskWithRelations } from "../lib/queries";

const EMAIL = "santiago@clickuppp.dev";
const PASSWORD = "password";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Log In" }).click();
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
