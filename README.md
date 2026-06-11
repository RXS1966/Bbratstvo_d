# Bbratstvo_d — Neuroexam MVP

**Нейроэкзаменатор для HR** — пилотный MVP: диагностика компетенций, кейсы,
экзаменатор с LLM-оценкой, кабинет руководителя.

Наработка по стажировке. Стек: **FastAPI + PostgreSQL + React (Vite) + monorepo UI-kit**.

[![CI](https://github.com/RXS1966/Bbratstvo_d/actions/workflows/ci.yml/badge.svg)](https://github.com/RXS1966/Bbratstvo_d/actions/workflows/ci.yml)

---

## Для коллег: как открыть репозиторий

Репозиторий **публичный** — достаточно ссылки:

**https://github.com/RXS1966/Bbratstvo_d**

Клонирование:

```bash
git clone https://github.com/RXS1966/Bbratstvo_d.git
cd Bbratstvo_d
```

### Если нужны права на запись (push, PR)

Владелец репозитория добавляет коллегу как collaborator:

**https://github.com/RXS1966/Bbratstvo_d/settings/access**

→ **Add people** → логин GitHub коллеги → роль **Write** (или **Maintain**).

После приглашения коллега получит письмо от GitHub и сможет пушить в репозиторий.

---

## Что внутри

| Папка | Назначение |
|-------|------------|
| `apps/api/` | FastAPI, Alembic, pytest |
| `apps/web/` | React SPA (Vite, TanStack Query) |
| `packages/ui/` | Общий UI-kit `@repo/ui` |
| `e2e/` | Playwright E2E-тесты |
| `docs/` | Справочники, roadmap, инструкции |

**MVP-контур:** роль → диагностика → кейс → оценка (LLM) → экзаменатор → отчёт /
кабинет руководителя.

---

## Быстрый старт (Windows)

**Нужно:** Docker Desktop, Node.js 20+, Python 3.12+.

### 1. PostgreSQL

```powershell
docker compose up -d
```

БД на порту **5433** (чтобы не конфликтовать с локальным PostgreSQL на 5432).

### 2. Backend

```powershell
cd apps\api
copy .env.example .env
.\migrate.ps1
.\run.ps1
```

API: http://localhost:8000/api/docs

### 3. Frontend

```powershell
# из корня репозитория
copy apps\web\.env.example apps\web\.env
npm install
npm run dev
```

UI: http://localhost:5173/login

### Демо-логины

| Логин | Пароль | Роль |
|-------|--------|------|
| `demo` | `demo` | Кандидат |
| `manager` | `manager` | Руководитель |
| `admin` | `admin` | Администратор |

**Путь кандидата:** диагностика → завершить срез → кейс → результат → экзаменатор.

---

## Экраны и API

| Раздел | API | Роли |
|--------|-----|------|
| Диагностика | `/api/diagnostic/sessions` | candidate, admin |
| Кейс | `/api/cases` | candidate, admin |
| Результат | `/api/results` | candidate, admin |
| Экзаменатор | `/api/exam/sessions` | candidate, admin |
| Кабинет руководителя | `/api/manager/overview` | manager, admin |

Справочник API: [docs/spravochnik-api-docs.md](docs/spravochnik-api-docs.md)

---

## LLM-оценка (опционально)

В `apps/api/.env` (шаблон — `.env.example`):

```env
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
```

Без ключа работают фиксированные шаблоны вопросов и подсказки в feedback.
Проверка: `GET /api/health` → поля `llm_configured`, `db_ok`.

**Локально без OpenAI:** [Ollama](https://ollama.com) — см. комментарии в
`apps/api/.env.example`.

Демо-данные: `cd apps/api && python seed_demo.py`

---

## Тесты и CI

```powershell
# unit-тесты API
cd apps\api
pytest -q

# сборка фронта
npm run build

# E2E (нужны запущенные API + web + PostgreSQL)
cd e2e
npm ci
npx playwright install chromium
npm test
```

CI (GitHub Actions): pytest + build web + Playwright E2E — см.
[Actions](https://github.com/RXS1966/Bbratstvo_d/actions).

---

## Документация

| Файл | Описание |
|------|----------|
| [docs/VNESHNIY-ZAPUSK.md](docs/VNESHNIY-ZAPUSK.md) | Запуск для внешнего человека |
| [docs/ROADMAP-ABCDE-ZHURNAL.md](docs/ROADMAP-ABCDE-ZHURNAL.md) | Журнал улучшений |
| [docs/spravochnik-api-docs.md](docs/spravochnik-api-docs.md) | Справочник `/api/docs` |
| [apps/api/README.md](apps/api/README.md) | Backend |
| [apps/web/README.md](apps/web/README.md) | Frontend |
| [e2e/README.md](e2e/README.md) | E2E-тесты |

---

## Структура репозитория

```
.
├── apps/
│   ├── api/          # FastAPI + Alembic + pytest
│   └── web/          # Vite + React
├── packages/ui/      # @repo/ui
├── e2e/              # Playwright
├── docs/
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## Контакты

Автор: [@RXS1966](https://github.com/RXS1966)

Вопросы и предложения — через [Issues](https://github.com/RXS1966/Bbratstvo_d/issues)
или напрямую автору репозитория.
