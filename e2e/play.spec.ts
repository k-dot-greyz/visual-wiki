import { expect, test } from "@playwright/test";

const hydrateFixture = {
  ok: true,
  card: {
    kind: "playable",
    repo: "https://github.com/nari-labs/dia",
    runtime: "iframe",
    entry: "https://example.com/dia",
    display: "tree",
  },
  title: "nari-labs/dia",
  description: "Dialogue TTS",
  language: "Python",
  tree: [
    { path: "README.md", type: "blob" },
    { path: "src/model.py", type: "blob" },
  ],
  truncated: false,
};

test.describe("Playground", () => {
  test("hydrates a public repo, sandboxes the iframe, and skips ogl under reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/api/play**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(hydrateFixture),
      });
    });

    await page.goto("/play?repo=nari-labs/dia");
    await expect(page.getByRole("heading", { name: "playground" })).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByRole("heading", { name: "nari-labs/dia" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "README.md" })).toBeVisible();

    const iframe = page.locator("iframe[title='Sandboxed live preview']");
    await expect(iframe).toBeVisible();
    const sandbox = await iframe.getAttribute("sandbox");
    expect(sandbox).toContain("allow-scripts");
    expect(sandbox).not.toContain("allow-same-origin");
    await expect(iframe).toHaveAttribute("referrerpolicy", "no-referrer");

    await expect(page.locator("[data-ogl='on']")).toHaveCount(0);
  });

  test("rejects a private-looking hydrate error without an iframe", async ({ page }) => {
    await page.route("**/api/play**", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "Private repositories are not allowed" }),
      });
    });
    await page.goto("/play?repo=k-dot-greyz/secret");
    await expect(page.locator("p[role='alert']")).toContainText(/private/i);
    await expect(page.locator("iframe")).toHaveCount(0);
  });
});
