# FastAPI backend (@repo/api)

## Установка и PostgreSQL

```powershell
# из Variant_3
docker compose up -d

cd apps\api
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
.\migrate.ps1
.\run.ps1
```

## Демо-пользователи (таблица `users`)

При старте API создаются учётки, если таблица пуста (после миграции `20260525_0003`).

| Логин | Пароль | Роль |
|-------|--------|------|
| admin | admin | admin |
| demo | demo | candidate |
| manager | manager | manager |

Seed демо-данных (срез + кейс + экзамен для `demo`):

```powershell
python seed_demo.py
```

## API

- `GET /api/health` — `db_ok`, `llm_configured`
- `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST /api/diagnostic/sessions` + `start` / `complete`
- `GET/POST /api/cases` + `PATCH .../answer` + `POST .../submit`
- `GET /api/results`, `GET /api/results/{session_id}`
- `GET/POST /api/exam/sessions` + `start` / `complete` / ответы на вопросы
- `GET /api/manager/overview` (manager, admin)
- `GET /api/manager/candidates`, `GET /api/manager/candidates/{username}`
- `GET /api/manager/export.csv` — выгрузка для руководителя
- `GET /api/sections/{id}` — метаданные разделов

## LLM

Все вызовы модели — через `app/services/llm_client.py` (retry при таймауте).
Настройки: `LLM_TIMEOUT_SECONDS`, `LLM_MAX_RETRIES`, `LLM_RETRY_DELAY_SECONDS`.

## Тесты (pytest)

Без Docker/PostgreSQL: SQLite in-memory, LLM замокан.

```powershell
pip install -r requirements-dev.txt
pytest
```

## Миграции

```powershell
alembic upgrade head
alembic revision -m "описание"   # новая миграция
```
