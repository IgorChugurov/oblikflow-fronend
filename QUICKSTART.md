# Быстрый старт

## Первоначальная настройка

1. **Установите зависимости:**

   ```bash
   pnpm install
   ```

2. **Настройте переменные окружения:**

   Создайте файлы `.env.local` в каждой директории проекта:

   - `public/.env.local`
   - `app/.env.local`
   - `workspace/.env.local`

   Используйте примеры из README.md

3. **Для локальной разработки с поддоменами:**

   Добавьте в `/etc/hosts`:

   ```
   127.0.0.1 localhost
   127.0.0.1 app.localhost
   127.0.0.1 workspace.localhost
   ```

## Запуск

```bash
# Один проект
pnpm dev:public      # localhost:3000
pnpm dev:app         # app.localhost:3001
pnpm dev:workspace   # workspace.localhost:3002

# Все проекты одновременно
pnpm dev:all
```

## Тестирование навигации

1. Откройте `http://localhost:3000` (public)
2. Нажмите "Sign In" → редирект на `http://app.localhost:3001`
3. Нажмите "Open Project" → редирект на `http://workspace.localhost:3002?project=project-123`

## Деплой на Vercel

См. подробные инструкции в [README.md](./README.md#деплой-на-vercel)
