# Справочник: страница `/api/docs`

Проект: **Variant_3** (Neuroexam HR MVP)  
URL: http://localhost:8000/api/docs

---

## Что это за страница

**http://localhost:8000/api/docs** — интерактивная справка по API бэкенда (FastAPI).
Не для обычных пользователей сайта, а для разработчиков и тестирования.

Сайт на http://localhost:5173 ходит в API «за кулисами».
На `/api/docs` видно все адреса и методы, которыми пользуется фронт
(и которые можно вызывать вручную).

---

## Зачем она нужна

| Задача | Как помогает `/api/docs` |
|--------|---------------------------|
| Понять, что умеет сервер | Список разделов: `auth`, `diagnostic`, `cases`, `exam`, `results`… |
| Проверить, что API живой | Вызвать `GET /api/health` без браузера на 5173 |
| Отладить без фронта | Отправить запрос из браузера, посмотреть ответ |
| Увидеть формат данных | Какие поля в JSON (логин, срез, кейс, экзамен) |
| Проверить авторизацию | Как передать токен после входа |

Это как **оглавление + пробник** к серверу, а не рабочий интерфейс HR.

---

## Как устроена страница (общие черты)

1. **Группы (теги)** — блоки вроде `auth`, `diagnostic`, `cases`, `exam`.
2. **Строка = один endpoint** — например `POST /api/auth/login`,
   `GET /api/diagnostic/sessions`.
3. **Метод** — `GET` (прочитать), `POST` (создать/действие),
   `PATCH` (частично изменить).
4. **Try it out** — ввести параметры и **Execute** — запрос уйдёт
   на `localhost:8000`, ответ покажется внизу.

---

## Связь API ↔ экраны

| Тег в docs | Экран (5173) | Основные endpoints |
|------------|--------------|-------------------|
| `auth` | Вход | `POST /api/auth/login`, `GET /api/auth/me` |
| `health` | Главная (бейдж API) | `GET /api/health` |
| `sections` | Метаданные раздела | `GET /api/sections/{id}` |
| `diagnostic` | Диагностика | `GET/POST /api/diagnostic/sessions`, `…/start`, `…/complete` |
| `cases` | Кейс | `GET/POST /api/cases`, `PATCH …/answer`, `POST …/submit` |
| `results` | Результат | `GET /api/results`, `GET /api/results/{session_id}` |
| `exam` | Экзаменатор | `GET/POST /api/exam/sessions`, `…/start`, `…/complete`, `PATCH …/answer` |
| `manager` | Кабинет руководителя | `GET /api/manager/overview`, `…/candidates`, `…/candidates/{username}` |

```
Браузер (5173)  →  логин, диагностика, кейс, результат, экзаменатор
       ↓
   запросы /api/...
       ↓
FastAPI (8000)  →  логика + PostgreSQL (порт 5433)
       ↑
/api/docs       →  просмотр и ручные тесты
```

---

## Роли и доступ

| Роль | Логин | Что доступно в API |
|------|-------|-------------------|
| Кандидат | `demo` / `demo` | diagnostic, cases, results, exam |
| Руководитель | `manager` / `manager` | manager/overview |
| Админ | `admin` / `admin` | всё (admin обходит проверку роли) |

Метаданные разделов (`GET /api/sections/{id}`) — любой авторизованный пользователь.

---

## Сценарий кандидата (порядок вызовов)

1. `POST /api/auth/login` → JWT.
2. `POST /api/diagnostic/sessions` → срез (status `draft`).
3. `POST /api/diagnostic/sessions/{id}/start` → `running`.
4. `POST /api/diagnostic/sessions/{id}/complete` → `completed`.
5. `POST /api/cases` с `diagnostic_session_id` → кейс.
6. `POST /api/cases/{id}/submit` → LLM-оценка кейса.
7. `POST /api/exam/sessions` → экзамен (черновик).
8. `POST /api/exam/sessions/{id}/start` → **3 вопроса** (LLM по срезу и
   кейсам, иначе шаблоны), запуск таймера.
9. `PATCH /api/exam/sessions/{id}/questions/{qid}/answer` — ответы.
10. `POST /api/exam/sessions/{id}/complete` → LLM-оценка экзамена.
11. `GET /api/results/{session_id}` — сводка: срез, кейсы, экзамены.

---

## Минимальный пример: «пощупать API»

1. Открой блок **auth** → `POST /api/auth/login` → **Try it out**.
2. Тело запроса, например:

   ```json
   {"username": "demo", "password": "demo"}
   ```

3. Нажми **Execute**. В ответе будет `token` (JWT).
4. Вверху страницы **Authorize** → вставь `Bearer <токен>`
   (иногда без слова `Bearer` — смотри подсказку на странице).
5. После этого защищённые методы можно вызывать из docs.

**Без авторизации:** `GET /api/health` — проверка, что сервер отвечает
(поле `llm_configured` показывает, задан ли ключ LLM в `.env`).

Демо-логины: `admin` / `admin`, `demo` / `demo`, `manager` / `manager`.

---

## Ошибки в ответах

FastAPI возвращает JSON с полем `detail`:

- строка — например `"Нужен завершённый диагностический срез"`;
- массив — ошибки валидации полей (422).

Фронт (`apps/web`) разбирает `detail` и показывает текст в красном Alert.

---

## Чем страница не является

- **Не замена** сайта на 5173 — нет удобных форм как в UI.
- **Не админка PostgreSQL** — в БД напрямую не зайти, только через API.
- **Не для конечных пользователей в проде** — в production документацию
  часто отключают.

---

## Коротко одной фразой

**`/api/docs`** — живая инструкция к серверу на порту 8000: какие запросы есть,
что отправлять и что приходит в ответ; удобно проверять API, когда фронт ещё
не трогаешь или ищешь ошибку.

---

## Связанные адреса

| URL | Назначение |
|-----|------------|
| http://localhost:5173 | Фронтенд (Vite) |
| http://localhost:8000/api | Префикс API |
| http://localhost:8000/api/docs | Swagger UI (этот справочник) |
| http://127.0.0.1:5433 | PostgreSQL в Docker (хост) |

Запуск API: `apps/api` → `.\run.ps1` или
`uvicorn app.main:app --reload --port 8000`.

Миграции: `.\migrate.ps1` (нужен `docker compose up -d`).

Подробнее о запуске: [README.md](../README.md).
