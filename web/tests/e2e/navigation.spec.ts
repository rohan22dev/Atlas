import { expect, test } from "@playwright/test";

// Pages with a real <h1> heading.
const HEADING_PAGES: { path: string; heading: string }[] = [
  { path: "/dashboard", heading: "Dashboard" },
  { path: "/vault", heading: "My Vault" },
  { path: "/liquidations", heading: "Liquidation Market" },
  { path: "/stats", heading: "Protocol Stats" },
  { path: "/settings", heading: "Settings" },
];

// Action pages render their title inside a shadcn Card (a styled <div>,
// not a heading element), so they're asserted by text instead of role.
const TEXT_TITLE_PAGES: { path: string; title: string }[] = [
  { path: "/deposit", title: "Deposit Collateral" },
  { path: "/borrow", title: "Borrow USDC" },
  { path: "/repay", title: "Repay Debt" },
  { path: "/withdraw", title: "Withdraw Collateral" },
];

function collectConsoleErrors(page: import("@playwright/test").Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test.describe("core navigation", () => {
  for (const { path, heading } of HEADING_PAGES) {
    test(`${path} renders without console errors`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      expect(errors, `console errors on ${path}:\n${errors.join("\n")}`).toEqual([]);
    });
  }

  for (const { path, title } of TEXT_TITLE_PAGES) {
    test(`${path} renders without console errors`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await page.goto(path);
      await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
      expect(errors, `console errors on ${path}:\n${errors.join("\n")}`).toEqual([]);
    });
  }
});

test.describe("landing page", () => {
  test("shows the hero and links to the app", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Keep your upside/i })).toBeVisible();
    // Atlas' <Button render={<Link/>}> keeps an accessible role of
    // "button" even though it renders a real <a> under the hood.
    await page.getByRole("button", { name: "Launch App" }).first().click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("features, how it works, security, and FAQ sections are present", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Built for real DeFi lending" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "How Atlas works" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Security first" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Frequently asked questions" })).toBeVisible();
  });
});

test.describe("404 handling", () => {
  test("shows a custom not-found page for unknown routes", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByText("This vault doesn't exist.")).toBeVisible();
    await page.getByRole("button", { name: "Back to Home" }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("dashboard without a connected wallet", () => {
  test("prompts the user to connect", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Connect your wallet to view your vault.")).toBeVisible();
  });
});
