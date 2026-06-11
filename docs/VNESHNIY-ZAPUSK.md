# Neuroexam Variant_3 — запуск «с нуля» для стороннего человека

Документ для воспроизведения проекта без доступа к исходному чату разработки.
Архив zip собирается скриптом `Fronted/make_variant3_zip.py` (без `node_modules`,
`.venv`, локальных `.env` — только `.env.example`).

## Что это за проект

Monorepo **Нейроэкзаменатор HR MVP**:

| Часть | Технологии | Порт |
|-------|------------|------|
| БД | PostgreSQL 16 (Docker) | **5433** на хосте |
| API | FastAPI + Alembic + SQLAlchemy | **8000** |
| Web | React + Vite + Tailwind + `@repo/ui` | **5173** |

**Роли:** кандидат (`demo`/`demo`), руководитель (`manager`/`manager`),
администратор (`admin`/`admin`). Пользователи хранятся в таблице `users` (см. миграцию).

**Путь кандидата:** Диагностика → завершить срез → Кейс → Результат → Экзаменатор.

## Требования

- Windows 10/11 или Linux/macOS
- **Docker Desktop** (для PostgreSQL)
- **Python 3.11+**
- **Node.js 20+** и npm
- По желанию: **Ollama** для локальной LLM без OpenAI

## Шаг 1. Распаковка

```powershell
# Пример: распаковать в D:\projects\neuroexam
Expand-Archive -Path neuroexam-variant3-mvp-*.zip -DestinationPath D:\projects
cd D:\projects\Variant_3
```

Структура:

```
Variant_3/
  docker-compose.yml
  package.json          # npm workspaces
  apps/api/             # FastAPI
  apps/web/             # Vite
  packages/ui/          # общий UI-kit
  docs/                 # эта папка
```

## Шаг 2. PostgreSQL

```powershell
docker compose up -d
docker ps   # контейнер neuroexam-postgres, порт 5433
```

В `apps/api/.env` (скопировать из `.env.example`):

```env
DATABASE_URL=postgresql+psycopg://neuroexam:neuroexam@127.0.0.1:5433/neuroexam
```

> Порт **5433**, не 5432 — чтобы не конфликтовать с локальным PostgreSQL на Windows.

## Шаг 3. API

```powershell
cd apps\api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# при необходимости отредактировать .env (LLM, SECRET_KEY)
.\migrate.ps1
.\run.ps1
```

Проверка:

- http://localhost:8000/api/health → `status: ok`, `db_ok: true`, `llm_configured`
- http://localhost:8000/api/docs — Swagger

Демо-данные (опционально, для презентации без ручного ввода):

```powershell
python seed_demo.py
```

## Шаг 4. Frontend

```powershell
cd ..\..   # корень Variant_3
copy apps\web\.env.example apps\web\.env
npm install
npm run dev
```

Откройте http://localhost:5173/login

В `apps/web/.env` должно быть:

```env
VITE_USE_BACKEND=1
```

## Шаг 5. LLM (Ollama, без OpenAI)

```powershell
ollama pull llama3.2
```

В `apps/api/.env`:

```env
OPENAI_BASE_URL=http://127.0.0.1:11434/v1
LLM_MODEL=llama3.2
OPENAI_API_KEY=ollama
```

Перезапустите `.\run.ps1`. На главной появится бейдж **LLM on**.

## Автотесты API (без Docker)

```powershell
cd apps\api
pip install -r requirements-dev.txt
pytest
```

Тесты используют SQLite in-memory и мок LLM.

## CI (GitHub Actions)

Файл `.github/workflows/ci.yml` в корне репозитория (путь в zip: `Variant_3/.github/...`):

- job **api**: `pytest` в `apps/api`
- job **web**: `npm ci` + `npm run build`

## E2E (Playwright)

```powershell
cd e2e
npm install
npx playwright install chromium
# в другом терминале: API + web как выше
npm test
```

См. `e2e/README.md`.

## Частые проблемы

| Симптом | Решение |
|---------|---------|
| `password authentication failed` | Проверьте порт **5433** в `DATABASE_URL` |
| `connection timeout` при migrate | `docker compose up -d` |
| API offline на фронте | `VITE_USE_BACKEND=1`, API на :8000 |
| `db_ok: false` в health | БД не запущена или неверный URL |
| LLM off | Заполните `OPENAI_API_KEY` или Ollama |
| 401 после миграции users | Перезапустите API (создаются demo-пользователи) |

## Дополнительная документация

| Файл | Содержание |
|------|------------|
| [README.md](../README.md) | Краткий обзор и хронология |
| [spravochnik-api-docs.md](spravochnik-api-docs.md) | API ↔ экраны, роли |
| [ROADMAP-ABCDE-ZHURNAL.md](ROADMAP-ABCDE-ZHURNAL.md) | Журнал улучшений A–E |
| [apps/api/README.md](../apps/api/README.md) | API, миграции, seed |

## Сборка zip для передачи коллеге

Из каталога `Fronted`:

```powershell
python make_variant3_zip.py
```

Имя архива: `neuroexam-variant3-mvp-YYYYMMDD-roadmap-abcde.zip`
