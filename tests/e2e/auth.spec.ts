import { test, expect, type Page } from "@playwright/test";

function uniqueEmail(label: string) {
  return `e2e-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

const PASSWORD = "correct-horse-battery-staple";

/**
 * Fills the given fields and waits for the submit button to become enabled,
 * retrying the fill if needed. Next dev-mode hydration can lag behind
 * Playwright's fill(), leaving these MUI controlled inputs' React state out
 * of sync with the DOM value on the first attempt.
 */
async function fillUntilReady(page: Page, fields: Array<{ label: string; value: string }>, submitName: string) {
  const button = page.getByRole("button", { name: submitName });
  await expect(async () => {
    for (const f of fields) {
      await page.getByLabel(f.label).fill(f.value);
    }
    await expect(button).toBeEnabled();
  }).toPass({ timeout: 15_000 });
  return button;
}

test.describe("auth", () => {
  test("redirects an unauthenticated visitor from /dashboard to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("registers a new user and reaches the dashboard", async ({ page }) => {
    const email = uniqueEmail("register");

    await page.goto("/register");
    const button = await fillUntilReady(
      page,
      [
        { label: "Full Name", value: "E2E Test User" },
        { label: "Email Address", value: email },
        { label: "Password", value: PASSWORD },
      ],
      "Get Started"
    );
    await button.click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('a[href="/dashboard/interview"]')).toBeVisible();
  });

  test("rejects login with the wrong password and stays on /login", async ({ page, request }) => {
    const email = uniqueEmail("badpw");
    const registerRes = await request.post("/api/auth/register", {
      data: { name: "E2E Test User", email, password: PASSWORD },
    });
    expect(registerRes.ok()).toBeTruthy();

    await page.goto("/login");
    const button = await fillUntilReady(
      page,
      [
        { label: "Email Address", value: email },
        { label: "Password", value: "definitely-the-wrong-password" },
      ],
      "Sign In"
    );
    await button.click();

    await expect(page.getByText("Invalid email or password")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("logs in an existing user and reaches the dashboard", async ({ page, request }) => {
    const email = uniqueEmail("login");
    const registerRes = await request.post("/api/auth/register", {
      data: { name: "E2E Test User", email, password: PASSWORD },
    });
    expect(registerRes.ok()).toBeTruthy();

    await page.goto("/login");
    const button = await fillUntilReady(
      page,
      [
        { label: "Email Address", value: email },
        { label: "Password", value: PASSWORD },
      ],
      "Sign In"
    );
    await button.click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('a[href="/dashboard/interview"]')).toBeVisible();
  });

  test("logs out and can no longer reach the dashboard", async ({ page, request }) => {
    const email = uniqueEmail("logout");
    const registerRes = await request.post("/api/auth/register", {
      data: { name: "E2E Test User", email, password: PASSWORD },
    });
    expect(registerRes.ok()).toBeTruthy();

    await page.goto("/login");
    const button = await fillUntilReady(
      page,
      [
        { label: "Email Address", value: email },
        { label: "Password", value: PASSWORD },
      ],
      "Sign In"
    );
    await button.click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole("button", { name: "Account Settings" }).click();
    await page.getByRole("menuitem", { name: "Logout" }).click();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
