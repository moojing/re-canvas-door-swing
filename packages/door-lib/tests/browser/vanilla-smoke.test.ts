import { expect, test } from "@playwright/test";

type DoorEntranceTestApi = {
  play: () => void;
  resume: () => void;
  reset: (preset?: string) => void;
  seek: (progress: number) => void;
  preview: (overrides: {
    swingDirection?: "toward-viewer" | "away-from-viewer";
    timingEvents?: Record<string, number>;
  }) => void;
  unmount: () => void;
  ready: () => boolean;
  progress: () => number;
};

declare global {
  interface Window {
    __doorEntranceTestApi__?: DoorEntranceTestApi;
    $RefreshReg$?: () => void;
    $RefreshSig$?: () => <T>(type: T) => T;
  }
}

test("blue double keeps real leaves visible at fade start and honors swing direction", async ({ page }, testInfo) => {
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
  await page.evaluate(() => {
    const select = document.querySelector<HTMLSelectElement>("#door-preset")!;
    const id = "biohazard-1996-b02-blue-panel-double-door";
    select.add(new Option(id, id));
    select.value = id;
    select.dispatchEvent(new Event("change"));
  });
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
  const capture = (direction?: "toward-viewer" | "away-from-viewer") => page.evaluate((direction) => {
    if (direction) window.__doorEntranceTestApi__?.preview({ swingDirection: direction });
    window.__doorEntranceTestApi__?.seek(5150 / 5350);
    const canvas = document.querySelector("canvas")!;
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) throw new Error("WebGL context unavailable");
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let visible = 0;
    let checksum = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] + pixels[index + 1] + pixels[index + 2] > 24) visible++;
      checksum += pixels[index] * ((index % 97) + 1);
    }
    return { fraction: visible / (canvas.width * canvas.height), checksum };
  }, direction);
  const authored = await capture();
  expect(authored.fraction).toBeGreaterThan(0.25);
  await page.locator("canvas").screenshot({ path: testInfo.outputPath("blue-double-fade-start.png") });
  const toward = await capture("toward-viewer");
  expect(Math.abs(toward.checksum - authored.checksum) / authored.checksum).toBeGreaterThan(0.005);
  expect((await capture("away-from-viewer")).fraction).toBeCloseTo(authored.fraction, 2);
  await page.evaluate(() => window.__doorEntranceTestApi__?.reset());
  expect((await capture()).fraction).toBeCloseTo(authored.fraction, 2);
});

test("1998 grid keeps the real leaf visible through fade start in both traversals", async ({ page }, testInfo) => {
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
  for (const suffix of ["", "-leave"]) {
    await page.evaluate((suffix) => {
      const select = document.querySelector<HTMLSelectElement>("#door-preset")!;
      const id = `biohazard-1998-a03-grid-knob-door${suffix}`;
      select.add(new Option(id, id));
      select.value = id;
      select.dispatchEvent(new Event("change"));
    }, suffix);
    await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
    const fraction = await page.evaluate(() => {
      window.__doorEntranceTestApi__?.seek(4550 / 4800);
      const canvas = document.querySelector("canvas")!;
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      if (!gl) throw new Error("WebGL context unavailable");
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let visible = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index] + pixels[index + 1] + pixels[index + 2] > 24) visible++;
      }
      return visible / (canvas.width * canvas.height);
    });
    expect(fraction).toBeGreaterThan(0.015);
    await page.locator("canvas").screenshot({ path: testInfo.outputPath(`grid${suffix}-fade-start.png`) });
  }
});

test("blue sound stays silent during the closed wait and starts with opening", async ({ page }) => {
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
  await page.evaluate(() => {
    const select = document.querySelector<HTMLSelectElement>("#door-preset")!;
    const id = "biohazard-1996-b02-blue-panel-double-door";
    select.add(new Option(id, id));
    select.value = id;
    select.dispatchEvent(new Event("change"));
  });
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
  await page.locator("#door-play").click();
  await page.waitForFunction(() => (window.__doorEntranceTestApi__?.progress() ?? 0) > 0.6);
  expect(await page.locator("audio").evaluate((audio) => audio.paused)).toBe(true);
  await page.evaluate(() => {
    window.__doorEntranceTestApi__?.seek(4320 / 5350);
    window.__doorEntranceTestApi__?.resume();
  });
  await expect.poll(() => page.locator("audio").evaluate((audio) => audio.paused), {
    timeout: 700,
  }).toBe(false);
  await page.waitForFunction(() => (window.__doorEntranceTestApi__?.progress() ?? 0) >= 5150 / 5350);
  await expect.poll(() => page.locator("audio").evaluate((audio) => audio.paused)).toBe(true);
});

test("vanilla sample renders and responds to playback controls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.$RefreshReg$ = () => undefined;
    window.$RefreshSig$ = () => (type) => type;
  });

  await page.goto("/samples/vanilla.html?testMode");

  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();

  const initialBox = await canvas.boundingBox();
  expect(initialBox?.width).toBeGreaterThan(100);
  expect(initialBox?.height).toBeGreaterThan(100);
  const initialScreenshot = await canvas.screenshot();

  await page.evaluate(() => window.__doorEntranceTestApi__?.seek(0.45));
  await page.waitForFunction(
    () => window.__doorEntranceTestApi__?.progress() === 0.45
  );
  const seekScreenshot = await canvas.screenshot();
  expect(Buffer.compare(initialScreenshot, seekScreenshot)).not.toBe(0);

  await page.evaluate(() => window.__doorEntranceTestApi__?.play());
  await expect(page.locator("#door-status")).toHaveText("播放中...");

  await page.evaluate(() => window.__doorEntranceTestApi__?.reset());
  await page.waitForFunction(
    () => window.__doorEntranceTestApi__?.progress() === 0
  );

  expect(seekScreenshot.length).toBeGreaterThan(1_000);

  await page.evaluate(() => window.__doorEntranceTestApi__?.unmount());
  await expect(canvas).toHaveCount(0);
});

test("vanilla sample starts the door sound after a user plays the animation", async ({
  page,
}) => {
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());

  await page.locator("#door-play").click();

  await expect
    .poll(async () =>
      page.locator("audio").evaluate((audio) => !audio.paused)
    )
    .toBe(true);
});

test("preview overrides redraw the current frame without replacing the canvas", async ({ page }) => {
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());

  const canvas = page.locator("canvas");
  await page.evaluate(() => window.__doorEntranceTestApi__?.seek(0.85));
  await canvas.evaluate((element) => { element.dataset.previewCanvas = "stable"; });
  const authored = await canvas.screenshot();

  await page.evaluate(() => window.__doorEntranceTestApi__?.preview({ swingDirection: "toward-viewer" }));
  const reversed = await canvas.screenshot();
  expect(Buffer.compare(reversed, authored)).not.toBe(0);
  await expect(canvas).toHaveAttribute("data-preview-canvas", "stable");
  expect(await page.evaluate(() => window.__doorEntranceTestApi__?.progress())).toBe(0.85);

  await page.evaluate(() => window.__doorEntranceTestApi__?.preview({}));
  const restored = await canvas.screenshot();
  expect(Buffer.compare(restored, authored)).toBe(0);
});

test("vanilla playback keeps advancing during the iron-door micro-opening", async ({ page }) => {
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
  const canvas = page.locator("canvas");

  await page.evaluate(() => window.__doorEntranceTestApi__?.seek(0.70));
  const first = await canvas.screenshot();
  await page.evaluate(() => window.__doorEntranceTestApi__?.seek(0.75));
  const advancing = await canvas.screenshot();

  expect(Buffer.compare(first, advancing)).not.toBe(0);
});

test("timing preview retimes the held frame and restores the authored state", async ({ page }) => {
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
  const canvas = page.locator("canvas");
  await page.evaluate(() => window.__doorEntranceTestApi__?.seek(0.79));
  const authored = await canvas.screenshot();

  await page.evaluate(() => window.__doorEntranceTestApi__?.preview({ timingEvents: { "hold-end": 3900 } }));
  const edited = await canvas.screenshot();
  expect(Buffer.compare(authored, edited)).not.toBe(0);
  await expect(canvas).toHaveCount(1);
  expect(await page.evaluate(() => window.__doorEntranceTestApi__?.progress())).toBe(0.79);

  await page.evaluate(() => window.__doorEntranceTestApi__?.preview({}));
  const restored = await canvas.screenshot();
  expect(Buffer.compare(restored, authored)).toBe(0);
});

test("a delayed sound start cannot overwrite a newly retimed preview", async ({ page }) => {
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
  await page.locator("#door-play").click();
  await expect.poll(() => page.locator("audio").evaluate((audio) => !audio.paused)).toBe(true);
  await page.evaluate(() => window.__doorEntranceTestApi__?.seek(0.75));

  await page.locator("audio").evaluate((audio) => {
    audio.play = () => new Promise<void>((resolve) => window.setTimeout(resolve, 150));
  });
  await page.evaluate(() => window.__doorEntranceTestApi__?.resume());
  await page.evaluate(() => window.__doorEntranceTestApi__?.preview({ timingEvents: { "slight-open": 3500 } }));
  const expectedTime = await page.locator("audio").evaluate((audio) => audio.currentTime);
  await page.waitForTimeout(200);
  const result = await page.locator("audio").evaluate((audio) => ({ paused: audio.paused, time: audio.currentTime }));
  expect(result.paused).toBe(true);
  expect(result.time).toBeCloseTo(expectedTime, 2);
});

test("switching presets updates the sound mapping on the same mounted door", async ({ page }) => {
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
  await page.waitForFunction(() => {
    const audio = document.querySelector("audio");
    return audio && Number.isFinite(audio.duration) && audio.duration > 0;
  });
  const before = await page.locator("audio").evaluate((audio) => audio.playbackRate);

  await page.evaluate(() => {
    window.__doorEntranceTestApi__?.reset("biohazard-1999-a01-parking-door");
    window.__doorEntranceTestApi__?.preview({ timingEvents: { "open-end": 3110, passage: 3120 } });
  });
  expect(await page.locator("audio").evaluate((audio) => audio.paused)).toBe(true);

  await page.evaluate(() => window.__doorEntranceTestApi__?.reset("biohazard-1998-a01-no-handle-door"));
  const after = await page.locator("audio").evaluate((audio) => audio.playbackRate);
  const duration = await page.locator("audio").evaluate((audio) => audio.duration);
  expect(before).toBeCloseTo(duration * 0.30 / 1.9, 1);
  expect(after).toBeCloseTo(duration * 0.30 / 2.18, 1);
  expect(after).toBeLessThan(before);
});

test("a pending first sound unlock preserves a newly sought and retimed frame", async ({ page }) => {
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
  await page.waitForFunction(() => {
    const audio = document.querySelector("audio");
    return audio && Number.isFinite(audio.duration) && audio.duration > 0;
  });
  await page.locator("audio").evaluate((audio) => {
    const nativePlay = audio.play.bind(audio);
    audio.play = () => {
      audio.dataset.unlockPending = "true";
      return new Promise<void>((resolve) => window.setTimeout(() => {
        audio.play = nativePlay;
        resolve();
      }, 300));
    };
  });
  await page.locator("#door-play").click();
  await expect(page.locator("audio")).toHaveAttribute("data-unlock-pending", "true");
  await page.evaluate(() => {
    window.__doorEntranceTestApi__?.seek(0.75);
    window.__doorEntranceTestApi__?.preview({ timingEvents: { "slight-open": 3500 } });
  });
  const expectedTime = await page.locator("audio").evaluate((audio) => audio.currentTime);
  expect(expectedTime).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  const result = await page.locator("audio").evaluate((audio) => ({ paused: audio.paused, time: audio.currentTime, muted: audio.muted }));
  expect(result.paused).toBe(true);
  expect(result.muted).toBe(false);
  expect(result.time).toBeCloseTo(expectedTime, 2);
  expect(await page.evaluate(() => window.__doorEntranceTestApi__?.progress())).toBe(0.75);
  await page.evaluate(() => window.__doorEntranceTestApi__?.resume());
  await expect.poll(() => page.locator("audio").evaluate((audio) => !audio.paused && !audio.muted)).toBe(true);
});

test("automatic sliding opens a symmetric visible gap and reset closes it in both traversals", async ({ page }, testInfo) => {
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
  const capture = (progress: number) => page.evaluate((progress) => {
    window.__doorEntranceTestApi__?.seek(progress);
    const canvas = document.querySelector("canvas")!;
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) throw new Error("WebGL unavailable");
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let left = 0, right = 0, middle = 0;
    let minY = canvas.height, maxY = -1;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        if (pixels[i] + pixels[i + 1] + pixels[i + 2] <= 24) continue;
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        if (x < canvas.width / 2) left++; else right++;
        if (x > canvas.width * 0.4 && x < canvas.width * 0.6) middle++;
      }
    }
    const area = canvas.width * canvas.height;
    // At the held closed framing the authored window is above the push plate.
    const scale = canvas.height / (2 * (6.65 - 0.221) * Math.tan(Math.PI / 6));
    const x = Math.round(canvas.width / 2 - 1.5 * scale);
    const patchLuma = (y: number) => {
      let sum = 0;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const i = ((Math.round(y) + dy) * canvas.width + x + dx) * 4;
        sum += pixels[i] + pixels[i + 1] + pixels[i + 2];
      }
      return sum / 49;
    };
    const upper = patchLuma(canvas.height / 2 + 1.68 * scale);
    const lower = patchLuma(canvas.height / 2 - 1.68 * scale);
    return { left: left / area, right: right / area, middle: middle / area, heightFraction: (maxY - minY + 1) / canvas.height, windowRatio: upper / Math.max(lower, 1) };
  }, progress);
  for (const suffix of ["", "-leave"]) {
    await page.evaluate((suffix) => {
      const select = document.querySelector<HTMLSelectElement>("#door-preset")!;
      const id = `biohazard-1996-b07-automatic-sliding-door${suffix}`;
      select.add(new Option(id, id)); select.value = id;
      select.dispatchEvent(new Event("change"));
    }, suffix);
    await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
    await expect(page.locator("audio")).toHaveAttribute("src", /freesound_kyodon-automatic-door-153423-hq\.mp3/);
    await expect.poll(async () => (await capture(3250 / 5650)).windowRatio).toBeLessThan(0.6);
    const closed = await capture(3250 / 5650);
    expect(closed.middle).toBeGreaterThan(0.1);
    expect(closed.heightFraction).toBeGreaterThan(0.78);
    expect(closed.heightFraction).toBeLessThan(0.83);
    const open = await capture(4600 / 5650);
    expect(open.middle).toBeLessThan(0.01);
    expect(open.left).toBeGreaterThan(0.04);
    expect(open.right).toBeGreaterThan(0.04);
    expect(Math.abs(open.left - open.right)).toBeLessThan(0.04);
    await page.locator("canvas").screenshot({ path: testInfo.outputPath(`sliding${suffix}-fade-start.png`) });
    await page.evaluate(() => window.__doorEntranceTestApi__?.reset());
    expect((await capture(0)).middle).toBeGreaterThan(0.08);
    await page.evaluate(() => window.__doorEntranceTestApi__?.play());
    await expect(page.locator("audio")).toHaveJSProperty("paused", true);
    await expect.poll(() => page.locator("audio").evaluate((element) => (element as HTMLAudioElement).duration)).toBeGreaterThan(3.9);
    expect(await page.locator("audio").evaluate((element) => (element as HTMLAudioElement).playbackRate)).toBeCloseTo(1, 2);
    await expect(page.locator("audio")).toHaveJSProperty("paused", false, { timeout: 5000 });
    await page.evaluate(() => window.__doorEntranceTestApi__?.seek(5100 / 5650));
    const overlay = page.locator('div[style*="pointer-events: none"][style*="background: rgb(0, 0, 0)"]');
    await expect(overlay).toHaveCSS("opacity", "1");
    await expect(overlay).toHaveCSS("background-color", "rgb(0, 0, 0)");
    await expect(page.locator("audio")).toHaveJSProperty("volume", 1);
    await page.evaluate(() => window.__doorEntranceTestApi__?.play());
    await expect(page.locator("audio")).toHaveJSProperty("paused", false);
    await expect.poll(() => page.locator("audio").evaluate((a) => (a as HTMLAudioElement).volume)).toBeLessThan(0.9);
    await expect(page.locator("audio")).toHaveJSProperty("paused", true, { timeout: 3000 });
    await expect(page.locator("audio")).toHaveJSProperty("volume", 0);
    await page.evaluate(() => window.__doorEntranceTestApi__?.play());
    await expect(page.locator("audio")).toHaveJSProperty("volume", 1);
    await page.evaluate(() => window.__doorEntranceTestApi__?.reset());
    await expect(page.locator("audio")).toHaveJSProperty("paused", true);
    await expect(page.locator("audio")).toHaveJSProperty("volume", 1);
  }
});


test("parking approach starts smaller, then reaches the cropped closed wait", async ({ page }) => {
  await page.goto("/samples/vanilla.html?testMode");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
  await page.evaluate(() => {
    const select = document.querySelector<HTMLSelectElement>("#door-preset")!;
    const id = "biohazard-1999-a01-parking-door";
    select.add(new Option(id, id));
  });
  await page.selectOption("#door-preset", "biohazard-1999-a01-parking-door");
  await page.waitForFunction(() => window.__doorEntranceTestApi__?.ready());
  const heightAt = (ms: number) => page.evaluate((ms) => {
    window.__doorEntranceTestApi__?.seek(ms / 4800);
    const canvas = document.querySelector("canvas")!;
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) throw new Error("WebGL unavailable");
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let low = canvas.height, high = -1;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 24) {
        low = Math.min(low, y); high = Math.max(high, y);
      }
    }
    return (high - low + 1) / canvas.height;
  }, ms);
  await expect.poll(() => heightAt(0)).toBeGreaterThan(0.75);
  expect(await heightAt(0)).toBeLessThan(0.80);
  expect(await heightAt(500)).toBeCloseTo(await heightAt(0), 2);
  expect(await heightAt(1000)).toBeGreaterThan(0.84);
  expect(await heightAt(1000)).toBeLessThan(0.93);
  expect(await heightAt(2300)).toBeGreaterThan(0.98);
  expect(await heightAt(3100)).toBeGreaterThan(0.98);
  await page.evaluate(() => window.__doorEntranceTestApi__?.reset());
  expect(await heightAt(0)).toBeLessThan(0.80);
});
