import { expect, type Page } from "@playwright/test";

export async function loginAsCandidate(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/логин/i).fill("demo");
  await page.getByLabel(/пароль/i).fill("demo");
  await page.getByRole("button", { name: /войти/i }).click();
  await expect(page).toHaveURL(/\/app\/diagnostic/);
}

export async function loginAsManager(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/логин/i).fill("manager");
  await page.getByLabel(/пароль/i).fill("manager");
  await page.getByRole("button", { name: /войти/i }).click();
  await expect(page).toHaveURL(/\/app\/manager/);
}
