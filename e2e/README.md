# E2E (Playwright)

Проверка UI без ручного клика. Требуются запущенные API и фронт.

Для **быстрого** прогона без Ollama в `apps/api/.env` добавьте `DISABLE_LLM=1` и
перезапустите API (как в CI). С Ollama (llama3.2 на этом ПК) типичные задержки: кейс ~25 с,
экзамен (старт + завершение) ~1–1.5 мин; полный E2E ~2 мин.
Таймауты в `candidate-path.spec.ts`: кейс 120 с, экзамен 180 с.

## Подготовка

```powershell
# Терминал 1 — БД и API (см. docs/VNESHNIY-ZAPUSK.md)
cd apps\api
.\run.ps1

# Терминал 2 — фронт
cd ..\..
npm run dev
```

## Запуск тестов

```powershell
cd e2e
npm install
npx playwright install chromium
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:5173"
npm test
```

Переменная `PLAYWRIGHT_BASE_URL` — URL Vite (по умолчанию 5173).
