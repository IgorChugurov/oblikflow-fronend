# Olikflow Monorepo

Монорепозиторий, содержащий четыре Next.js приложения, развернутых на разных поддоменах Vercel.

## Структура проекта

```
olikflow-frontend/
├── site/           # Основной сайт-витрина + авторизация
│                   # Домен: oblikflow.com
│
├── admin/          # Админка управления проектами
│                   # Домен: admin.oblikflow.com
│
├── workspace/      # Рабочее пространство для работы с данными проекта
│                   # Домен: workspace.oblikflow.com
│
├── platform/       # Дашборд настройки платформы
│                   # Домен: platform.oblikflow.com
│
├── shared/         # Общие компоненты, типы и утилиты
│
├── public/         # Статические файлы Next.js (общие для всех проектов)
│
├── pnpm-workspace.yaml
└── package.json
```

## Архитектура

### Поток пользователя

1. **Site** (`oblikflow.com`) - Витрина с авторизацией

   - Пользователь регистрируется/входит в систему
   - После успешной авторизации → редирект на `admin.oblikflow.com`

2. **Admin** (`admin.oblikflow.com`) - Управление проектами

   - Пользователь видит список своих проектов
   - Может создавать новые проекты
   - При выборе проекта → редирект на `workspace.oblikflow.com?project=xxx`

3. **Workspace** (`workspace.oblikflow.com`) - Рабочее пространство

   - Работа с данными выбранного проекта
   - Полный функционал приложения

4. **Platform** (`platform.oblikflow.com`) - Настройка платформы
   - Дашборд для настройки и управления платформой
   - Системные настройки и конфигурация

### Авторизация

Все три приложения используют единую систему авторизации:

#### Production (реальный домен)

В production режиме авторизация работает через **cookies с domain**:

- **JWT токены** хранятся в cookies с `domain=.oblikflow.com` (с точкой в начале)
- Cookies доступны на всех поддоменах: `yourdomain.com`, `admin.yourdomain.com`, `workspace.yourdomain.com`
- Используются флаги `SameSite=None; Secure` для работы между поддоменами
- Требуется HTTPS (автоматически предоставляется Vercel)

**Как это работает:**

```
1. Пользователь авторизуется на oblikflow.com
2. Cookie устанавливается с domain=.oblikflow.com
3. Этот cookie автоматически доступен на admin.oblikflow.com, workspace.oblikflow.com и platform.oblikflow.com
4. Все четыре приложения могут читать один и тот же токен
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
# Запуск site (порт 3000)
pnpm dev:site

# Запуск admin (порт 3001)
pnpm dev:admin

# Запуск workspace (порт 3002)
pnpm dev:workspace

# Запуск platform (порт 3003)
pnpm dev:platform
```

#### Запуск всех проектов одновременно

```bash
pnpm dev:all
```

### Переменные окружения

#### Для локальной разработки

Создайте файлы `.env.local` в каждой директории проекта (`site/.env.local`, `admin/.env.local`, `workspace/.env.local`, `platform/.env.local`).

**Содержимое файла `.env.local` (одинаковое для всех четырех проектов):**

```env
NEXT_PUBLIC_BASE_DOMAIN=localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
NEXT_PUBLIC_WORKSPACE_URL=http://localhost:3002
NEXT_PUBLIC_PLATFORM_URL=http://localhost:3003
NEXT_PUBLIC_COOKIE_DOMAIN=localhost
```

**Быстрое создание файлов (выполните из корня репозитория):**

```bash
# Создать .env.local для site
cat > site/.env.local << 'EOF'
NEXT_PUBLIC_BASE_DOMAIN=localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
NEXT_PUBLIC_WORKSPACE_URL=http://localhost:3002
NEXT_PUBLIC_PLATFORM_URL=http://localhost:3003
NEXT_PUBLIC_COOKIE_DOMAIN=localhost
EOF

# Создать .env.local для admin
cat > admin/.env.local << 'EOF'
NEXT_PUBLIC_BASE_DOMAIN=localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
NEXT_PUBLIC_WORKSPACE_URL=http://localhost:3002
NEXT_PUBLIC_PLATFORM_URL=http://localhost:3003
NEXT_PUBLIC_COOKIE_DOMAIN=localhost
EOF

# Создать .env.local для workspace
cat > workspace/.env.local << 'EOF'
NEXT_PUBLIC_BASE_DOMAIN=localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
NEXT_PUBLIC_WORKSPACE_URL=http://localhost:3002
NEXT_PUBLIC_PLATFORM_URL=http://localhost:3003
NEXT_PUBLIC_COOKIE_DOMAIN=localhost
EOF

# Создать .env.local для platform
cat > platform/.env.local << 'EOF'
NEXT_PUBLIC_BASE_DOMAIN=localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
NEXT_PUBLIC_WORKSPACE_URL=http://localhost:3002
NEXT_PUBLIC_PLATFORM_URL=http://localhost:3003
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
import {
  navigateToSite,
  navigateToAdmin,
  navigateToWorkspace,
  navigateToPlatform,
  getSiteUrl,
  getAdminUrl,
  getPlatformUrl,
} from "shared";
```

### Примеры использования

#### Редирект после авторизации (site)

```typescript
import { navigateToAdmin, setAuthCookies } from "shared";

// После успешной авторизации
const handleLogin = async (credentials) => {
  const session = await login(credentials);
  setAuthCookies(session);
  navigateToAdmin("/");
};
```

#### Переход к проекту (admin)

```typescript
import { navigateToWorkspace } from "shared";

const handleProjectSelect = (projectId: string) => {
  navigateToWorkspace(projectId, "/");
};
```

#### Проверка авторизации (любой проект)

```typescript
import { isAuthenticated, getCurrentUser } from "shared";
import { navigateToSite } from "shared";

export default function ProtectedPage() {
  if (!isAuthenticated()) {
    navigateToSite("/login");
    return null;
  }

  const user = getCurrentUser();
  // ...
}
```

## Сборка

### Сборка одного проекта

```bash
pnpm build:site
pnpm build:admin
pnpm build:workspace
pnpm build:platform
```

### Сборка всех проектов

```bash
pnpm build:all
```

## Деплой на Vercel

### Настройка проектов в Vercel

Вам нужно создать **четыре отдельных проекта** в Vercel Dashboard:

#### 1. Проект "site"

1. Перейдите в [Vercel Dashboard](https://vercel.com/dashboard)
2. Нажмите "Add New Project"
3. Подключите ваш репозиторий
4. Настройки проекта:

   - **Framework Preset**: Next.js
   - **Root Directory**: `site`
   - **Build Command**: `pnpm install && pnpm --filter site build`
   - **Output Directory**: `.next` (не `public/.next`!)
   - **Install Command**: `pnpm install`

5. **Environment Variables** (Settings → Environment Variables):

   Добавьте следующие переменные для всех окружений (Production, Preview, Development):

   ```
   NEXT_PUBLIC_BASE_DOMAIN=oblikflow.com
   NEXT_PUBLIC_SITE_URL=https://oblikflow.com
   NEXT_PUBLIC_ADMIN_URL=https://admin.oblikflow.com
   NEXT_PUBLIC_WORKSPACE_URL=https://workspace.oblikflow.com
   NEXT_PUBLIC_PLATFORM_URL=https://platform.oblikflow.com
   NEXT_PUBLIC_COOKIE_DOMAIN=.oblikflow.com
   ```

   **Важно:** Используйте **фактические production URL** с поддоменами (не localhost!)

6. **Ignored Build Step** (Settings → Git → Ignored Build Step):

   Включите опцию **"Override"** и добавьте команду:

   ```bash
   git diff HEAD^ HEAD --quiet -- site/ shared/
   ```

   **Логика:**

   - Если файлы в `site/` или `shared/` **НЕ изменились** → команда вернет 0 → сборка **пропускается** ✅
   - Если файлы **изменились** → команда вернет 1 → сборка **выполняется** ✅

7. **Domain**: Добавьте `oblikflow.com` как основной домен

#### 2. Проект "admin"

1. Создайте новый проект в Vercel
2. Подключите тот же репозиторий
3. Настройки проекта:

   - **Framework Preset**: Next.js
   - **Root Directory**: `admin`
   - **Build Command**: `pnpm install && pnpm --filter admin build`
   - **Output Directory**: `.next` (не `admin/.next`!)
   - **Install Command**: `pnpm install`

4. **Environment Variables** (те же, что и для site):

   ```
   NEXT_PUBLIC_BASE_DOMAIN=oblikflow.com
   NEXT_PUBLIC_SITE_URL=https://oblikflow.com
   NEXT_PUBLIC_ADMIN_URL=https://admin.oblikflow.com
   NEXT_PUBLIC_WORKSPACE_URL=https://workspace.oblikflow.com
   NEXT_PUBLIC_PLATFORM_URL=https://platform.oblikflow.com
   NEXT_PUBLIC_COOKIE_DOMAIN=.oblikflow.com
   ```

5. **Ignored Build Step** (Settings → Git → Ignored Build Step):

   Включите опцию **"Override"** и добавьте:

   ```bash
   git diff HEAD^ HEAD --quiet -- admin/ shared/
   ```

6. **Domain**: Добавьте `admin.oblikflow.com` как поддомен

#### 3. Проект "workspace"

1. Создайте новый проект в Vercel
2. Подключите тот же репозиторий
3. Настройки проекта:

   - **Framework Preset**: Next.js
   - **Root Directory**: `workspace`
   - **Build Command**: `pnpm install && pnpm --filter workspace build`
   - **Output Directory**: `.next` (не `workspace/.next`!)
   - **Install Command**: `pnpm install`

4. **Environment Variables** (Settings → Environment Variables):

   Добавьте **те же переменные**, что и для site и admin:

   ```
   NEXT_PUBLIC_BASE_DOMAIN=oblikflow.com
   NEXT_PUBLIC_SITE_URL=https://oblikflow.com
   NEXT_PUBLIC_ADMIN_URL=https://admin.oblikflow.com
   NEXT_PUBLIC_WORKSPACE_URL=https://workspace.oblikflow.com
   NEXT_PUBLIC_PLATFORM_URL=https://platform.oblikflow.com
   NEXT_PUBLIC_COOKIE_DOMAIN=.oblikflow.com
   ```

   **Важно:** Все четыре проекта должны иметь **одинаковые** значения этих переменных!

5. **Ignored Build Step** (Settings → Git → Ignored Build Step):

   Включите опцию **"Override"** и добавьте:

   ```bash
   git diff HEAD^ HEAD --quiet -- workspace/ shared/
   ```

6. **Domain**: Добавьте `workspace.oblikflow.com` как поддомен

#### 4. Проект "platform"

1. Создайте новый проект в Vercel
2. Подключите тот же репозиторий
3. Настройки проекта:

   - **Framework Preset**: Next.js
   - **Root Directory**: `platform`
   - **Build Command**: `pnpm install && pnpm --filter platform build`
   - **Output Directory**: `.next` (не `platform/.next`!)
   - **Install Command**: `pnpm install`

4. **Environment Variables** (Settings → Environment Variables):

   Добавьте **те же переменные**, что и для site, admin и workspace:

   ```
   NEXT_PUBLIC_BASE_DOMAIN=oblikflow.com
   NEXT_PUBLIC_SITE_URL=https://oblikflow.com
   NEXT_PUBLIC_ADMIN_URL=https://admin.oblikflow.com
   NEXT_PUBLIC_WORKSPACE_URL=https://workspace.oblikflow.com
   NEXT_PUBLIC_PLATFORM_URL=https://platform.oblikflow.com
   NEXT_PUBLIC_COOKIE_DOMAIN=.oblikflow.com
   ```

   **Важно:** Все четыре проекта должны иметь **одинаковые** значения этих переменных!

5. **Ignored Build Step** (Settings → Git → Ignored Build Step):

   Включите опцию **"Override"** и добавьте:

   ```bash
   git diff HEAD^ HEAD --quiet -- platform/ shared/
   ```

6. **Domain**: Добавьте `platform.oblikflow.com` как поддомен

### Настройка DNS

В настройках DNS вашего домена добавьте записи:

```
A     @             216.198.79.1   (IP для корневого домена)
CNAME admin         cname.vercel-dns.com
CNAME workspace     cname.vercel-dns.com
CNAME platform      cname.vercel-dns.com
```

Или используйте автоматическую настройку DNS через Vercel Dashboard.

### Оптимизация сборок: Ignored Build Step

Чтобы проекты не пересобирались при каждом пуше, настройте **Ignored Build Step** для каждого проекта:

**Как это работает:**

- Vercel проверяет, изменились ли файлы в указанных директориях
- Если файлы не изменились → сборка пропускается
- Если изменились → сборка выполняется

**Настройка для каждого проекта:**

1. Откройте проект в Vercel Dashboard
2. Перейдите в **Settings** → **Git**
3. Найдите раздел **"Ignored Build Step"**
4. Включите опцию **"Override"**
5. Добавьте соответствующую команду (см. ниже)

**Команды для каждого проекта:**

Используйте эти команды (без дополнительных операторов):

- **site**: `git diff HEAD^ HEAD --quiet -- site/ shared/`
- **admin**: `git diff HEAD^ HEAD --quiet -- admin/ shared/`
- **workspace**: `git diff HEAD^ HEAD --quiet -- workspace/ shared/`
- **platform**: `git diff HEAD^ HEAD --quiet -- platform/ shared/`

**Важно:**

- НЕ добавляйте `|| exit 1` или другие операторы в конце команды!
- Команда должна быть именно такой, как указано выше

**Как это работает:**

В Vercel Ignored Build Step:

- **Exit code 0** (успех) → сборка **пропускается** (skip build)
- **Exit code != 0** (ошибка) → сборка **выполняется** (run build)

`git diff HEAD^ HEAD --quiet -- site/ shared/`:

- Если файлы **НЕ изменились** → возвращает **0** → сборка **пропускается** ✅
- Если файлы **изменились** → возвращает **1** → сборка **выполняется** ✅
- Если `HEAD^` не существует (первый коммит или shallow clone) → возвращает **1** → сборка **выполняется** ✅ (это нормально)

**Важно:**

- `shared/` включен во все команды, так как изменения в общем коде влияют на все проекты
- При первом коммите или если `HEAD^` недоступен (shallow clone), команда вернет 1 → сборка выполнится (это нормально)
- **При первом применении настроек Ignored Build Step** Vercel может собрать все проекты один раз — это нормально и ожидаемо
- **После первого применения** команды будут работать корректно, и сборки будут происходить только при изменениях в соответствующих директориях

**Почему все проекты пересобрались при первом применении:**

Когда вы впервые настраиваете Ignored Build Step и делаете коммит (например, обновление README), Vercel:

1. Видит новый коммит
2. Проверяет Ignored Build Step для каждого проекта
3. Если `HEAD^` недоступен или это первый коммит после настройки → команда возвращает ошибку → сборка выполняется
4. Это нормальное поведение при первом применении

**Проверка работы:**

После первого применения сделайте тестовый коммит:

- Измените файл только в `site/app/page.tsx` → должен собраться только **site**
- Измените файл только в `admin/app/page.tsx` → должен собраться только **admin**
- Измените только `README.md` → **ничего** не должно собраться

**Примеры:**

- Изменили файл в `site/app/page.tsx` → соберется только проект **site**
- Изменили файл в `shared/lib/navigation.ts` → соберутся **все** проекты
- Изменили только `README.md` → **ничего** не соберется

### Переменные окружения в Vercel

**Ключевой момент:** В каждом из четырех проектов Vercel нужно настроить **одинаковые** переменные окружения с **production URL** (фактическими доменами):

#### Для каждого проекта (site, admin, workspace, platform):

1. Откройте проект в [Vercel Dashboard](https://vercel.com/dashboard)
2. Перейдите в **Settings** → **Environment Variables**
3. Добавьте следующие переменные для **всех окружений** (Production, Preview, Development):

```
NEXT_PUBLIC_BASE_DOMAIN=oblikflow.com
NEXT_PUBLIC_SITE_URL=https://oblikflow.com
NEXT_PUBLIC_ADMIN_URL=https://admin.oblikflow.com
NEXT_PUBLIC_WORKSPACE_URL=https://workspace.oblikflow.com
NEXT_PUBLIC_PLATFORM_URL=https://platform.oblikflow.com
NEXT_PUBLIC_COOKIE_DOMAIN=.oblikflow.com
```

**Важно:**

- ✅ Используйте **фактические production URL** (не localhost!)
- ✅ Все четыре проекта должны иметь **одинаковые** значения
- ✅ `NEXT_PUBLIC_COOKIE_DOMAIN` должен начинаться с точки (`.oblikflow.com`) для работы cookies между поддоменами
- ✅ Добавьте переменные для всех окружений (Production, Preview, Development)

**Почему одинаковые?**

- Каждое приложение должно знать URL других для навигации между поддоменами
- Cookie domain должен быть одинаковым для работы авторизации между поддоменами
- Это позволяет редиректам и авторизации работать корректно во всех четырех приложениях

### Важные моменты для production

1. **Cookies для поддоменов**: Убедитесь, что `NEXT_PUBLIC_COOKIE_DOMAIN` установлен как `.yourdomain.com` (с точкой в начале) для работы на всех поддоменах

2. **HTTPS**: Vercel автоматически предоставляет SSL сертификаты для всех поддоменов

3. **CORS**: Если используете API, настройте CORS для работы с несколькими поддоменами

4. **SameSite cookies**: В production cookies должны иметь `SameSite=None; Secure` для работы между поддоменами

## Скрипты

### Root level scripts

- `pnpm dev:site` - Запуск site в dev режиме
- `pnpm dev:admin` - Запуск admin в dev режиме
- `pnpm dev:workspace` - Запуск workspace в dev режиме
- `pnpm dev:platform` - Запуск platform в dev режиме
- `pnpm dev:all` - Запуск всех проектов одновременно
- `pnpm build:site` - Сборка site
- `pnpm build:admin` - Сборка admin
- `pnpm build:workspace` - Сборка workspace
- `pnpm build:platform` - Сборка platform
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

- Убедитесь, что `NEXT_PUBLIC_COOKIE_DOMAIN` установлен как `.oblikflow.com` (с точкой в начале)
- Используется HTTPS (Vercel предоставляет автоматически)
- Cookies имеют флаги `SameSite=None; Secure` (устанавливаются автоматически)

**В Development (localhost):**

- Cookies с domain **не работают** для localhost поддоменов (ограничение браузера)
- Используется localStorage как fallback
- Для полноценной работы в dev рекомендуется:
  1. Использовать один домен для всех приложений (например, `localhost:3000` с разными путями)
  2. Или настроить единый прокси-сервер
  3. Или использовать реальный тестовый домен (например, `local.oblikflow.com`)

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
