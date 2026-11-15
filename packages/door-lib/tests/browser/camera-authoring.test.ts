import { expect, test } from "@playwright/test";
const path = "/dev/animations/direct-entry?preset=biohazard-1999-a02-iron-window-door";
const calibration = process.env.DOOR_CALIBRATION_TEST_URL || "http://127.0.0.1:5177";

test("authoring draft survives Reset/device switch and remains isolated by traversal", async ({ page }, testInfo) => {
  await page.goto(`${calibration}${path}`);
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  const panel = page.getByRole("region", { name: "Camera authoring" });
  await expect(panel).toBeVisible();
  await expect(page.getByRole("img", { name: "Reference animation preview" })).toBeVisible();
  const initial = panel.getByRole("spinbutton", { name: "開場門高 (%)", exact: true });
  const original = await initial.inputValue();
  await initial.fill("80");
  await expect(initial).toHaveValue("80");
  await panel.getByRole("spinbutton", { name: "開場門高 (%)", exact: true }).fill("999");
  await expect(panel.getByRole("alert")).toBeVisible();
  await initial.fill("80");
  await expect(panel.getByRole("alert")).toHaveCount(0);
  await panel.getByRole("spinbutton", { name: "開門前等待：增加秒數", exact: true }).fill("0.5");
  await expect(page.getByLabel("Animation duration", { exact: true })).toHaveText("5.30 s");
  await panel.getByRole("spinbutton", { name: "鏡頭停留：增加秒數", exact: true }).fill("0.2");
  await panel.getByRole("spinbutton", { name: "鏡頭前進速度", exact: true }).fill("1.2");
  await page.getByRole("slider", { name: "Opening starts timing", exact: true }).fill("2200");
  await expect(page.getByRole("button", { name: "Seek to Opening starts", exact: true })).toHaveText("Opening starts · 2.70 s");
  await page.getByRole("slider", { name: "Animation progress" }).fill("40");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(initial).toHaveValue("80");
  await expect(page.getByRole("slider", { name: "Animation progress" })).toHaveValue("0");
  await page.getByRole("button", { name: "Compare devices", exact: true }).click();
  await expect(page.locator("main canvas")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  await expect(initial).toHaveValue("80");
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(initial).not.toHaveValue("80");
  await page.getByRole("button", { name: "Enter", exact: true }).click();
  await expect(initial).toHaveValue("80");
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Single preview", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath("camera-authoring.png"), fullPage: true });
  await page.getByRole("button", { name: "Full-screen preview", exact: true }).click();
  await expect(page.getByRole("status", { name: "Full-screen preview in progress" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Full-screen preview in progress" })).toHaveCount(0, { timeout: 12000 });
  await page.getByRole("button", { name: "Restore preset values", exact: true }).click();
  await expect(initial).toHaveValue(original);
  await expect(page.getByLabel("Animation duration", { exact: true })).toHaveText("4.80 s");
  await initial.fill("85");
  await page.reload();
  await expect(initial).toHaveValue(original);
});

test("ordinary preview and production do not expose author controls", async ({ page }) => {
  for (const url of [path, `${process.env.DOOR_PRODUCTION_TEST_URL || "http://127.0.0.1:4176"}/re-canvas-door-swing${path}`]) {
    await page.goto(url);
    await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
    await expect(page.getByRole("region", { name: "Camera authoring" })).toHaveCount(0);
  }
});

test("portrait camera fitting after a pace edit matches a freshly mounted draft", async ({ page }) => {
  await page.goto(`${calibration}${path}`);
  await page.getByRole("button", { name: "Compare devices", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  const pace = page.getByRole("spinbutton", { name: "鏡頭前進速度", exact: true });
  await pace.fill("2");
  await page.getByRole("slider", { name: "Animation progress", exact: true }).fill("40");
  const phone = page.getByRole("img", { name: "Phone animation preview", exact: true }).locator("canvas");
  const edited = await phone.screenshot();
  await page.getByRole("button", { name: "Single preview", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Compare devices", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  // A remount also starts with the published profile. Force a changed cache key
  // then restore the identical draft, to obtain an independently refreshed fit.
  const wait = page.getByRole("spinbutton", { name: "開門前等待：增加秒數", exact: true });
  await wait.fill("0.1");
  await wait.fill("0");
  await page.getByRole("slider", { name: "Animation progress", exact: true }).fill("40");
  expect((await phone.screenshot()).equals(edited)).toBe(true);
});

test("phone framing changes only phone, inherits when cleared and survives layout/reset", async ({ page }, testInfo) => {
  await page.goto(`${calibration}${path}`);
  await page.getByRole("button", { name: "Compare devices", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  const canvas = (device: string) => page.getByRole("img", { name: `${device} animation preview`, exact: true }).locator("canvas");
  await page.evaluate(async () => {
    const url = performance.getEntriesByType("resource").map(e => e.name).find(n => /\/deps\/three\.js\?/.test(n))!;
    const T = await import(/* @vite-ignore */ url);
    const original = T.Mesh.prototype.onBeforeRender;
    (window as any).__phoneFrames = new Map();
    T.Mesh.prototype.onBeforeRender = function(renderer: any, scene: any, camera: any, ...rest: any[]) {
      (window as any).__phoneFrames.set(renderer.domElement, { renderer, scene, camera });
      return original.call(this, renderer, scene, camera, ...rest);
    };
  });
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  const pixels = (device: string) => canvas(device).evaluate(element => {
    const frame = (window as any).__phoneFrames.get(element);
    frame.renderer.render(frame.scene, frame.camera);
    return (element as HTMLCanvasElement).toDataURL();
  });
  const initial = page.getByRole("spinbutton", { name: "手機開場門高 (%)", exact: true });
  await expect(initial).toBeVisible();
  const baseline = [];
  for (const device of ["Desktop", "Tablet", "Phone"]) baseline.push(await pixels(device));
  await initial.fill("60");
  const x = page.getByRole("spinbutton", { name: "手機水平偏移 (%)", exact: true });
  await x.fill("15");
  expect((await pixels("Phone")) === baseline[2]).toBe(false);
  expect((await pixels("Desktop")) === baseline[0]).toBe(true);
  expect((await pixels("Tablet")) === baseline[1]).toBe(true);
  await expect(page.getByLabel("Animation duration", { exact: true })).toHaveText("4.80 s");
  const edited = await pixels("Phone");
  await x.fill("99");
  await expect(page.getByRole("region", { name: "Camera authoring" }).getByRole("alert")).toBeVisible();
  expect((await pixels("Phone")) === edited).toBe(true);
  await x.fill("15");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByRole("button", { name: "Single preview", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Compare devices", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  expect((await pixels("Phone")) === edited).toBe(true);
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(initial).toHaveValue("");
  await page.getByRole("button", { name: "Enter", exact: true }).click();
  await expect(initial).toHaveValue("60");
  await expect(x).toHaveValue("15");
  await initial.fill("");
  await x.fill("");
  expect((await pixels("Phone")) === baseline[2]).toBe(true);
  await initial.fill("65");
  await page.getByRole("button", { name: "Restore preset values", exact: true }).click();
  await expect(initial).toHaveValue("");
  expect((await pixels("Phone")) === baseline[2]).toBe(true);
  await initial.fill("75");
  await page.reload();
  await expect(initial).toHaveValue("");
  await page.screenshot({ path: testInfo.outputPath("phone-framing.png"), fullPage: true });
});

test("phone composition preserves camera pose, supports both signs and responds to fullscreen rotation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
  await page.evaluate(async () => {
    const url = performance.getEntriesByType("resource").map(e => e.name).find(n => /\/deps\/three\.js\?/.test(n))!;
    const T = await import(/* @vite-ignore */ url);
    const beforeRender = T.Mesh.prototype.onBeforeRender;
    T.Mesh.prototype.onBeforeRender = function(renderer: any, scene: any, camera: any, ...rest: any[]) {
      const projected = new T.Vector3(0, 0, 0).project(camera);
      (window as any).__phonePose = { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(),
        projected: projected.toArray(), offset: camera.view?.enabled ? [camera.view.offsetX, camera.view.offsetY] : null };
      return beforeRender.call(this, renderer, scene, camera, ...rest);
    };
    const root = document.querySelector<HTMLElement>("#door-root > div")!;
    root.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;max-width:none";
    window.__doorEntranceTestApi__!.seek(.4);
  });
  const pose = () => page.evaluate(() => (window as any).__phonePose);
  await page.waitForFunction(() => (window as any).__phonePose?.offset === null);
  const original = await pose();
  for (const sign of [1, -1]) {
    await page.evaluate(sign => window.__doorEntranceTestApi__!.preview({ phoneFraming: {
      offsetXPercent: 15 * sign, offsetYPercent: 10 * sign,
    } }), sign);
    const shifted = await pose();
    expect(shifted.position).toEqual(original.position);
    expect(shifted.quaternion).toEqual(original.quaternion);
    expect(shifted.projected[0] - original.projected[0]).toBeCloseTo(.3 * sign, 8);
    expect(shifted.projected[1] - original.projected[1]).toBeCloseTo(.2 * sign, 8);
  }
  await page.evaluate(() => window.__doorEntranceTestApi__!.preview({ phoneFraming: {
    initialHeightPercent: 60, approachHeightPercent: 80, offsetXPercent: 15, offsetYPercent: 10,
  } }));
  const phone = await pose();
  expect(phone.position).not.toEqual(original.position);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() => document.querySelector<HTMLElement>("#door-root > div")!.clientWidth > 700 &&
    Math.abs((window as any).__phonePose.offset?.[0] + document.querySelector<HTMLElement>("#door-root > div")!.clientWidth * .15) < .01);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForFunction(() => (window as any).__phonePose.offset === null);
  const shared = await pose();
  await page.evaluate(() => window.__doorEntranceTestApi__!.preview({}));
  expect(await pose()).toEqual(shared);
  await page.evaluate(() => window.__doorEntranceTestApi__!.preview({ phoneFraming: {
    initialHeightPercent: 60, approachHeightPercent: 80, offsetXPercent: 15, offsetYPercent: 10,
  } }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector<HTMLElement>("#door-root > div")!.clientWidth < 400 &&
    Math.abs((window as any).__phonePose.offset?.[0] + document.querySelector<HTMLElement>("#door-root > div")!.clientWidth * .15) < .01);
  expect(await pose()).toEqual(phone);
  expect(await page.evaluate(() => window.__doorEntranceTestApi__!.progress())).toBe(.4);
});
