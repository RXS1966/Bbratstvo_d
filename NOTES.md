## Стек

| Часть | Технология |
|-------|------------|
| UI-kit | `packages/ui` — shadcn-стиль (Tailwind + CVA) |
| Frontend | Vite, React, React Router |
| Backend | FastAPI, JWT, passlib/bcrypt |

## Переменные фронта (`apps/web/.env`)

- `VITE_USE_BACKEND=1` — реальный FastAPI
- `VITE_API_TARGET` — адрес для прокси `/api` в dev
- `VITE_DEMO_AUTH=0` — отключить fallback на демо при ошибке API

## API

- `GET /api/health`
- `POST /api/auth/login` → `{ token, username }`
- `GET /api/auth/me` (Bearer)
- `GET /api/sections/{id}` (Bearer)

## Пользователи (демо)

- admin / admin (role: admin)
- demo / demo (role: user)
