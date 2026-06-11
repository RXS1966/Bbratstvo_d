import { expect, test } from "@playwright/test";

import { loginAsCandidate } from "./helpers/auth";
import {
  answerAllQuestionsAndCompleteExam,
  createAndStartExam,
  getCompletedDiagnosticSessionId,
  loginToken
} from "./helpers/api";

test.describe("кандидатский путь MVP", () => {
  test.describe.configure({ mode: "serial" });

  const suffix = Date.now().toString();
  const roleTitle = `E2E Менеджер ${suffix}`;
  const caseTitle = `E2E Кейс ${suffix}`;
  const examTitle = `Экзамен: ${roleTitle}`;

  test("логин demo → панель", async ({ page }) => {
    await loginAsCandidate(page);
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Главная", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: "Панель" })).toBeVisible();
  });

  test("диагностика: создать → запустить → завершить срез", async ({
    page
  }) => {
    await loginAsCandidate(page);

    await page.getByLabel(/роль \/ должность/i).fill(roleTitle);
    await page.getByLabel(/контекст среза/i).fill(
      "E2E: оценка навыков продаж в B2B."
    );
    await page.getByLabel(/kpi/i).fill("Конверсия, средний чек");
    await page.getByRole("button", { name: /создать срез/i }).click();

    const sessionCard = page
      .locator("div.rounded-lg.border.border-slate-200.p-4")
      .filter({ hasText: roleTitle });
    await expect(sessionCard).toBeVisible();
    await sessionCard.getByRole("button", { name: /запустить срез/i }).click();
    await expect(sessionCard.getByText(/^в работе$/)).toBeVisible();
    await sessionCard
      .getByRole("button", { name: /завершить срез/i })
      .click();
    await expect(sessionCard.getByText(/^завершён$/)).toBeVisible();
  });

  test("кейс: создать и отправить на оценку", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsCandidate(page);
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Кейс", exact: true })
      .click();

    const caseSessionOption = page
      .locator("#diagnostic_session option")
      .filter({ hasText: roleTitle })
      .first();
    const caseSessionId = await caseSessionOption.getAttribute("value");
    expect(caseSessionId).toBeTruthy();
    await page.locator("#diagnostic_session").selectOption(caseSessionId!);
    await page.getByLabel(/название кейса/i).fill(caseTitle);
    await page.getByLabel(/^условие$/i).fill(
      "Клиент считает цену завышенной. Предложите план действий."
    );
    await page.getByLabel(/материалы/i).fill("Прайс, кейсы конкурентов");
    await page.getByRole("button", { name: /создать кейс/i }).click();

    const caseCard = page
      .locator("div.rounded-lg.border.border-slate-200.p-4")
      .filter({ hasText: caseTitle });
    await expect(caseCard).toBeVisible();
    await caseCard
      .getByPlaceholder(/введите решение кейса/i)
      .fill("E2E: уточню потребности, покажу ценность, предложу пилот.");
    await caseCard
      .getByRole("button", { name: /отправить на оценку/i })
      .click();
    await expect(
      caseCard.getByRole("link", { name: /смотреть результат/i })
    ).toBeVisible({ timeout: 60_000 });
  });

  test("результат: сводка по срезу с кейсом", async ({ page }) => {
    await loginAsCandidate(page);
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Результат", exact: true })
      .click();

    const sliceRow = page
      .locator("div.rounded-lg.border.p-4")
      .filter({ hasText: roleTitle });
    await expect(sliceRow).toBeVisible();
    await sliceRow.getByRole("button", { name: /смотреть детали/i }).click();

    await expect(
      page.getByRole("heading", { name: "Детали результата" })
    ).toBeVisible();
    await expect(page.getByText(caseTitle)).toBeVisible();
    await expect(page.getByText("отправлен").first()).toBeVisible();
  });

  test("экзаменатор: создать → пройти → завершить", async ({ page }) => {
    test.setTimeout(180_000);
    const token = await loginToken(page.request, "demo", "demo");
    const diagnosticSessionId = await getCompletedDiagnosticSessionId(
      page.request,
      token,
      roleTitle
    );
    const examId = await createAndStartExam(
      page.request,
      token,
      diagnosticSessionId,
      30
    );
    await answerAllQuestionsAndCompleteExam(page.request, token, examId);

    await loginAsCandidate(page);
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Экзаменатор", exact: true })
      .click();

    const completedCard = page
      .locator("div.rounded-lg.border.border-slate-200.p-4")
      .filter({ hasText: examTitle });
    await expect(completedCard.getByText(/^завершён$/)).toBeVisible({
      timeout: 30_000
    });
    await expect(completedCard.getByText(/экзамен завершён/i)).toBeVisible();
  });
});
