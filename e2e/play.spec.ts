import { expect, test } from "@playwright/test";

const hydrateFixture = {
  ok: true,
  card: {
    kind: "playable",
    repo: "https://github.com/nari-labs/dia",
    runtime: "link",
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
  test("hydrates a public repo, links out instead of framing, and skips ogl under reduced motion", async ({
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

    await expect(page.locator("iframe, frame, object, embed")).toHaveCount(0);
    const outbound = page.getByRole("link", { name: /Open example.com in a new tab/ });
    await expect(outbound).toBeVisible();
    await expect(outbound).toHaveAttribute("href", "https://example.com/dia");
    await expect(outbound).toHaveAttribute("rel", /noopener/);
    await expect(outbound).toHaveAttribute("rel", /noreferrer/);
    await expect(outbound).toHaveAttribute("referrerpolicy", "no-referrer");

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

  test("serves frame-ancestors and frame-src lockdown headers", async ({ page }) => {
    const response = await page.goto("/play");
    const csp = response?.headers()["content-security-policy"] ?? "";
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("frame-src 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(response?.headers()["x-frame-options"]).toBe("DENY");
    expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("renders a native HTML5 player for a direct media entry", async ({ page }) => {
    await page.route("**/api/play**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...hydrateFixture,
          card: { ...hydrateFixture.card, runtime: "media", entry: "https://cdn.example/demo.mp4" },
        }),
      });
    });
    await page.goto("/play?repo=nari-labs/dia");
    await expect(page.locator("video")).toHaveCount(1);
    await expect(page.locator("video")).toHaveAttribute("preload", "none");
    await expect(page.locator("iframe, object, embed")).toHaveCount(0);
  });
});
