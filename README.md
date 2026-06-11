# Variant_3 — monorepo: UI-kit + Vite + FastAPI + PostgreSQL

Публичный фронт, **один домен** с API, **простой логин** (без SSO/LDAP),
общий **UI-kit** `@repo/ui`.

## Структура

```
Variant_3/
  docker-compose.yml   # PostgreSQL
  packages/ui/
  apps/web/
  apps/api/            # FastAPI + Alembic
```

## Запуск

### 0. PostgreSQL

Запустите **Docker Desktop**, затем:

```powershell
cd Fronted\Variant_3
docker compose up -d
docker ps
```

В `.env` API используйте драйвер **psycopg** (не psycopg2):

`DATABASE_URL=postgresql+psycopg://neuroexam:neuroexam@127.0.0.1:5433/neuroexam`

Контейнер слушает **5433** на хосте (внутри — 5432), чтобы не пересекаться с
локальным PostgreSQL на Windows.

Если ошибка `password authentication failed for user "neuroexam"` — вы, скорее
всего, попали не в Docker, а в другой сервер на порту 5432. Используйте **5433**
в `.env` и перезапустите `docker compose up -d`.

Если миграции падают с `UnicodeDecodeError` — обновите `.env`, выполните
`pip install -r requirements.txt` и снова `.\migrate.ps1`.

### 1. Миграции и API

```powershell
cd apps\api
copy .env.example .env
.\migrate.ps1
.\run.ps1
```

### 2. Frontend

```powershell
cd Fronted\Variant_3
copy apps\web\.env.example apps\web\.env
npm run dev
```

Откройте http://localhost:5173/login — **admin** / **admin**.

## Экраны MVP

| Раздел | API | Роли |
|--------|-----|------|
| Диагностика | `/api/diagnostic/sessions` | candidate, admin |
| Кейс | `/api/cases` (нужен завершённый срез) | candidate, admin |
| Результат | `/api/results`, `/api/results/{session_id}` | candidate, admin |
| Экзаменатор | `/api/exam/sessions` (нужен завершённый срез) | candidate, admin |
| Кабинет руководителя | `/api/manager/overview` | manager, admin |

**Путь кандидата:** диагностика → завершить срез → кейс → результат →
экзаменатор.

Демо-логины: **demo** / **demo** (кандидат), **manager** / **manager**,
**admin** / **admin**.

### LLM-оценка (кейсы и экзамен)

В `apps/api/.env` (см. `.env.example`):

```env
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
```

После **старта экзамена** API генерирует **3 вопроса** через LLM (с учётом
среза и отправленных кейсов); без ключа — фиксированные шаблоны. После
отправки кейса или завершения экзамена — **балл (0–100)** и **feedback** в БД.
Без ключа оценки — подсказка в feedback, перезапуск `.\run.ps1` после ключа.
`GET /api/health` → `llm_configured`, `db_ok` (проверка PostgreSQL).

Демо-данные в БД: `cd apps/api && python seed_demo.py` (после миграций).

CI: `.github/workflows/ci.yml` (pytest + сборка web).

Повторы запросов к LLM при сбоях: `LLM_MAX_RETRIES`, `LLM_RETRY_DELAY_SECONDS`
(см. `.env.example`; общий клиент `app/services/llm_client.py`).

**Из России для проверки** (без OpenAI): любой API с форматом OpenAI
`chat/completions`. Удобнее всего **Ollama** на своём ПК (бесплатно):

```powershell
ollama pull llama3.2
```

В `.env`: `OPENAI_BASE_URL=http://127.0.0.1:11434/v1`, `LLM_MODEL=llama3.2`,
`OPENAI_API_KEY=ollama`. Альтернатива — **DeepSeek** (`api.deepseek.com`).
Подробнее — комментарии в `apps/api/.env.example`.

Документация: http://localhost:8000/api/docs  
Справочник по `/api/docs`: [docs/spravochnik-api-docs.md](docs/spravochnik-api-docs.md)

### Снапшот (zip)

Из `Fronted`:

```powershell
python make_variant3_zip.py
```

Архив: `Fronted/neuroexam-variant3-mvp-YYYYMMDD-roadmap-abcde.zip`  
(без `node_modules`, `.venv`, `.env` — только `.env.example`).

**Для стороннего человека:** [docs/VNESHNIY-ZAPUSK.md](docs/VNESHNIY-ZAPUSK.md),
журнал улучшений [docs/ROADMAP-ABCDE-ZHURNAL.md](docs/ROADMAP-ABCDE-ZHURNAL.md).

## Хронология

1. **2026-05-04** — monorepo UI + web.
2. **2026-05-18** — FastAPI, UI-kit, связка с фронтом.
3. **2026-05-18** — Диагностика (CRUD), снапшот zip.
4. **2026-05-18** — PostgreSQL + Alembic; экран **Кейс** с привязкой к срезу.
5. **2026-05-18** — порт БД 5433, справочники в `docs/`, снапшот
   `neuroexam-variant3-mvp-20260518-postgres.zip`.
6. **2026-05-18** — экран **Результат**: сводка по срезу и кейсам из БД.
7. **2026-05-18** — **Роли**: кандидат / руководитель / admin, кабинет
   руководителя, меню и API по правам.
8. **2026-05-18** — **LLM-оценка** ответов на кейс (OpenAI-compatible API).
9. **2026-05-21** — снапшот `neuroexam-variant3-mvp-*-llm-roles.zip`.
10. **2026-05-25** — экран **Экзаменатор** (`/api/exam`), миграция
    `exam_sessions` / `exam_questions`, обзор экзаменов в кабинете руководителя.
11. **2026-05-25** — парсинг ошибок API на фронте (`detail` из FastAPI).
12. **2026-05-25** — **Результат**: сводка по кейсам и экзаменам одного среза.
13. **2026-05-25** — снапшот `neuroexam-variant3-mvp-20260525-llm-roles.zip`.
14. **2026-05-25** — pytest: diagnostic, cases, exam, results (SQLite, мок LLM).
15. **2026-05-25** — LLM-генерация вопросов экзамена при `POST …/exam/…/start`.
16. **2026-05-25** — `llm_client`: общий HTTP-клиент LLM с повторами (Ollama).
17. **2026-05-25** — чеклист пути кандидата (Главная, Диагностика).
18. **2026-05-25** — кабинет руководителя: фильтр и drill-down по кандидату.
19. **2026-05-25** — Roadmap A–E: CI, health+db, seed, batch LLM экзамена,
    users в БД, React Query, CSV export, Playwright E2E, zip с пояснениями.
