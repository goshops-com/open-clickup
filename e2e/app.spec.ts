import { test, expect, type Page } from "@playwright/test";

const EMAIL = "santiago@clickuppp.dev";
const PASSWORD = "password";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Log In" }).click();
  await page.waitForURL(/\/l\//);
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
  const name = `E2E task ${Date.now()}`;
  await page.getByRole("button", { name: "Add Task" }).first().click();
  await page.getByPlaceholder("Task name").fill(name);
  await page.keyboard.press("Enter");
  await expect(page.getByText(name)).toBeVisible();
});
