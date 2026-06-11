import { expect, test } from "@playwright/test";

import { loginAsManager } from "./helpers/auth";

test("manager: скачать export.csv", async ({ page }) => {
  await loginAsManager(page);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /скачать csv/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  const path = await download.path();
  expect(path).toBeTruthy();
});

