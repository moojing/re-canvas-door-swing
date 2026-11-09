import { expect, test, type Page } from "@playwright/test";

const detail = "/dev/animations/direct-entry?preset=biohazard-1996-a01-iron-door";
const devices = ["Desktop", "Tablet", "Phone"];

const fadeValues = (page: Page) => page.locator("main canvas").evaluateAll((canvases) =>
  canvases.map((canvas) => (canvas.nextElementSibling as HTMLElement).style.opacity)
);

test("device comparison shares playback, sound, seeking and reset", async ({ page }, testInfo) => {
  await page.goto(detail);
  await expect(page.locator("main canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "Compare devices", exact: true }).click();
  await expect(page.locator("main canvas")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();

  for (const [index, [width, height]] of [[1440, 900], [768, 1024], [390, 844]].entries()) {
    const viewport = page.getByRole("img", { name: `${devices[index]} animation preview`, exact: true });
    await expect(viewport.locator("canvas")).toBeVisible();
    expect(await viewport.evaluate((element) => [element.clientWidth, element.clientHeight])).toEqual([width, height]);
  }
  await expect(page.locator("main audio")).toHaveCount(1);
  await page.locator('[aria-label="Device comparison"]').screenshot({ path: testInfo.outputPath("three-device-comparison.png") });
  const timeline = page.getByRole("slider", { name: "Animation progress" });
  await timeline.fill("98");
  const fades = await fadeValues(page);
  expect(Number(fades[0])).toBeGreaterThan(0);
  expect(new Set(fades).size).toBe(1);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(timeline).toHaveValue("0");
  expect(await fadeValues(page)).toEqual(["0", "0", "0"]);

  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator("main audio")).toHaveJSProperty("paused", false, { timeout: 5000 });
  const playback = page.evaluate(() => new Promise<{ samples: number; fadeSamples: number; mismatches: number }>((resolve) => {
    let samples = 0;
    let fadeSamples = 0;
    let mismatches = 0;
    const sample = () => {
      const values = [...document.querySelectorAll("main canvas")].map((canvas) => Number((canvas.nextElementSibling as HTMLElement).style.opacity));
      samples++;
      if (values[0] > 0 && values[0] < 1) fadeSamples++;
      if (new Set(values).size !== 1) mismatches++;
      if (values[0] === 1) resolve({ samples, fadeSamples, mismatches });
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
  await expect.poll(async () => Number(await timeline.inputValue())).toBeGreaterThan(20);
  await expect(timeline).toHaveValue("100", { timeout: 12000 });
  expect(await fadeValues(page)).toEqual(["1", "1", "1"]);
  await expect(page.locator("main audio")).toHaveJSProperty("paused", true);
  const observed = await playback;
  expect(observed.samples).toBeGreaterThan(10);
  expect(observed.fadeSamples).toBeGreaterThan(0);
  expect(observed.mismatches).toBe(0);
});

test("timing edits and Restore keep all device previews synchronized across mode changes", async ({ page }) => {
  const calibrationUrl = process.env.DOOR_CALIBRATION_TEST_URL || "http://127.0.0.1:5177";
  await page.goto(`${calibrationUrl}${detail}`);
  await page.getByRole("button", { name: "Compare devices", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  const timeline = page.getByRole("slider", { name: "Animation progress" });
  await timeline.fill("98");
  const original = await fadeValues(page);
  await page.getByRole("slider", { name: "Fade starts timing", exact: true }).fill("4600");
  const edited = await fadeValues(page);
  expect(new Set(edited).size).toBe(1);
  expect(edited[0]).not.toBe(original[0]);
  await page.getByRole("button", { name: "Single preview", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  await expect(timeline).toHaveValue("98");
  expect(await fadeValues(page)).toEqual([edited[0]]);
  await page.getByRole("button", { name: "Compare devices", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  expect(await fadeValues(page)).toEqual(edited);
  await page.getByRole("button", { name: "Restore preset values", exact: true }).click();
  expect(await fadeValues(page)).toEqual(original);
  await page.getByRole("button", { name: "Full-screen preview", exact: true }).click();
  await expect(page.getByRole("status", { name: "Full-screen preview in progress" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Full-screen preview in progress" })).toHaveCount(0, { timeout: 12000 });
  await expect(timeline).toHaveValue("98");
});

test("comparison preserves progress on mode changes and resets for traversal changes", async ({ page }) => {
  await page.goto(detail);
  const timeline = page.getByRole("slider", { name: "Animation progress" });
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  await timeline.fill("55");
  await page.getByRole("button", { name: "Compare devices", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  await expect(timeline).toHaveValue("55");
  await page.getByRole("button", { name: "Single preview", exact: true }).click();
  await expect(page.locator("main canvas")).toHaveCount(1);
  await expect(timeline).toHaveValue("55");
  await page.getByRole("button", { name: "Compare devices", exact: true }).click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(page.getByRole("button", { name: "Compare devices", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("main canvas")).toHaveCount(3);
  await expect(timeline).toHaveValue("0");
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  await timeline.fill("90");
  expect(new Set(await fadeValues(page)).size).toBe(1);
});

test("comparison stacks on phones without changing logical viewports or overflowing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(detail);
  await page.getByRole("button", { name: "Compare devices", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  const bounds = await page.locator("figure").evaluateAll((elements) => elements.map((element) => {
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x, y, width, height };
  }));
  expect(bounds).toHaveLength(3);
  expect(bounds[1].y).toBeGreaterThanOrEqual(bounds[0].y + bounds[0].height);
  expect(bounds[2].y).toBeGreaterThanOrEqual(bounds[1].y + bounds[1].height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(async () => page.locator("figure").evaluateAll((elements) =>
    new Set(elements.map((element) => element.getBoundingClientRect().top)).size
  )).toBe(1);
  await expect(page.getByRole("img", { name: "Phone animation preview", exact: true })).toHaveJSProperty("clientWidth", 390);
});
