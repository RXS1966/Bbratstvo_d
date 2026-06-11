# @repo/web — приложение (Vite + React)

Использует UI-kit `@repo/ui` из `packages/ui`.

## Запуск

Из корня `Variant_3`:

```bash
npm install
npm run dev
```

Или только приложение:

```bash
cd apps/web
npm install
npm run dev
```

Откройте адрес Vite (обычно `http://localhost:5173`).

## `.env`

Скопируйте `.env.example` → `.env`:

- `VITE_USE_BACKEND=1` — логин и разделы через FastAPI (`apps/api`)
- `VITE_API_TARGET` — адрес API для прокси `/api` в dev
- `VITE_PUBLIC_URL` — публичный URL в production

## Сборка

```bash
npm run build
npm run preview
```
