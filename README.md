# TalentDesk — CV Management System

Система управления резюме для рекрутинга.

**Стек:** React (Vite) · Express · Prisma · Supabase (PostgreSQL + Auth + Storage) · Bootstrap · i18n (EN/RU)

---

## Структура (FSD на клиенте)

```text
course-project/
  client/src/
    app/          # приложение, роутер, глобальные стили
    pages/        # страницы маршрутов
    widgets/      # Header, Layout
    features/     # auth, theme, формы
    entities/     # UserAvatar и др.
    shared/       # api, i18n, ui-kit
  server/src/     # Express API
  package.json
```

---

## Локальный запуск

```bash
npm install
npm install --prefix server
npm install --prefix client

# server/.env и client/.env — см. *.env.example
cd server
npx prisma generate
npx prisma db push
npm run db:seed

cd ..
npm run dev
```

- Клиент: http://localhost:5173  
- API: http://localhost:3001  

### Переменные окружения

**server/.env** — `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`, опционально `CORS_ORIGIN`, `NODE_ENV`, `PORT`.

**client/.env** — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

---

## Production

```bash
# фронт
npm run build --prefix client

# сервер
NODE_ENV=production CORS_ORIGIN=https://your-frontend.example npm run start --prefix server
```

В production сервер также отдаёт собранный фронт из `client/dist` (удобно для Render).

В production отключены:
- `POST /api/auth/dev/set-role`

После изменений Prisma остановите сервер и выполните `npx prisma generate` в `server/`.

---

## Публикация на Render

Нужен аккаунт на [render.com](https://render.com) и репозиторий на GitHub/GitLab.

### 1. Подготовка

1. Залей проект в GitHub (без `.env`).
2. База уже в Supabase — её Render не нужен.
3. Локально один раз проверь схему: `cd server && npx prisma db push`.

### 2. Web Service на Render

1. **New +** → **Web Service** → выбери репозиторий.
2. Настройки:
   - **Root Directory:** пусто (корень репозитория)
   - **Runtime:** Node
   - **Build Command:** `npm run render:build`
   - **Start Command:** `npm run render:start`
3. **Environment** (Environment Variables) — добавь **до** первого деплоя:

| Имя | Значение |
|-----|----------|
| `NODE_ENV` | `production` (**обязательно**) |
| `DATABASE_URL` | из `server/.env` (pooler) |
| `DIRECT_URL` | из `server/.env` |
| `SUPABASE_URL` | URL проекта Supabase |
| `SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SECRET_KEY` | secret / service_role |
| `VITE_SUPABASE_URL` | тот же URL (нужен на этапе сборки фронта) |
| `VITE_SUPABASE_ANON_KEY` | тот же anon key |
| `CORS_ORIGIN` | `https://ИМЯ-СЕРВИСА.onrender.com` |

Без `DATABASE_URL` и `DIRECT_URL` шаг `prisma generate` падает.
Без `VITE_...` сайт соберётся, но вход через Supabase не заработает.

`PORT` на Render задаётся сам — не трогай.

4. **Build Command:** `npm run render:build`  
   **Start Command:** `npm run render:start`  
   (лишний `npm install;` в начале Render можно убрать — он уже внутри `render:build`)

5. Deploy. Дождись статуса **Live**. Открой `https://ИМЯ.onrender.com/api/health`.

Если лог «замирает» после `added … packages` — подожди ещё 1–3 минуты: качается движок Prisma и собирается фронт. Если красная ошибка — пришли полный текст после этой строки.

### 3. Supabase Auth (иначе вход не вернётся на сайт)

В Supabase → **Authentication** → **URL Configuration**:

- **Site URL:** `https://ИМЯ.onrender.com`
- **Redirect URLs:** добавь `https://ИМЯ.onrender.com/auth/callback`

У провайдеров Google/GitHub тоже разреши этот redirect, если спрашивают.

### 4. Seed (по желанию)

После первого деплоя один раз с локальной машины (с теми же `DATABASE_URL`):

```bash
cd server
npm run db:seed
```

### Замечания

- Бесплатный план Render «засыпает» без трафика — первый заход может ждать ~30–60 сек.
- После смены переменных с `VITE_...` нужен **новый Deploy** (они вшиваются в сборку фронта).
- Картинки идут в Storage Supabase — buckets `profile-images` и `position-images` должны быть доступны.