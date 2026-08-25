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

const audioFixture = {
  ...hydrateFixture,
  card: {
    ...hydrateFixture.card,
    runtime: "html5",
    entry: "https://example.com/demo.mp3",
  },
};

test.describe("Playground", () => {
  test("hydrates a public repo, never mounts an iframe, and skips ogl under reduced motion", async ({
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
    const live = page.getByRole("link", { name: "Open live site" });
    await expect(live).toBeVisible();
    await expect(live).toHaveAttribute("href", "https://example.com/dia");
    await expect(live).toHaveAttribute("rel", /noopener/);
    await expect(live).toHaveAttribute("target", "_blank");

    await expect(page.locator("[data-ogl='on']")).toHaveCount(0);
  });

  test("plays media files in a native HTML5 player instead of an iframe", async ({ page }) => {
    await page.route("**/api/play**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(audioFixture),
      });
    });
    await page.goto("/play?repo=nari-labs/dia");
    await expect(page.locator("iframe")).toHaveCount(0);
    const audio = page.locator("audio");
    await expect(audio).toBeVisible();
    await expect(audio).toHaveAttribute("src", "https://example.com/demo.mp3");
    await expect(audio).toHaveAttribute("controls", "");
    await expect(audio).not.toHaveAttribute("autoplay", /.*/);
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
