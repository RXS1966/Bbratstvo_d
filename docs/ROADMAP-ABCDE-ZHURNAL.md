# Журнал улучшений A → E (roadmap)

Запись изменений для переноса в другие ветки и онбординга команды.

**Дата начала:** 2026-05-25  
**Контекст:** после MVP (диагностика, кейс, результат, экзамен, manager drill-down, pytest, LLM).

---

## A — CI, health с БД, seed

| Элемент | Файлы | Поведение |
|---------|-------|-----------|
| Health `db_ok` | `app/routers/health.py`, `schemas.HealthResponse` | `SELECT 1` через `get_db`; в pytest — SQLite |
| CI | `.github/workflows/ci.yml` | pytest + `npm run build` |
| Seed | `apps/api/seed_demo.py` | Завершённый срез + кейс + черновик экзамена для `demo` |

**Проверка:** `GET /api/health` → `db_ok: true`; `python seed_demo.py`; `pytest`.

---

## B — один LLM-вызов при завершении экзамена

| Элемент | Файлы | Поведение |
|---------|-------|-----------|
| Пакетная оценка | `evaluation_service.evaluate_exam_session_batch` | Один промпт, JSON с `overall_score` и `evaluations[]` |
| Сервис | `exam_service.complete_session` | Вместо 3× `evaluate_exam_answer` |

**Проверка:** `pytest tests/test_exam.py`; в UI завершение экзамена быстрее при Ollama.

---

## C — пользователи в PostgreSQL

| Элемент | Файлы | Поведение |
|---------|-------|-----------|
| Модель | `app/models/user.py` | `users(username, password_hash, role)` |
| Миграция | `alembic/versions/20260525_0003_users.py` | Таблица `users` |
| Сервис | `app/services/user_service.py` | `ensure_demo_users`, `authenticate_user` |
| Auth | `security.py`, `routers/auth.py` | Логин и JWT через БД |
| Старт API | `main.py` lifespan | Создание demo/admin/manager при пустой таблице |

**Проверка:** `pytest tests/test_health.py` (login); миграция + login demo/demo.

---

## D — React Query + общие компоненты

| Элемент | Файлы | Поведение |
|---------|-------|-----------|
| QueryClient | `apps/web/src/lib/queryClient.ts`, `main.tsx` | Provider |
| Health query | `features/health/useHealthQuery.ts`, `HomePage` | Кэш health |
| Диагностика | `DiagnosticPage` | `useQuery` / `useMutation` для срезов |
| UI | `components/common/WorkflowStatusBadge.tsx`, `BackendRequiredAlert.tsx` | Единые статусы и подсказка backend |

**Проверка:** `npm run build`; ручной проход диагностики.

---

## E — E2E + экспорт для manager

| Элемент | Файлы | Поведение |
|---------|-------|-----------|
| CSV | `GET /api/manager/export.csv` | Сводка по кандидатам/срезам |
| UI | `ManagerPage` — кнопка «Скачать CSV» | Скачивание с токеном |
| E2E | `e2e/` Playwright | Логин demo → главная |

**Проверка:** manager → CSV; `cd e2e && npm test` при запущенных API+web.

---

## Хронология (дополнение к README)

19. **2026-05-25** — Roadmap A–E: CI, health+db, seed, batch exam LLM, users DB, React Query, CSV export, Playwright E2E.
