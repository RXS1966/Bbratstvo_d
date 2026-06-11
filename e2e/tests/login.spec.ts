import { expect, test } from "@playwright/test";

import { loginAsCandidate } from "./helpers/auth";

test("кандидат demo входит и видит панель", async ({ page }) => {
  await loginAsCandidate(page);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Главная", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Панель" })).toBeVisible();
});