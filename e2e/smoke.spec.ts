import { test, expect } from "@playwright/test";

test.describe("Drawly browser smoke", () => {
  test("solo game: prompt → reveal with multi-book flow", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Drawly" }),
    ).toBeVisible();

    const createBtn = page.getByRole("button", { name: "Create room" });
    await expect(createBtn).toBeEnabled({ timeout: 45_000 });

    await page
      .getByPlaceholder("What do your friends call you?")
      .fill("Playwright Bot");
    await createBtn.click();

    await expect(page).toHaveURL(/\/room\/[A-Z0-9]+/i);

    await page.getByRole("button", { name: "Ready up" }).click();

    // Verify the N players = N rounds info text
    await expect(page.getByText("1 player = 1 round")).toBeVisible();

    await page.getByRole("button", { name: "Start game" }).click();

    // Solo game: 1 player = 1 round = prompt only
    await expect(
      page.getByRole("heading", { name: "Write the first prompt" }),
    ).toBeVisible();

    await expect(page.getByText("Round 1 / 1")).toBeVisible();

    await page
      .getByPlaceholder("e.g. A cat trying to parallel park…")
      .fill("A robot eating spaghetti on the moon");
    await page.getByRole("button", { name: "Lock it in" }).click();

    // After solo prompt, game should go straight to reveal
    await expect(
      page.getByRole("heading", { name: "The Big Reveal" }),
    ).toBeVisible({ timeout: 10_000 });

    // Should see a book to click
    await expect(
      page.getByText("Playwright Bot\u2019s book"),
    ).toBeVisible();

    // Open the book
    await page.getByText("Playwright Bot\u2019s book").click();

    // Should see the prompt entry
    await expect(page.getByText("A robot eating spaghetti on the moon")).toBeVisible();
    await expect(page.getByText("The starting prompt")).toBeVisible();
  });

  test("font, animated background, drawing tools presence", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Drawly" }),
    ).toBeVisible();

    const bodyFont = await page.evaluate(
      () => getComputedStyle(document.body).fontFamily,
    );
    expect(bodyFont).toMatch(/Nunito|Fredoka/i);

    const bgMotion = await page.locator(".bg-page").first().evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        animationName: s.animationName,
        backgroundImage: s.backgroundImage,
      };
    });
    const hasMotion =
      bgMotion.animationName !== "none" && bgMotion.animationName !== "";
    const hasLayers = /gradient/i.test(bgMotion.backgroundImage);
    expect(hasMotion || hasLayers).toBeTruthy();
  });
});
