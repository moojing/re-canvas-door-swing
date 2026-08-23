import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";

const browser = await chromium.launch();

try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(process.argv[2], { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const previews = [
      ...document.querySelectorAll(
        '[role="img"][aria-label$="animation preview"]'
      ),
    ];

    return (
      previews.length > 0 &&
      previews.every((preview) => {
        const canvas = preview.querySelector("canvas");
        return canvas && canvas.width > 0 && canvas.height > 0;
      })
    );
  });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        )
      )
  );

  if (await page.locator('[role="dialog"]:visible').count()) {
    throw new Error("A dialog is visible in the social preview");
  }

  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: fileURLToPath(
      new URL("../public/social-preview.png", import.meta.url)
    ),
    type: "png",
  });
} finally {
  await browser.close();
}
