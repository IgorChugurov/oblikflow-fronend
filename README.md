# Olikflow Monorepo

Монорепозиторий, содержащий три Next.js приложения, развернутых на разных поддоменах Vercel.

## Структура проекта

```
olikflow-frontend/
├── public/          # Основной сайт-витрина + авторизация
│                   # Домен: yourdomain.com
│
├── app/            # Админка управления проектами
│                   # Домен: app.yourdomain.com
│
├── workspace/      # Рабочее пространство для работы с данными проекта
│                   # Домен: workspace.yourdomain.com
│
├── shared/         # Общие компоненты, типы и утилиты
│
├── pnpm-workspace.yaml
└── package.json
```

## Архитектура

### Поток пользователя

1. **Public** (`yourdomain.com`) - Витрина с авторизацией

   - Пользователь регистрируется/входит в систему
   - После успешной авторизации → редирект на `app.yourdomain.com`

2. **App** (`app.yourdomain.com`) - Управление проектами

   - Пользователь видит список своих проектов
   - Может создавать новые проекты
   - При выборе проекта → редирект на `workspace.yourdomain.com?project=xxx`

3. **Workspace** (`workspace.yourdomain.com`) - Рабочее пространство
   - Работа с данными выбранного проекта
   - Полный функционал приложения

### Авторизация

Все три приложения используют единую систему авторизации:

#### Production (реальный домен)

В production режиме авторизация работает через **cookies с domain**:

- **JWT токены** хранятся в cookies с `domain=.yourdomain.com` (с точкой в начале)
- Cookies доступны на всех поддоменах: `yourdomain.com`, `app.yourdomain.com`, `workspace.yourdomain.com`
- Используются флаги `SameSite=None; Secure` для работы между поддоменами
- Требуется HTTPS (автоматически предоставляется Vercel)

**Как это работает:**

```
1. Пользователь авторизуется на yourdomain.com
2. Cookie устанавливается с domain=.yourdomain.com
3. Этот cookie автоматически доступен на app.yourdomain.com и workspace.yourdomain.com
4. Все три приложения могут читать один и тот же токен
```

#### Development (localhost)

В dev режиме cookies с domain **не работают** для localhost поддоменов (ограничение браузера).

Поэтому используется **гибридный подход**:

- **localStorage** как основной источник (работает на том же origin)
- **Cookies** как fallback (без domain, только для текущего поддомена)
- При переходе между поддоменами в dev режиме токен передается через localStorage

**Важно для dev:**

- В dev режиме каждый поддомен имеет свой localStorage
- Для полноценной работы в dev нужно либо:
  1. Использовать один домен с разными портами (не идеально)
  2. Или передавать токен через URL параметр при первом переходе (небезопасно, только для dev)
  3. Или использовать единый домен для всех приложений в dev (рекомендуется)

**Рекомендация для dev:** Используйте один домен `localhost:3000` с разными путями или настройте единый прокси.

### Общий код (shared)

Пакет `shared` содержит:

- **Типы** (`shared/types`) - общие TypeScript интерфейсы
- **Авторизация** (`shared/lib/auth`) - утилиты для работы с токенами и cookies
- **Навигация** (`shared/lib/navigation`) - функции для навигации между приложениями

## Разработка

### Требования

- Node.js 18+
- pnpm 8+

### Установка зависимостей

```bash
# Установка всех зависимостей для всех проектов
pnpm install
```

### Запуск в режиме разработки

#### Запуск одного проекта

```bash
# Запуск public (порт 3000)
pnpm dev:public

# Запуск app (порт 3001)
pnpm dev:app

# Запуск workspace (порт 3002)
pnpm dev:workspace
```

#### Запуск всех проектов одновременно

```bash
pnpm dev:all
```

### Переменные окружения

#### Для локальной разработки

Создайте файлы `.env.local` в каждой директории проекта (`public/.env.local`, `app/.env.local`, `workspace/.env.local`).

**Содержимое файла `.env.local` (одинаковое для всех трех проектов):**

```env
NEXT_PUBLIC_BASE_DOMAIN=localhost:3000
NEXT_PUBLIC_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_WORKSPACE_URL=http://localhost:3002
NEXT_PUBLIC_COOKIE_DOMAIN=localhost
```

**Быстрое создание файлов (выполните из корня репозитория):**

```bash
# Создать .env.local для public
cat > public/.env.local << 'EOF'
NEXT_PUBLIC_BASE_DOMAIN=localhost:3000
NEXT_PUBLIC_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_WORKSPACE_URL=http://localhost:3002
NEXT_PUBLIC_COOKIE_DOMAIN=localhost
EOF

# Создать .env.local для app
cat > app/.env.local << 'EOF'
NEXT_PUBLIC_BASE_DOMAIN=localhost:3000
NEXT_PUBLIC_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_WORKSPACE_URL=http://localhost:3002
NEXT_PUBLIC_COOKIE_DOMAIN=localhost
EOF

# Создать .env.local для workspace
cat > workspace/.env.local << 'EOF'
NEXT_PUBLIC_BASE_DOMAIN=localhost:3000
NEXT_PUBLIC_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_WORKSPACE_URL=http://localhost:3002
NEXT_PUBLIC_COOKIE_DOMAIN=localhost
EOF
```

**Примечание:** В dev режиме используются разные порты на localhost (3000, 3001, 3002), а не поддомены. Это упрощает локальную разработку - не нужно настраивать `/etc/hosts`.

### Использование shared пакета

В любом из проектов можно импортировать общие утилиты:

```typescript
// Импорт типов
import type { User, Project } from "shared";

// Импорт утилит авторизации
import { isAuthenticated, getCurrentUser, clearAuth } from "shared";

// Импорт утилит навигации
import { navigateToApp, navigateToWorkspace, getAppUrl } from "shared";
```

### Примеры использования

#### Редирект после авторизации (public)

```typescript
import { navigateToApp, setAuthCookies } from "shared";

// После успешной авторизации
const handleLogin = async (credentials) => {
  const session = await login(credentials);
  setAuthCookies(session);
  navigateToApp("/");
};
```

#### Переход к проекту (app)

```typescript
import { navigateToWorkspace } from "shared";

const handleProjectSelect = (projectId: string) => {
  navigateToWorkspace(projectId, "/");
};
```

#### Проверка авторизации (любой проект)

```typescript
import { isAuthenticated, getCurrentUser } from "shared";
import { navigateToPublic } from "shared";

export default function ProtectedPage() {
  if (!isAuthenticated()) {
    navigateToPublic("/login");
    return null;
  }

  const user = getCurrentUser();
  // ...
}
```

## Сборка

### Сборка одного проекта

```bash
pnpm build:public
pnpm build:app
pnpm build:workspace
```

### Сборка всех проектов

```bash
pnpm build:all
```

## Деплой на Vercel

### Настройка проектов в Vercel

Вам нужно создать **три отдельных проекта** в Vercel Dashboard:

#### 1. Проект "public"

1. Перейдите в [Vercel Dashboard](https://vercel.com/dashboard)
2. Нажмите "Add New Project"
3. Подключите ваш репозиторий
4. Настройки проекта:

   - **Framework Preset**: Next.js
   - **Root Directory**: `public`
   - **Build Command**: `pnpm install && pnpm --filter public build`
   - **Output Directory**: `public/.next`
   - **Install Command**: `pnpm install`

5. **Environment Variables** (Settings → Environment Variables):

   Добавьте следующие переменные для всех окружений (Production, Preview, Development):

   ```
   NEXT_PUBLIC_BASE_DOMAIN=yourdomain.com
   NEXT_PUBLIC_PUBLIC_URL=https://yourdomain.com
   NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
   NEXT_PUBLIC_WORKSPACE_URL=https://workspace.yourdomain.com
   NEXT_PUBLIC_COOKIE_DOMAIN=.yourdomain.com
   ```

   **Важно:** Используйте **фактические production URL** с поддоменами (не localhost!)

6. **Domain**: Добавьте `yourdomain.com` как основной домен

#### 2. Проект "app"

1. Создайте новый проект в Vercel
2. Подключите тот же репозиторий
3. Настройки проекта:

   - **Framework Preset**: Next.js
   - **Root Directory**: `app`
   - **Build Command**: `pnpm install && pnpm --filter app build`
   - **Output Directory**: `app/.next`
   - **Install Command**: `pnpm install`

4. **Environment Variables** (те же, что и для public):

   ```
   NEXT_PUBLIC_BASE_DOMAIN=yourdomain.com
   NEXT_PUBLIC_PUBLIC_URL=https://yourdomain.com
   NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
   NEXT_PUBLIC_WORKSPACE_URL=https://workspace.yourdomain.com
   NEXT_PUBLIC_COOKIE_DOMAIN=.yourdomain.com
   ```

5. **Domain**: Добавьте `app.yourdomain.com` как поддомен

#### 3. Проект "workspace"

1. Создайте новый проект в Vercel
2. Подключите тот же репозиторий
3. Настройки проекта:

   - **Framework Preset**: Next.js
   - **Root Directory**: `workspace`
   - **Build Command**: `pnpm install && pnpm --filter workspace build`
   - **Output Directory**: `workspace/.next`
   - **Install Command**: `pnpm install`

4. **Environment Variables** (Settings → Environment Variables):

   Добавьте **те же переменные**, что и для public и app:

   ```
   NEXT_PUBLIC_BASE_DOMAIN=yourdomain.com
   NEXT_PUBLIC_PUBLIC_URL=https://yourdomain.com
   NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
   NEXT_PUBLIC_WORKSPACE_URL=https://workspace.yourdomain.com
   NEXT_PUBLIC_COOKIE_DOMAIN=.yourdomain.com
   ```

   **Важно:** Все три проекта должны иметь **одинаковые** значения этих переменных!

5. **Domain**: Добавьте `workspace.yourdomain.com` как поддомен

### Настройка DNS

В настройках DNS вашего домена добавьте записи:

```
A     @             76.76.21.21    (или IP вашего Vercel проекта)
CNAME app           cname.vercel-dns.com
CNAME workspace     cname.vercel-dns.com
```

Или используйте автоматическую настройку DNS через Vercel Dashboard.

### Переменные окружения в Vercel

**Ключевой момент:** В каждом из трех проектов Vercel нужно настроить **одинаковые** переменные окружения с **production URL** (фактическими доменами):

#### Для каждого проекта (public, app, workspace):

1. Откройте проект в [Vercel Dashboard](https://vercel.com/dashboard)
2. Перейдите в **Settings** → **Environment Variables**
3. Добавьте следующие переменные для **всех окружений** (Production, Preview, Development):

```
NEXT_PUBLIC_BASE_DOMAIN=yourdomain.com
NEXT_PUBLIC_PUBLIC_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
NEXT_PUBLIC_WORKSPACE_URL=https://workspace.yourdomain.com
NEXT_PUBLIC_COOKIE_DOMAIN=.yourdomain.com
```

**Важно:**

- ✅ Используйте **фактические production URL** (не localhost!)
- ✅ Все три проекта должны иметь **одинаковые** значения
- ✅ `NEXT_PUBLIC_COOKIE_DOMAIN` должен начинаться с точки (`.yourdomain.com`) для работы cookies между поддоменами
- ✅ Добавьте переменные для всех окружений (Production, Preview, Development)

**Почему одинаковые?**

- Каждое приложение должно знать URL других для навигации между поддоменами
- Cookie domain должен быть одинаковым для работы авторизации между поддоменами
- Это позволяет редиректам и авторизации работать корректно во всех трех приложениях

### Важные моменты для production

1. **Cookies для поддоменов**: Убедитесь, что `NEXT_PUBLIC_COOKIE_DOMAIN` установлен как `.yourdomain.com` (с точкой в начале) для работы на всех поддоменах

2. **HTTPS**: Vercel автоматически предоставляет SSL сертификаты для всех поддоменов

3. **CORS**: Если используете API, настройте CORS для работы с несколькими поддоменами

4. **SameSite cookies**: В production cookies должны иметь `SameSite=None; Secure` для работы между поддоменами

## Скрипты

### Root level scripts

- `pnpm dev:public` - Запуск public в dev режиме
- `pnpm dev:app` - Запуск app в dev режиме
- `pnpm dev:workspace` - Запуск workspace в dev режиме
- `pnpm dev:all` - Запуск всех проектов одновременно
- `pnpm build:public` - Сборка public
- `pnpm build:app` - Сборка app
- `pnpm build:workspace` - Сборка workspace
- `pnpm build:all` - Сборка всех проектов
- `pnpm lint` - Линтинг всех проектов

## Структура shared пакета

```
shared/
├── types/           # Общие TypeScript типы
│   └── index.ts
├── lib/            # Общие утилиты
│   ├── auth.ts     # Авторизация (JWT, cookies)
│   └── navigation.ts # Навигация между приложениями
└── index.ts        # Главный файл экспорта
```

## Troubleshooting

### Проблема: Cookies не работают между поддоменами

**В Production:**

- Убедитесь, что `NEXT_PUBLIC_COOKIE_DOMAIN` установлен как `.yourdomain.com` (с точкой в начале)
- Используется HTTPS (Vercel предоставляет автоматически)
- Cookies имеют флаги `SameSite=None; Secure` (устанавливаются автоматически)

**В Development (localhost):**

- Cookies с domain **не работают** для localhost поддоменов (ограничение браузера)
- Используется localStorage как fallback
- Для полноценной работы в dev рекомендуется:
  1. Использовать один домен для всех приложений (например, `localhost:3000` с разными путями)
  2. Или настроить единый прокси-сервер
  3. Или использовать реальный тестовый домен (например, `local.yourdomain.com`)

**Проверка работы cookies:**

```javascript
// В консоли браузера на любом поддомене:
document.cookie; // Должен показать auth_token если авторизованы
localStorage.getItem("auth_token"); // Fallback для dev режима
```

### Проблема: Сборка падает с ошибкой "Cannot find module 'shared'"

**Решение**:

1. Убедитесь, что выполнили `pnpm install` из корня репозитория
2. Проверьте, что `shared` указан в `dependencies` проекта
3. Убедитесь, что `pnpm-workspace.yaml` правильно настроен

### Проблема: Редиректы не работают в локальной разработке

**Решение**:

1. Настройте локальные поддомены в `/etc/hosts`
2. Или используйте полные URL вместо относительных путей
3. Проверьте переменные окружения `NEXT_PUBLIC_*_URL`

## Дополнительные ресурсы

- [Next.js Documentation](https://nextjs.org/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Vercel Monorepo Guide](https://vercel.com/docs/monorepos)
