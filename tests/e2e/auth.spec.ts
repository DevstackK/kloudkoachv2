import "dotenv/config";
import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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

/** Reads the OTP the app just emailed - registration/login always lands on /verify-email first. */
async function getOtpFor(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email }, select: { otpCode: true } });
  if (!user.otpCode) throw new Error(`No pending OTP for ${email}`);
  return user.otpCode;
}

/** Completes the post-register/login OTP gate via the UI, landing on /dashboard. */
async function verifyEmailInUi(page: Page, email: string) {
  await expect(page).toHaveURL(/\/verify-email/);
  const code = await getOtpFor(email);
  const button = await fillUntilReady(page, [{ label: "Verification code", value: code }], "Verify");
  await button.click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Reads the token the app just emailed for a forgot-password request. */
async function getResetTokenFor(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email }, select: { resetToken: true } });
  if (!user.resetToken) throw new Error(`No pending reset token for ${email}`);
  return user.resetToken;
}

test.describe("auth", () => {
  test("redirects an unauthenticated visitor from /dashboard to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("registers a new user, verifies email, and reaches the dashboard", async ({ page }) => {
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

    await verifyEmailInUi(page, email);
    await expect(page.getByRole("banner").locator('a[href="/dashboard/interview"]')).toBeVisible();
  });

  test("rejects an incorrect verification code and stays on /verify-email", async ({ page, request }) => {
    const email = uniqueEmail("badotp");
    const registerRes = await request.post("/api/auth/register", {
      data: { name: "E2E Test User", email, password: PASSWORD },
    });
    expect(registerRes.ok()).toBeTruthy();

    await page.goto("/login");
    const loginButton = await fillUntilReady(
      page,
      [
        { label: "Email Address", value: email },
        { label: "Password", value: PASSWORD },
      ],
      "Sign In"
    );
    await loginButton.click();
    await expect(page).toHaveURL(/\/verify-email/);

    const verifyButton = await fillUntilReady(page, [{ label: "Verification code", value: "000000" }], "Verify");
    await verifyButton.click();

    await expect(page.getByText(/Incorrect code/)).toBeVisible();
    await expect(page).toHaveURL(/\/verify-email/);
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

  test("logs in an existing user, verifies email, and reaches the dashboard", async ({ page, request }) => {
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

    await verifyEmailInUi(page, email);
    await expect(page.getByRole("banner").locator('a[href="/dashboard/interview"]')).toBeVisible();
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
    await verifyEmailInUi(page, email);

    await page.getByRole("button", { name: "Account Settings" }).click();
    await page.getByRole("menuitem", { name: "Logout" }).click();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("resets password via the emailed link and can log in with the new password", async ({ page, request }) => {
    const email = uniqueEmail("reset");
    const oldPassword = PASSWORD;
    const newPassword = "a-totally-different-passphrase";

    const registerRes = await request.post("/api/auth/register", {
      data: { name: "E2E Test User", email, password: oldPassword },
    });
    expect(registerRes.ok()).toBeTruthy();

    const forgotRes = await request.post("/api/auth/forgot-password", { data: { email } });
    expect(forgotRes.ok()).toBeTruthy();
    const token = await getResetTokenFor(email);

    await page.goto(`/reset-password?token=${token}`);
    // Not label-based like fillUntilReady's other callers: MUI's outlined
    // variant duplicates the label text into a hidden fieldset legend,
    // which browsers fold into the computed accessible name - "New
    // Password" (exact) matches nothing, and non-exact matches both fields
    // ambiguously. Both inputs are type="password" in a fixed DOM order,
    // which is stable regardless of that quirk.
    const passwordInputs = page.locator('input[type="password"]');
    const button = page.getByRole("button", { name: "Reset Password" });
    await expect(async () => {
      await passwordInputs.nth(0).fill(newPassword);
      await passwordInputs.nth(1).fill(newPassword);
      await expect(passwordInputs.nth(0)).toHaveValue(newPassword);
      await expect(passwordInputs.nth(1)).toHaveValue(newPassword);
    }).toPass({ timeout: 15_000 });
    await button.click();

    await expect(page.getByText("Password updated.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });

    const newLoginRes = await request.post("/api/auth/login", { data: { email, password: newPassword } });
    expect(newLoginRes.ok()).toBeTruthy();

    const oldLoginRes = await request.post("/api/auth/login", { data: { email, password: oldPassword } });
    expect(oldLoginRes.ok()).toBeFalsy();
  });
});
