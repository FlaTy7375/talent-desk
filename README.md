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

Раздавайте `client/dist` через nginx/CDN или любой static host. API должен слушать отдельный origin; пропишите его в `CORS_ORIGIN`.

В production отключены:
- `POST /api/auth/dev/set-role`
- страница `/dev/roles` (удалена)

После изменений Prisma остановите сервер и выполните `npx prisma generate` в `server/`.

---

## Основные возможности

- OAuth (Google/GitHub) и email-auth, роли Candidate / Recruiter / Admin
- Библиотека атрибутов (EAV) с optimistic locking
- Позиции-шаблоны CV, access rules, изображение позиции
- Профиль, проекты (Markdown + теги), виртуальные CV, PDF + QR
- Обсуждения, лайки (Recruiter/Admin), FTS-поиск
- Админ: пользователи, роли, block/unblock
