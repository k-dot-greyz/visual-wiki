import { expect, test } from "@playwright/test";

const hydrateFixture = {
  ok: true,
  card: {
    kind: "playable",
    repo: "https://github.com/nari-labs/dia",
    runtime: "redirect",
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
  test("hydrates a public repo, uses external redirect links, and skips ogl under reduced motion", async ({
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

    await expect(page.locator("iframe")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /live preview in new tab/i })).toHaveAttribute(
      "href",
      "https://example.com/dia",
    );
    await expect(page.getByRole("link", { name: /live preview in new tab/i })).toHaveAttribute(
      "target",
      "_blank",
    );
    await expect(page.getByRole("link", { name: /live preview in new tab/i })).toHaveAttribute(
      "rel",
      /noopener/,
    );

    await expect(page.locator("[data-ogl='on']")).toHaveCount(0);
  });

  test("plays direct media with HTML5 elements instead of iframes", async ({ page }) => {
    await page.route("**/api/play**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...hydrateFixture,
          card: {
            ...hydrateFixture.card,
            entry: "https://cdn.example.com/demo.mp4",
          },
        }),
      });
    });

    await page.goto("/play?repo=nari-labs/dia");
    await expect(page.locator("iframe")).toHaveCount(0);
    await expect(page.locator("video")).toHaveCount(1);
    await expect(page.locator("video")).toHaveAttribute("src", "https://cdn.example.com/demo.mp4");
  });

  test("rejects a private-looking hydrate error without preview chrome", async ({ page }) => {
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
