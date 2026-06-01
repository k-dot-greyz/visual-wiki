import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// Ensure screenshots folder exists
const SCREENSHOT_DIR = path.join(__dirname, "screenshots");
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function getScreenshotPath(name: string) {
  return path.join(SCREENSHOT_DIR, `${name}.png`);
}

test.describe("Visual Wiki — Basic Smoke and Accessibility Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Listen to console logs inside the browser for extra debugging if needed
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.log(`[BROWSER ERROR] ${msg.text()}`);
      }
    });
  });

  test("Verify basic page loading, filters, dialog focus, addition, and deletion", async ({ page }) => {
    console.log("\n  🚀 STARTING VISUAL WIKI SMOKE TEST SCENARIO");
    console.log("  ===========================================");

    // 1. Landing Page Load
    console.log("\n  [STEP 1] Navigating to Visual Wiki home page...");
    await page.goto("/");
    await expect(page).toHaveTitle(/visual wiki/);
    console.log("  ✓ Page loaded successfully!");

    // Verify semantic HTML landmarks are present for screen-reader compliance
    console.log("  [A11Y] Verifying semantic landmark structures...");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("section[aria-label='Curated knowledge garden']")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
    console.log("  ✓ All semantic landmarks (main, header, section, footer) are present!");

    // Take screenshot of home page
    const screenshotHome = getScreenshotPath("01-home-page");
    await page.screenshot({ path: screenshotHome, fullPage: true });
    console.log(`  📸 Screenshot saved to: ${screenshotHome}`);

    // 2. Search & Filtering
    console.log("\n  [STEP 2] Testing Search & Category filtering...");
    const searchInput = page.locator("#search-input");
    await expect(searchInput).toBeVisible();

    // Type a search filter
    console.log("  - Typing 'Fiber' into search input...");
    await searchInput.fill("Fiber");
    await page.waitForTimeout(300); // Wait for debounce

    // Verify URL reflects search param
    console.log("  - Verifying URL contains 'search=Fiber'...");
    await expect(page).toHaveURL(/search=Fiber/);

    // Verify list changes
    const r3fCard = page.locator("article:has-text('React Three Fiber')");
    await expect(r3fCard).toBeVisible();
    console.log("  ✓ Search filtering is working!");

    // Set Category filter
    console.log("  - Selecting 'Official' category...");
    const categorySelect = page.locator("#category-select");
    await categorySelect.selectOption("official");
    await page.waitForTimeout(300); // Wait for debounce

    // Verify URL reflects category param
    console.log("  - Verifying URL contains 'category=official'...");
    await expect(page).toHaveURL(/category=official/);

    // Take screenshot of filtered view
    const screenshotFiltered = getScreenshotPath("02-filtered-view");
    await page.screenshot({ path: screenshotFiltered });
    console.log(`  📸 Screenshot saved to: ${screenshotFiltered}`);

    // Clear filters
    console.log("  - Clearing search and category filters...");
    await searchInput.fill("");
    await categorySelect.selectOption("");
    await page.waitForTimeout(300);
    await expect(page).not.toHaveURL(/\?/);
    console.log("  ✓ Filter resetting successfully!");

    // 3. Radix Modal Dialog (A11y verification)
    console.log("\n  [STEP 3] Opening Add Resource Modal (Radix focus verification)...");
    const addBtn = page.getByRole("button", { name: "Add new resource to garden" });
    await addBtn.click();

    // Verify dialog is visible
    const dialogTitle = page.locator("role=heading[name='Add new resource']");
    await expect(dialogTitle).toBeVisible();
    console.log("  ✓ Radix Dialog overlay and content mounted successfully!");

    // Verify auto-focus focus trap behaves correctly (title input should have keyboard focus automatically on open)
    console.log("  [A11Y] Checking focus-trap autofocus on Title element...");
    const titleInput = page.locator("#title");
    await expect(titleInput).toBeFocused();
    console.log("  ✓ Focus trapping autofocused on '#title' input natively!");

    // Take screenshot of open dialog
    const screenshotDialog = getScreenshotPath("03-add-dialog-open");
    await page.screenshot({ path: screenshotDialog });
    console.log(`  📸 Screenshot saved to: ${screenshotDialog}`);

    // 4. Form Submission and New Resource Creation
    console.log("\n  [STEP 4] Submitting form to add a new resource...");
    const testTitle = `Playwright Test Resource ${Date.now()}`;
    const testDesc = "This is a temporary resource added autonomously via our custom Playwright smoke test script.";
    const testLink = "https://playwright.dev";
    const testTags = "testing, play, automation";

    console.log(`  - Filling title: "${testTitle}"`);
    await titleInput.fill(testTitle);
    await page.locator("#description").fill(testDesc);
    await page.locator("#category").selectOption("tutorial");
    await page.locator("#tags").fill(testTags);
    await page.locator("#link").fill(testLink);

    // Save and submit
    console.log("  - Submitting form...");
    await page.getByRole("button", { name: "Add to Garden" }).click();

    // Verify dialog closes automatically
    await expect(dialogTitle).not.toBeVisible();
    console.log("  ✓ Dialog closed successfully on form submission!");

    // Verify new resource is rendered in the feed
    console.log("  - Locating new resource in the main feed...");
    const newCard = page.locator(`article:has-text('${testTitle}')`);
    await expect(newCard).toBeVisible();
    console.log("  ✓ New resource is rendered successfully on the landing page!");

    // Take screenshot of updated dashboard
    const screenshotUpdated = getScreenshotPath("04-resource-added");
    await page.screenshot({ path: screenshotUpdated, fullPage: true });
    console.log(`  📸 Screenshot saved to: ${screenshotUpdated}`);

    // 5. Deletion Flow (cleanup)
    console.log("\n  [STEP 5] Cleaning up — deleting the test resource...");
    const deleteBtn = page.locator(`article:has-text('${testTitle}')`).getByRole("button", { name: /Delete resource/ });
    await expect(deleteBtn).toBeVisible();

    // Playwright handles javascript alert confirm dialogs by accepting them automatically
    page.once("dialog", async (dialog) => {
      console.log(`  - Browser Dialog prompted: "${dialog.message()}"`);
      console.log("  - Accepting dialog confirmation...");
      await dialog.accept();
    });

    console.log("  - Clicking delete button...");
    await deleteBtn.click();

    // Verify card is removed
    await expect(newCard).not.toBeVisible();
    console.log("  ✓ Test resource deleted and removed from layout successfully!");

    // Take final cleanup screenshot
    const screenshotClean = getScreenshotPath("05-after-cleanup");
    await page.screenshot({ path: screenshotClean, fullPage: true });
    console.log(`  📸 Screenshot saved to: ${screenshotClean}`);

    console.log("\n  ===========================================");
    console.log("  🎉 ALL VISUAL WIKI SMOKE TESTS PASSED PERFECTLY!");
    console.log("  ===========================================\n");
  });
});
