import { expect, test } from "@playwright/test";

test("catalog loads local textures, models and sound without CDN requests", async ({ page }) => {
  const cdnRequests: string[] = [];
  page.on("request", request => {
    if (request.url().includes("cdn.jsdelivr.net")) cdnRequests.push(request.url());
  });
  const texture = page.waitForResponse(response => response.url().includes("/door-assets/textures/") && response.ok());
  const model = page.waitForResponse(response => response.url().includes("/door-assets/models/door_knob.glb") && response.ok());
  const sound = page.waitForResponse(response => response.url().includes("/door-assets/sounds/") && response.ok());
  await page.goto("/");
  await Promise.all([texture, model, sound]);
  await expect(page.locator("canvas").first()).toBeVisible();
  expect(cdnRequests).toEqual([]);
});
