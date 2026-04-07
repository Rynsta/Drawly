import { test, expect } from "@playwright/test";

test.describe("Drawly browser smoke", () => {
  test("socket, room, prompt, canvas tools, font, animated background", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Drawly" }),
    ).toBeVisible();

    const createBtn = page.getByRole("button", { name: "Create room" });
    await expect(createBtn).toBeEnabled({ timeout: 45_000 });

    await page
      .getByPlaceholder("How should we shout at you?")
      .fill("Playwright Bot");
    await createBtn.click();

    await expect(page).toHaveURL(/\/room\/[A-Z0-9]+/i);

    await page.getByRole("button", { name: "Ready up" }).click();
    await page.getByRole("button", { name: "Start game" }).click();

    await expect(
      page.getByRole("heading", { name: "Write the starting prompt" }),
    ).toBeVisible();

    await page
      .getByPlaceholder("e.g. A nervous toaster at a talent show…")
      .fill("A robot eating spaghetti on the moon");
    await page.getByRole("button", { name: "Lock in prompt" }).click();

    await expect(
      page.getByRole("heading", { name: "Draw what you read" }),
    ).toBeVisible();

    const canvas = page.locator("canvas.drawing-surface");
    await expect(canvas).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Fill bucket" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Brush", exact: true }),
    ).toBeVisible();

    const brushSize = page.getByRole("spinbutton", { name: "Brush size" });
    await expect(brushSize).toBeVisible();
    const before = await brushSize.inputValue();
    await page.getByRole("button", { name: "Increase brush size" }).click();
    const after = await brushSize.inputValue();
    expect(Number(after)).toBeGreaterThan(Number(before));

    const bodyFont = await page.evaluate(
      () => getComputedStyle(document.body).fontFamily,
    );
    expect(bodyFont).toMatch(/0xProto|ProtoNerd|__0xProto/i);

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

    await page.getByRole("button", { name: "Fill bucket" }).click();
    await canvas.click({ position: { x: 120, y: 120 } });

    await expect
      .poll(
        async () =>
          canvas.evaluate((el) => {
            const c = el as HTMLCanvasElement;
            const ctx = c.getContext("2d");
            if (!ctx) return false;
            const scale = c.width / Math.max(1, c.clientWidth);
            const x = Math.floor(120 * scale);
            const y = Math.floor(120 * scale);
            const p = ctx.getImageData(x, y, 1, 1).data;
            return p[0] < 250 || p[1] < 250 || p[2] < 250;
          }),
        { timeout: 5000 },
      )
      .toBeTruthy();
  });
});
