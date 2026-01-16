# Frontend Middleware - Спецификация

**Дата:** 15 января 2026  
**Версия:** 1.0 (Этап 1 MVP)  
**Статус:** ✅ Утверждено

---

## 📋 Обзор

Данный документ содержит полную спецификацию для реализации единого middleware для всех Next.js приложений OblikFlow:
- **site** (публичный сайт)
- **admin** (административная панель)
- **workspace** (рабочее пространство предприятий)
- **platform** (системная администрация)

**Цель:** Один Supabase клиент, один чек сессии, общий конфиг для маршрутов и ролей.

---

## 🎯 Содержание

1. [Источник ролей и доступов](#1-источник-ролей-и-доступов)
2. [Разделение доступов по приложениям](#2-разделение-доступов-по-приложениям)
3. [Поведение при отсутствии сессии/роли](#3-поведение-при-отсутствии-сессиироли)
4. [Куки и кэш](#4-куки-и-кэш)
5. [Supabase и окружение](#5-supabase-и-окружение)
6. [Локаль и i18n](#6-локаль-и-i18n)
7. [Маршрутный matcher](#7-маршрутный-matcher)
8. [Редиректы и логика выхода](#8-редиректы-и-логика-выхода)
9. [Конфигурация middleware](#9-конфигурация-middleware)
10. [Примеры реализации](#10-примеры-реализации)

---

## 1. Источник ролей и доступов

### 1.1 System Admin (глобальная роль)

**Источник:**
```sql
-- В auth.users
SELECT COALESCE(
  (raw_user_meta_data->>'is_system_admin')::BOOLEAN,
  FALSE
) FROM auth.users WHERE id = user_uuid;
```

**RPC функция:**
```sql
SELECT is_system_admin(user_uuid) -- returns BOOLEAN
```

**Важно:**
- ✅ Только `auth.users.raw_user_meta_data->>'is_system_admin'`
- ❌ НЕТ таблицы `public.users.is_system_admin` на Этапе 1

---

### 1.2 Owner и Admin (роли в предприятии)

**Owner:**
```sql
-- Проверка через enterprises.owner_user_id
SELECT id FROM enterprises 
WHERE owner_user_id = :user_id 
  AND id = :enterprise_id
  AND deleted_at IS NULL
  AND status = 'active';
```

**Admin или Owner:**
```sql
-- Проверка через enterprise_memberships
SELECT r.name FROM enterprise_memberships em
JOIN roles r ON em.role_id = r.id
WHERE em.user_id = :user_id
  AND em.enterprise_id = :enterprise_id
  AND em.status = 'active'
  AND r.name IN ('owner', 'admin');
```

**RPC функция:**
```sql
SELECT get_user_enterprise_role(:user_id, :enterprise_id) 
-- returns 'owner' | 'admin' | NULL
```

**⚠️ Важно:** 
- Owner также присутствует в `enterprise_memberships` с ролью `'owner'`
- Проверка роли — **один JOIN**, без UNION

---

### 1.3 Роли на Этапе 1

**Используем только 3 роли:**

| Роль           | Источник                               | Проверка                        |
| -------------- | -------------------------------------- | ------------------------------- |
| `system_admin` | `auth.users.raw_user_meta_data`        | `is_system_admin(user_uuid)`    |
| `owner`        | `enterprises.owner_user_id`            | `get_user_enterprise_role(...)` |
| `admin`        | `enterprise_memberships` + `roles`     | `get_user_enterprise_role(...)` |

**Игнорируем:**
- ❌ Permissions (~40 штук в БД) — проверка на Этапе 2
- ❌ Кастомные роли — Этап 2+

---

### 1.4 Блокировка неавторизованных пользователей

**Правило:** Middleware проверяет JWT для защищенных страниц.

**Редирект при отсутствии JWT:**
- `/login?redirect=...` (для всех защищенных страниц)

**Проверка ролей и доступов:**
- **platform**: Backend API проверяет superAdmin статус
- **admin**: Проверяется только JWT в middleware. Backend API вернет список предприятий (может быть пустым)
- **workspace**: Backend API проверяет доступ к конкретному предприятию по `current_enterprise_id`

---

## 2. Разделение доступов по приложениям

### 2.1 Матрица доступов

| Приложение  | Префикс      | Middleware проверяет                     | Требует enterprise_id |
| ----------- | ------------ | ---------------------------------------- | --------------------- |
| **platform** | `/platform`  | JWT + Backend API `/check-superadmin`    | ❌ Нет                 |
| **admin**    | `/admin`     | ✅ **Только JWT** (авторизован)          | ❌ Нет                 |
| **workspace**| `/workspace` | JWT + cookie + Backend API `/check-enterprise-access` | ✅ **ДА** |
| **site**     | `/`          | JWT для защищенных страниц               | ❌ Нет                 |

**Примечания:**
- **admin**: Middleware проверяет только JWT. Страница сама получит список предприятий через `/api/enterprises`
- **workspace**: Требует cookie `current_enterprise_id` и проверку доступа через Backend API
- **platform**: Только superAdmin (проверка через Backend API)
- Других секций/префиксов на Этапе 1 **НЕТ**

---

### 2.2 Публичные маршруты для site

```typescript
const publicRoutes = [
  // Auth pages
  '/',
  '/login',
  '/signup',
  '/reset-password',
  '/reset-password/confirm',
  '/auth/callback',       // OAuth callback
  '/auth/verify',         // Email verification
  
  // Legal pages
  '/legal/privacy',
  '/legal/terms',
  
  // Marketing pages
  '/contact',
  '/pricing',
  '/features',
  '/about',
  '/blog',
  '/blog/*',              // Wildcard для статей блога
];
```

**Правило:** Если маршрут в `publicRoutes` → доступен без авторизации.

---

### 2.3 Публичные маршруты для admin/workspace/platform

**Разрешены только:**

```typescript
const adminStaticRoutes = [
  '/_next/static/*',      // Next.js статика
  '/_next/image/*',       // Next.js оптимизация изображений
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/api/health',          // Health check (опционально)
];
```

**Все остальные маршруты** требуют авторизации и проверки роли.

---

## 3. Поведение при отсутствии сессии/роли

### 3.1 Отсутствие валидной сессии

**Для всех приложений (site, admin, workspace, platform):**

```typescript
if (!session) {
  // Сохранить текущий путь для редиректа после логина
  const redirectUrl = encodeURIComponent(
    request.nextUrl.pathname + request.nextUrl.search
  );
  
  return NextResponse.redirect(
    new URL(`/login?redirect=${redirectUrl}`, request.url)
  );
}
```

**Исключения:**
- Публичные маршруты из `publicRoutes` (см. п. 2.2)
- Статические файлы (см. п. 2.3)

---

### 3.2 Недостаток роли (403 Forbidden)

#### Сценарий A: Нет доступа к **platform**

```typescript
if (pathname.startsWith('/platform') && !isSystemAdmin) {
  // Redirect на admin
  return NextResponse.redirect(new URL('/admin', request.url));
}
```

#### Сценарий B: **admin** - авторизованный пользователь

```typescript
if (pathname.startsWith('/admin')) {
  // Middleware проверяет только JWT (уже проверен выше)
  // Страница сама получит список предприятий через /api/enterprises
  return NextResponse.next();
}
```

#### Сценарий C: Нет доступа к **workspace**

```typescript
// Для workspace - проверка доступа через Backend API
if (pathname.startsWith('/workspace')) {
  const enterpriseId = request.cookies.get('current_enterprise_id')?.value;
  
  if (!enterpriseId) {
    // Нет cookie - редирект на admin для выбора
    return NextResponse.redirect(new URL('/admin', request.url));
  }
  
  // TODO: Проверка доступа через Backend API /api/auth/check-enterprise-access
  // Если нет доступа - редирект на /admin
}
```

#### Сценарий D: Workspace без выбранного предприятия

```typescript
if (pathname.startsWith('/workspace')) {
  const enterpriseId = request.cookies.get('current_enterprise_id')?.value;
  
  if (!enterpriseId) {
    // Автовыбор предприятия
    const selectedId = await autoSelectEnterprise(userId, enterprises);
    
    if (!selectedId) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    
    // Установить cookie и redirect на тот же URL
    const response = NextResponse.redirect(request.url);
    response.cookies.set('current_enterprise_id', selectedId, {
      path: '/',
      maxAge: 2592000, // 30 дней
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    
    return response;
  }
  
  // Проверить доступ к выбранному предприятию
  const hasAccess = enterprises.some(e => e.enterprise_id === enterpriseId);
  
  if (!hasAccess) {
    // Нет доступа → очистить cookie и redirect на admin
    const response = NextResponse.redirect(new URL('/admin', request.url));
    response.cookies.delete('current_enterprise_id');
    return response;
  }
}
```

**Автовыбор предприятия:**
```typescript
function autoSelectEnterprise(
  userId: string, 
  enterprises: Array<{ enterprise_id: string; role_name: string; is_owner: boolean }>
): string | null {
  if (!enterprises.length) return null;
  
  // Приоритет: owner > admin > первое
  const ownerEnterprise = enterprises.find(e => e.is_owner);
  if (ownerEnterprise) return ownerEnterprise.enterprise_id;
  
  const adminEnterprise = enterprises.find(e => e.role_name === 'admin');
  if (adminEnterprise) return adminEnterprise.enterprise_id;
  
  return enterprises[0].enterprise_id;
}
```

---

### 3.3 Отдельные callbacks или хардкод?

**Решение:** ❌ Callbacks НЕ нужны на Этапе 1.

**Причина:** Логика простая, хардкод в middleware достаточен. Callbacks усложнят код.

---

## 4. Куки и кэш

### 4.1 Куки для очистки при потере сессии

```typescript
const cookiesToClear = [
  'current_enterprise_id',              // Выбранное предприятие
  // 'sb-<project-ref>-auth-token'      // Supabase автоматически чистит
];

// ❌ НЕ чистить NEXT_LOCALE - пользователь может войти снова с тем же языком
```

**При logout:**
```typescript
function clearSessionCookies(response: NextResponse) {
  response.cookies.delete('current_enterprise_id');
  // Locale НЕ удаляем
}
```

---

### 4.2 Политика для NEXT_LOCALE

```typescript
response.cookies.set('NEXT_LOCALE', locale, {
  name: 'NEXT_LOCALE',
  path: '/',
  maxAge: 31536000,        // 1 год (365 дней)
  sameSite: 'lax',         // Lax для совместимости с OAuth
  secure: process.env.NODE_ENV === 'production', // HTTPS только на prod
  domain: process.env.COOKIE_DOMAIN || undefined, // Для multi-subdomain (если нужно)
});
```

**Параметры:**
- **maxAge:** `31536000` секунд (1 год)
- **sameSite:** `'lax'` (работает с OAuth redirects)
- **secure:** `true` на production, `false` на dev
- **domain:** Опционально, для shared cookies между subdomain

---

### 4.3 Политика для current_enterprise_id

```typescript
response.cookies.set('current_enterprise_id', enterpriseId, {
  name: 'current_enterprise_id',
  path: '/',
  maxAge: 2592000,         // 30 дней
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  httpOnly: false,         // Нужен доступ из JS для API запросов
});
```

---

### 4.4 Другие обязательные куки

**На Этапе 1:**
- ❌ A/B testing cookies — Этап 2+
- ❌ Feature flags cookies — Этап 2+
- ❌ Analytics cookies — Этап 2+

---

## 5. Supabase и окружение

### 5.1 Какие ключи использовать в middleware?

**Ответ:** ✅ **Публичный anon key**

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

const supabase = createMiddlewareClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // ← anon key
});
```

**Почему НЕ service role:**
- Service role — для backend API routes (NestJS, Next.js API routes)
- Middleware работает на edge/client → используем anon key
- Anon key достаточен для проверки сессии и вызова RPC functions

---

### 5.2 Edge Runtime

**Можно ли использовать Edge?**
- ✅ **ДА**, можно
- Supabase client поддерживает Edge Runtime
- RPC функции работают через Supabase REST API

**Ограничения:**
- ❌ Прямые SQL запросы НЕ работают в Edge
- ✅ RPC функции работают (используем их)

**Конфигурация:**
```typescript
// middleware.ts
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
  runtime: 'experimental-edge', // Опционально
};
```

---

### 5.3 Специальные заголовки на ответе

```typescript
// Устанавливать на каждом response
response.headers.set('x-pathname', request.nextUrl.pathname);

// Если есть сессия
if (userId) {
  response.headers.set('x-user-id', userId);
}

// Если выбрано предприятие
if (enterpriseId) {
  response.headers.set('x-enterprise-id', enterpriseId);
}

// Текущая локаль
response.headers.set('x-next-intl-locale', locale);
```

**Использование:**
- Для отладки (DevTools)
- Для SSR компонентов (чтение headers в `getServerSideProps`)

---

## 6. Локаль и i18n

### 6.1 Что устанавливать для next-intl?

**Достаточно:**
1. ✅ Cookie `NEXT_LOCALE`
2. ✅ Header `x-next-intl-locale`

**next-intl автоматически читает:**
- Cookie `NEXT_LOCALE`
- Header `x-next-intl-locale`

**Не нужно:**
- ❌ Дополнительные headers (next-intl не требует)

---

### 6.2 Accept-Language для публичных страниц

**Логика для site (без cookie):**

```typescript
function detectLocale(request: NextRequest): string {
  // 1. Cookie (приоритет)
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && supportedLocales.includes(cookieLocale)) {
    return cookieLocale;
  }
  
  // 2. Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const browserLocale = acceptLanguage.split(',')[0]?.split('-')[0]; // en-US → en
    if (supportedLocales.includes(browserLocale)) {
      return browserLocale;
    }
  }
  
  // 3. Fallback
  return process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'uk';
}

const supportedLocales = ['uk', 'en', 'pl', 'ru', 'de', 'fr', 'sk', 'es'];
```

**Записать в cookie при первом визите:**
```typescript
if (!cookieLocale && isPublicPage) {
  const detectedLocale = detectLocale(request);
  response.cookies.set('NEXT_LOCALE', detectedLocale, { ...cookieConfig });
}
```

---

### 6.3 Workspace локаль (из enterprise)

**Для workspace:** НЕ использовать cookie, брать из `enterprises.default_locale`.

```typescript
if (pathname.startsWith('/workspace') && enterpriseId) {
  // Получить локаль предприятия
  const { data: enterprise } = await supabase
    .from('enterprises')
    .select('default_locale')
    .eq('id', enterpriseId)
    .single();
  
  const workspaceLocale = enterprise?.default_locale 
    || process.env.NEXT_PUBLIC_DEFAULT_LOCALE 
    || 'uk';
  
  response.headers.set('x-next-intl-locale', workspaceLocale);
}
```

---

## 7. Маршрутный matcher

### 7.1 Matcher для middleware

```typescript
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - files with extensions: svg, png, jpg, jpeg, gif, webp, ico
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
```

**Исключает:**
- `_next/static/*` - Next.js статика
- `_next/image/*` - Next.js оптимизация изображений
- `favicon.ico`, `sitemap.xml`, `robots.txt`
- Файлы с расширениями: `svg`, `png`, `jpg`, `jpeg`, `gif`, `webp`, `ico`

---

### 7.2 Особые исключения

**На Этапе 1:**
- ❌ Других особых исключений НЕТ
- ✅ Стандартный matcher выше достаточен

**На Этапе 2+ (если понадобится):**
- Дополнительные asset-пути (fonts, videos, etc.)
- Webhooks endpoints (если будут)

---

## 8. Редиректы и логика выхода

### 8.1 Logout endpoint

**Требуется:** ✅ **ДА**, `/auth/logout` или `/api/auth/logout`

```typescript
// app/api/auth/logout/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Logout из Supabase
  await supabase.auth.signOut();
  
  const response = NextResponse.redirect(new URL('/login', request.url));
  
  // Очистить куки
  response.cookies.delete('current_enterprise_id');
  // NEXT_LOCALE оставляем!
  
  return response;
}
```

**Вызов с фронтенда:**
```typescript
async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login';
}
```

---

### 8.2 Silent refresh

**Требуется:** ❌ **НЕТ**, не нужен

**Почему:**
- Supabase автоматически обновляет токены
- `supabase.auth.getUser()` в middleware автоматически рефрешит токен

```typescript
// В middleware - просто вызываем getUser()
const { data: { user }, error } = await supabase.auth.getUser();
// ^ Supabase автоматически обновит токен если он истёк
```

---

### 8.3 OAuth callback

**Требуется:** ✅ **ДА**, `/auth/callback`

**Маршрут:** Публичный (см. п. 2.2)

```typescript
// app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to origin or admin
  return NextResponse.redirect(requestUrl.origin + '/admin');
}
```

---

## 9. Конфигурация middleware

### 9.1 Структура конфига

```typescript
// middleware.config.ts
export const middlewareConfig = {
  apps: {
    platform: {
      prefix: '/platform',
      allowedRoles: ['system_admin'],
      redirectOnNoAccess: '/admin',
      requiresEnterprise: false,
    },
    admin: {
      prefix: '/admin',
      allowedRoles: ['any'], // Проверяем только JWT, ролевые проверки на странице
      redirectOnNoAccess: '/',
      requiresEnterprise: false,
    },
    workspace: {
      prefix: '/workspace',
      allowedRoles: ['system_admin', 'owner', 'admin'],
      redirectOnNoAccess: '/admin',
      requiresEnterprise: true,
    },
    site: {
      prefix: '/',
      publicRoutes: [
        '/',
        '/login',
        '/signup',
        '/reset-password',
        '/reset-password/confirm',
        '/auth/callback',
        '/auth/verify',
        '/legal/privacy',
        '/legal/terms',
        '/contact',
        '/pricing',
        '/features',
        '/about',
        '/blog',
        '/blog/*',
      ],
      allowedRoles: ['any'],
      requiresEnterprise: false,
    },
  },
  
  cookies: {
    locale: {
      name: 'NEXT_LOCALE',
      maxAge: 31536000, // 1 год
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
    },
    enterprise: {
      name: 'current_enterprise_id',
      maxAge: 2592000, // 30 дней
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false,
    },
  },
  
  locales: {
    default: 'uk',
    supported: ['uk', 'en', 'pl', 'ru', 'de', 'fr', 'sk', 'es'],
  },
  
  redirects: {
    onNoSession: '/login',
    onNoEnterprises: '/welcome',
    onNoAccess: '/admin',
  },
};
```

---

### 9.2 TypeScript типы

```typescript
type RoleName = 'system_admin' | 'owner' | 'admin' | 'any';

interface AppConfig {
  prefix: string;
  allowedRoles: RoleName[];
  redirectOnNoAccess: string;
  requiresEnterprise: boolean;
  publicRoutes?: string[];
}

interface CookieConfig {
  name: string;
  maxAge: number;
  sameSite: 'strict' | 'lax' | 'none';
  secure: boolean;
  httpOnly?: boolean;
}

interface MiddlewareConfig {
  apps: Record<string, AppConfig>;
  cookies: {
    locale: CookieConfig;
    enterprise: CookieConfig;
  };
  locales: {
    default: string;
    supported: string[];
  };
  redirects: {
    onNoSession: string;
    onNoEnterprises: string;
    onNoAccess: string;
  };
}
```

---

## 10. Примеры реализации

### 10.1 Базовая структура middleware

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { middlewareConfig } from './middleware.config';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Создать Supabase client
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  
  // 2. Проверить сессию
  const { data: { user }, error } = await supabase.auth.getUser();
  
  // 3. Определить приложение
  const app = detectApp(pathname);
  
  // 4. Публичные маршруты
  if (isPublicRoute(pathname, app)) {
    return handlePublicRoute(request, res, user);
  }
  
  // 5. Требуется авторизация
  if (!user) {
    return redirectToLogin(request);
  }
  
  // 6. Проверить роль
  const hasAccess = await checkAccess(user.id, app, request, supabase);
  
  if (!hasAccess) {
    return redirectOnNoAccess(app);
  }
  
  // 7. Установить headers и cookies
  return finalizeResponse(res, user, request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
```

---

### 10.2 Определение приложения

```typescript
function detectApp(pathname: string): keyof typeof middlewareConfig.apps {
  if (pathname.startsWith('/platform')) return 'platform';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/workspace')) return 'workspace';
  return 'site';
}
```

---

### 10.3 Проверка публичного маршрута

```typescript
function isPublicRoute(pathname: string, app: string): boolean {
  const appConfig = middlewareConfig.apps[app];
  
  if (!appConfig.publicRoutes) return false;
  
  return appConfig.publicRoutes.some(route => {
    if (route.endsWith('/*')) {
      // Wildcard match
      const prefix = route.slice(0, -2);
      return pathname.startsWith(prefix);
    }
    return pathname === route;
  });
}
```

---

### 10.4 Проверка доступа

```typescript
async function checkAccess(
  userId: string,
  app: keyof typeof middlewareConfig.apps,
  request: NextRequest,
  supabase: SupabaseClient
): Promise<boolean> {
  const appConfig = middlewareConfig.apps[app];
  
  // 1. Проверить system_admin
  if (appConfig.allowedRoles.includes('system_admin')) {
    const { data: isAdmin } = await supabase.rpc('is_system_admin', {
      user_uuid: userId,
    });
    
    if (isAdmin) return true;
  }
  
  // 2. Проверить owner/admin
  if (appConfig.allowedRoles.includes('owner') || appConfig.allowedRoles.includes('admin')) {
    // Для workspace - проверить доступ к конкретному предприятию через Backend API
    if (appConfig.requiresEnterprise) {
      const enterpriseId = request.cookies.get('current_enterprise_id')?.value;
      
      if (!enterpriseId) {
        // Нет cookie - пускаем, автовыбор будет на странице
        return true;
      }
      
      // Проверяем доступ через Backend API
      // TODO: Реализовать вызов /api/auth/check-enterprise-access
      // Пока пускаем, проверка будет на странице
      return true;
    }
    
    // Для admin - просто пускаем (авторизован)
    // Страница сама получит список предприятий через /api/enterprises
    // Backend вернет пустой список если нет предприятий
    return true;
  }
  
  // 3. 'any' - всегда true
  if (appConfig.allowedRoles.includes('any')) {
    return true;
  }
  
  return false;
}
```

---

### 10.5 Обработка локали

```typescript
function handleLocale(
  request: NextRequest,
  response: NextResponse,
  app: string,
  enterpriseId?: string
): string {
  const { locales } = middlewareConfig;
  
  // Для workspace - использовать локаль предприятия
  if (app === 'workspace' && enterpriseId) {
    // TODO: fetch enterprise.default_locale from DB
    // Для простоты используем cookie или default
    const workspaceLocale = locales.default;
    response.headers.set('x-next-intl-locale', workspaceLocale);
    return workspaceLocale;
  }
  
  // Для остальных - использовать cookie или detect
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  
  if (cookieLocale && locales.supported.includes(cookieLocale)) {
    response.headers.set('x-next-intl-locale', cookieLocale);
    return cookieLocale;
  }
  
  // Detect from Accept-Language
  const acceptLanguage = request.headers.get('accept-language');
  const browserLocale = acceptLanguage?.split(',')[0]?.split('-')[0] || '';
  
  const detectedLocale = locales.supported.includes(browserLocale)
    ? browserLocale
    : locales.default;
  
  // Установить cookie
  response.cookies.set('NEXT_LOCALE', detectedLocale, middlewareConfig.cookies.locale);
  response.headers.set('x-next-intl-locale', detectedLocale);
  
  return detectedLocale;
}
```

---

### 10.6 Автовыбор предприятия

```typescript
async function handleEnterpriseSelection(
  request: NextRequest,
  response: NextResponse,
  userId: string,
  supabase: SupabaseClient
): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  
  if (!pathname.startsWith('/workspace')) {
    return response;
  }
  
  const enterpriseId = request.cookies.get('current_enterprise_id')?.value;
  
  if (enterpriseId) {
    // Уже выбрано
    return response;
  }
  
  // Автовыбор
  const { data: enterprises } = await supabase.rpc('get_user_enterprises', {
    p_user_id: userId,
  });
  
  if (!enterprises || enterprises.length === 0) {
    return NextResponse.redirect(new URL('/welcome', request.url));
  }
  
  // Приоритет: owner > admin > первое
  const ownerEnterprise = enterprises.find((e: any) => e.is_owner);
  const selectedId = ownerEnterprise?.enterprise_id 
    || enterprises.find((e: any) => e.role_name === 'admin')?.enterprise_id
    || enterprises[0].enterprise_id;
  
  // Установить cookie и redirect
  const redirectResponse = NextResponse.redirect(request.url);
  redirectResponse.cookies.set(
    'current_enterprise_id',
    selectedId,
    middlewareConfig.cookies.enterprise
  );
  
  return redirectResponse;
}
```

---

### 10.7 Финализация ответа

```typescript
function finalizeResponse(
  response: NextResponse,
  user: any,
  request: NextRequest
): NextResponse {
  const { pathname } = request.nextUrl;
  
  // Установить headers
  response.headers.set('x-pathname', pathname);
  
  if (user) {
    response.headers.set('x-user-id', user.id);
  }
  
  const enterpriseId = request.cookies.get('current_enterprise_id')?.value;
  if (enterpriseId) {
    response.headers.set('x-enterprise-id', enterpriseId);
  }
  
  // Обработать локаль
  const app = detectApp(pathname);
  handleLocale(request, response, app, enterpriseId);
  
  return response;
}
```

---

### 10.8 Редиректы

```typescript
function redirectToLogin(request: NextRequest): NextResponse {
  const redirectUrl = encodeURIComponent(
    request.nextUrl.pathname + request.nextUrl.search
  );
  
  return NextResponse.redirect(
    new URL(`/login?redirect=${redirectUrl}`, request.url)
  );
}

function redirectOnNoAccess(app: string): NextResponse {
  const appConfig = middlewareConfig.apps[app];
  return NextResponse.redirect(new URL(appConfig.redirectOnNoAccess, request.url));
}
```

---

## 📚 Связанные документы

- [API Contract](./API_CONTRACT.md) - Контракт фронтенд ↔ бэкенд
- [Backend Headers Guide](./BACKEND_HEADERS_GUIDE.md) - Передача токена и headers
- [Localization](../LOCALIZATION.md) - Локализация приложения
- [Database Schema](../../database/migrations/000_init_schema.sql) - Схема БД
- [RPC Functions](../../database/migrations/004_rpc_functions.sql) - RPC функции для проверки ролей
- [RLS Policies](../../database/migrations/005_rls_policies.sql) - Row Level Security

---

## ✅ Чеклист реализации

### Этап 1: Базовая структура
- [ ] Создать `middleware.config.ts` с конфигом
- [ ] Создать базовую структуру `middleware.ts`
- [ ] Настроить matcher для исключения статики

### Этап 2: Авторизация
- [ ] Интегрировать Supabase client (anon key)
- [ ] Проверка сессии через `auth.getUser()`
- [ ] Редирект на `/login` при отсутствии сессии

### Этап 3: Проверка доступов
- [ ] **platform**: Backend API `/api/auth/check-superadmin`
- [ ] **admin**: Только JWT (пускаем всех авторизованных)
- [ ] **workspace**: Backend API `/api/auth/check-enterprise-access`
- [ ] **site**: JWT для защищенных страниц

### Этап 4: Куки
- [ ] Установка `NEXT_LOCALE` (1 год)
- [ ] Установка `current_enterprise_id` (30 дней)
- [ ] Очистка куки при logout (кроме locale)

### Этап 5: Локализация
- [ ] Detect locale из cookie/Accept-Language
- [ ] Установка `x-next-intl-locale` header
- [ ] Workspace locale из `enterprises.default_locale`

### Этап 6: Workspace
- [ ] Автовыбор предприятия (owner > admin > first)
- [ ] Проверка доступа к выбранному предприятию
- [ ] Redirect при отсутствии предприятий

### Этап 7: Headers
- [ ] `x-pathname`
- [ ] `x-user-id` (если есть сессия)
- [ ] `x-enterprise-id` (если выбрано)
- [ ] `x-next-intl-locale`

### Этап 8: Edge cases
- [ ] Публичные маршруты site
- [ ] OAuth callback `/auth/callback`
- [ ] Logout endpoint `/api/auth/logout`
- [ ] Race condition при автовыборе (redirect)

### Этап 9: Тестирование
- [ ] Unit тесты для `checkAccess()`
- [ ] Unit тесты для `detectLocale()`
- [ ] E2E тесты для редиректов
- [ ] E2E тесты для автовыбора предприятия

---

## 🐛 Известные Edge Cases

### 1. Race condition при автовыборе
**Проблема:** Middleware устанавливает cookie, но компонент делает API запрос до применения cookie.

**Решение:** Redirect на тот же URL после установки cookie (см. п. 10.6).

### 2. Пользователь удалён из предприятия
**Проблема:** Cookie `current_enterprise_id` указывает на предприятие, к которому нет доступа.

**Решение:** Проверка `hasAccess` в middleware + очистка cookie + redirect на `/admin`.

### 3. JWT истёк во время работы
**Проблема:** Токен истекает, пока пользователь работает.

**Решение:** `supabase.auth.getUser()` автоматически обновит токен (silent refresh).

### 4. Несколько табов/окон
**Проблема:** Пользователь меняет предприятие в одной табе, другая таба не обновляется.

**Решение:** На Этапе 2 - BroadcastChannel API для синхронизации. На Этапе 1 - игнорируем.

---

**Статус:** ✅ Утверждено  
**Дата:** 15 января 2026  
**Версия:** 1.0 (Этап 1 MVP)
