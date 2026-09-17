import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseAetherDeck, type AetherCard, type PlaywrightStep } from "../lib/aether-card";

const deck = parseAetherDeck(readFileSync(resolve("decks/ux-journey.json"), "utf-8")).sort(
  (a, b) => a.stats.spd - b.stats.spd,
);

const failed = new Set<string>();

type Seed = {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  tags?: string | string[];
  link?: string;
  image?: string;
  kind?: string;
  runtime?: string;
  entry?: string;
  display?: string;
};

function locatorFor(page: Page, step: PlaywrightStep): Locator {
  if (step.testid) return page.getByTestId(step.testid);
  if (step.selector) return page.locator(step.selector);
  if (step.role) {
    return page.getByRole(step.role as Parameters<Page["getByRole"]>[0], {
      name: step.name,
    });
  }
  if (step.text) return page.getByText(step.text);
  throw new Error(`Step ${step.action} needs a locator`);
}

async function clickStep(page: Page, step: PlaywrightStep) {
  await locatorFor(page, step).click({ force: true });
}

async function runStep(page: Page, step: PlaywrightStep) {
  switch (step.action) {
    case "goto":
      await page.goto(step.url ?? "/");
      return;
    case "fill":
      await locatorFor(page, step).fill(String(step.value ?? ""));
      return;
    case "selectOption":
      await locatorFor(page, step).selectOption(String(step.value ?? ""));
      return;
    case "click":
      await clickStep(page, step);
      return;
    case "expectVisible":
      await expect(locatorFor(page, step)).toBeVisible();
      return;
    case "expectHidden":
      await expect(locatorFor(page, step)).toBeHidden();
      return;
    case "expectURL":
      await expect(page).toHaveURL(new RegExp(String(step.pattern)));
      return;
    case "expectFocused":
      await expect(locatorFor(page, step)).toBeFocused();
      return;
    case "expectCount":
      await expect(page.locator(step.selector ?? "")).toHaveCount(step.count ?? 0);
      return;
    case "expectText": {
      const target = step.selector || step.role || step.testid ? locatorFor(page, step) : page.locator("body");
      await expect(target).toContainText(new RegExp(String(step.pattern), "i"));
      return;
    }
    case "expectAttribute": {
      const value = await locatorFor(page, step).getAttribute(String(step.attribute));
      expect(value ?? "").not.toBeNull();
      if (step.contains) expect(value ?? "").toContain(step.contains);
      if (step.notContains) expect(value ?? "").not.toContain(step.notContains);
      return;
    }
    case "route":
      await page.route(step.url ?? "**", async (route) => {
        if (step.method && route.request().method() !== step.method) {
          await route.continue();
          return;
        }
        await route.fulfill({
          status: typeof step.status === "number" ? step.status : 200,
          contentType: "application/json",
          body: JSON.stringify(step.body ?? {}),
        });
      });
      return;
    case "fetchJSON": {
      const res = await page.request.get(step.url ?? "/");
      expect(res.ok()).toBeTruthy();
      const json = (await res.json()) as Record<string, unknown> | unknown[];
      if (typeof step.expectLength === "number") {
        expect(Array.isArray(json)).toBe(true);
        expect((json as unknown[]).length).toBe(step.expectLength);
      }
      for (const key of step.keys ?? []) {
        expect(json as Record<string, unknown>).toHaveProperty(key);
      }
      return;
    }
    case "importJSON": {
      const payload = JSON.stringify(step.body ?? {});
      await page.getByTestId("wiki-import-file").setInputFiles({
        name: "export.json",
        mimeType: "application/json",
        buffer: Buffer.from(payload),
      });
      return;
    }
    default:
      throw new Error(`Unknown playwright action: ${step.action}`);
  }
}

async function runCard(page: Page, card: AetherCard) {
  const wiki = card.metadata?.wiki?.playwright;
  if (!wiki) return;
  if (wiki.reducedMotion) {
    await page.emulateMedia({ reducedMotion: "reduce" });
  }
  const steps = wiki.steps;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const next = steps[i + 1];
    if (step.action === "click" && next?.action === "expectDownload") {
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        clickStep(page, step),
      ]);
      expect(download.suggestedFilename()).toMatch(new RegExp(String(next.pattern)));
      i += 1;
      continue;
    }
    await runStep(page, step);
  }
}

test.describe("UX journey deck", () => {

  for (const card of deck) {
    test(`${card.id} ${card.name}`, async ({ page, request }) => {
      for (const dep of card.depends_on ?? []) {
        if (failed.has(dep)) {
          test.skip(true, `dependency ${dep} failed`);
        }
      }

      try {
        const reset = await request.post("/api/garden", { data: { op: "reset" } });
        expect(reset.ok(), await reset.text()).toBeTruthy();

        await page.addInitScript(() => {
          try {
            window.localStorage.removeItem("gw-flex");
          } catch {
            /* ignore */
          }
        });

        const seed = card.metadata?.wiki?.playwright?.seed as Seed | undefined;
        if (seed) {
          const tags =
            typeof seed.tags === "string"
              ? seed.tags.split(",").map((t) => t.trim()).filter(Boolean)
              : seed.tags ?? ["e2e"];
          const seeded = await request.post("/api/garden", {
            data: {
              op: "seed",
              resource: {
                id: seed.id,
                title: seed.title ?? card.name,
                description: seed.description ?? card.desc,
                category: seed.category ?? "example",
                tags,
                link: seed.link ?? "https://example.com",
                image: seed.image || "https://picsum.photos/id/10/800/450",
                kind: seed.kind,
                runtime: seed.runtime,
                entry: seed.entry,
                display: seed.display,
              },
            },
          });
          expect(seeded.ok(), await seeded.text()).toBeTruthy();
        }

        await runCard(page, card);
      } catch (error) {
        failed.add(card.id);
        throw error;
      }
    });
  }
});
