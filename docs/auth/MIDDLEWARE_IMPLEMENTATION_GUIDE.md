# Frontend Middleware - Руководство по реализации

**Дата:** 15 января 2026  
**Версия:** 1.0  
**Для:** Frontend команда (Next.js)

---

## 🎯 Цель

Реализовать middleware для контроля доступа к **рендерингу страниц** в Next.js приложении.

**Что делает middleware:**

- ✅ Проверяет наличие JWT токена
- ✅ Контролирует доступ к разделам: site, admin, workspace, platform
- ✅ Редиректит пользователя при отсутствии доступа
- ❌ НЕ проверяет доступ к данным (это делает backend API)

---

## 📋 Структура приложений

| Раздел        | Префикс      | Требования доступа                  |
| ------------- | ------------ | ----------------------------------- |
| **site**      | `/`          | Публичные + авторизованные страницы |
| **admin**     | `/admin`     | Авторизация (JWT)                   |
| **workspace** | `/workspace` | Авторизация + доступ к предприятию  |
| **platform**  | `/platform`  | Авторизация + superadmin            |

---

## 🔧 Реализация

### 1. Установка зависимостей

```bash
npm install @supabase/auth-helpers-nextjs @supabase/supabase-js
```

---

### 2. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001  # URL вашего NestJS backend
```

---

### 3. Создать middleware.ts

```typescript
// middleware.ts
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Пропустить публичные маршруты
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // 2. Создать Supabase client
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  // 3. Проверить JWT
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    // Нет JWT - redirect на login
    const redirectUrl = encodeURIComponent(pathname + request.nextUrl.search);
    return NextResponse.redirect(
      new URL(`/login?redirect=${redirectUrl}`, request.url)
    );
  }

  // 4. Получить токен для backend запросов
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 5. Проверить доступ к platform
  if (pathname.startsWith("/platform")) {
    const hasAccess = await checkPlatformAccess(token);

    if (!hasAccess) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  // 6. Проверить доступ к workspace
  if (pathname.startsWith("/workspace")) {
    const enterpriseId = request.cookies.get("current_enterprise_id")?.value;

    if (!enterpriseId) {
      // Нет выбранного предприятия - redirect на admin
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    const hasAccess = await checkWorkspaceAccess(token, enterpriseId);

    if (!hasAccess) {
      // Нет доступа - очистить cookie и redirect
      const response = NextResponse.redirect(new URL("/admin", request.url));
      response.cookies.delete("current_enterprise_id");
      return response;
    }
  }

  // 7. Admin - просто пускаем (авторизован)
  // Site - уже прошел через isPublicRoute

  return res;
}

// ────────────────────────────────────
// Вспомогательные функции
// ────────────────────────────────────

function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/reset-password",
    "/reset-password/confirm",
    "/auth/callback",
    "/auth/verify",
    "/legal/privacy",
    "/legal/terms",
    "/contact",
    "/pricing",
    "/features",
    "/about",
    "/blog",
  ];

  // Exact match
  if (publicRoutes.includes(pathname)) {
    return true;
  }

  // Wildcard match (например /blog/*)
  if (pathname.startsWith("/blog/")) {
    return true;
  }

  return false;
}

async function checkPlatformAccess(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/check-superadmin`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    return response.ok;
  } catch (error) {
    console.error("Error checking platform access:", error);
    return false;
  }
}

async function checkWorkspaceAccess(
  token: string,
  enterpriseId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/auth/check-enterprise-access?enterpriseId=${enterpriseId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Error checking workspace access:", error);
    return false;
  }
}

// ────────────────────────────────────
// Matcher config
// ────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - files with extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
```

---

### 4. Обработка локали (опционально)

Если используете `next-intl`:

```typescript
// middleware.ts (дополнение)

export async function middleware(request: NextRequest) {
  // ... весь код выше ...

  // 8. Обработать локаль
  const locale = detectLocale(request);
  res.headers.set("x-next-intl-locale", locale);

  return res;
}

function detectLocale(request: NextRequest): string {
  const supportedLocales = ["uk", "en", "pl", "ru", "de", "fr", "sk", "es"];

  // 1. Cookie (приоритет)
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale && supportedLocales.includes(cookieLocale)) {
    return cookieLocale;
  }

  // 2. Accept-Language header
  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) {
    const browserLocale = acceptLanguage.split(",")[0]?.split("-")[0];
    if (supportedLocales.includes(browserLocale)) {
      return browserLocale;
    }
  }

  // 3. Fallback
  return process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "uk";
}
```

---

## 🎨 Использование на страницах

### Admin Layout

```typescript
// app/admin/layout.tsx
export default function AdminLayout({ children }) {
  // Middleware уже проверил авторизацию
  // Можно сразу загружать данные

  return (
    <div>
      <AdminSidebar />
      <main>{children}</main>
    </div>
  );
}
```

### Workspace Layout

```typescript
// app/workspace/layout.tsx
import { cookies } from "next/headers";

export default async function WorkspaceLayout({ children }) {
  // Middleware уже проверил доступ к предприятию
  const enterpriseId = cookies().get("current_enterprise_id")?.value;

  // Загрузить данные предприятия (backend проверит доступ ещё раз)
  const enterprise = await fetchEnterprise(enterpriseId);

  return (
    <WorkspaceProvider enterprise={enterprise}>{children}</WorkspaceProvider>
  );
}
```

### Platform Layout

```typescript
// app/platform/layout.tsx
export default function PlatformLayout({ children }) {
  // Middleware уже проверил superadmin

  return (
    <div>
      <PlatformSidebar />
      <main>{children}</main>
    </div>
  );
}
```

---

## 🍪 Управление cookie current_enterprise_id

### Установить при выборе предприятия

```typescript
// app/admin/EnterpriseSelector.tsx
"use client";

import { useRouter } from "next/navigation";

export function EnterpriseSelector({ enterprises }) {
  const router = useRouter();

  const handleSelect = (enterpriseId: string) => {
    // Установить cookie
    document.cookie = `current_enterprise_id=${enterpriseId}; path=/; max-age=2592000`; // 30 дней

    // Redirect на workspace
    router.push("/workspace");
  };

  return (
    <div>
      {enterprises.map((e) => (
        <button key={e.id} onClick={() => handleSelect(e.id)}>
          {e.name}
        </button>
      ))}
    </div>
  );
}
```

### Очистить при logout

```typescript
// app/logout/page.tsx (или API route)
"use client";

export default function LogoutPage() {
  const handleLogout = async () => {
    // 1. Logout из Supabase
    await supabase.auth.signOut();

    // 2. Очистить cookie
    document.cookie = "current_enterprise_id=; path=/; max-age=0";

    // 3. Redirect на login
    window.location.href = "/login";
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

---

## 🔍 Отладка

### Проверить что middleware работает

1. **Откройте DevTools → Network**
2. **Перейдите на `/platform`**
3. **Должны увидеть запрос:**
   ```
   GET /api/auth/check-superadmin
   Authorization: Bearer ...
   ```
4. **Если 403** → редирект на `/admin`
5. **Если 200** → страница отрендерится

### Логи в middleware

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  console.log("[Middleware]", pathname, user?.id);

  if (pathname.startsWith("/platform")) {
    const hasAccess = await checkPlatformAccess(token);
    console.log("[Platform] Access:", hasAccess);
    // ...
  }
}
```

---

## ⚠️ Важные моменты

### 1. Не использовать RPC напрямую в middleware

❌ **Неправильно:**

```typescript
const { data } = await supabase.rpc("is_system_admin", { user_uuid: user.id });
```

✅ **Правильно:**

```typescript
const response = await fetch(`${BACKEND_URL}/api/auth/check-superadmin`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

**Почему:** Backend - единственный источник истины для проверки ролей.

---

### 2. Cache control для backend запросов

```typescript
const response = await fetch(url, {
  cache: "no-store", // ← ВАЖНО! Не кэшировать проверки доступа
});
```

---

### 3. Error handling

```typescript
async function checkPlatformAccess(token: string): Promise<boolean> {
  try {
    const response = await fetch(...);
    return response.ok;
  } catch (error) {
    console.error('Error checking platform access:', error);
    // При ошибке - запретить доступ (fail-safe)
    return false;
  }
}
```

---

## 📊 Матрица проверок

| Страница     | JWT | Backend запрос            | Cookie                  | Редирект при ошибке |
| ------------ | --- | ------------------------- | ----------------------- | ------------------- |
| `/` (public) | -   | -                         | -                       | -                   |
| `/login`     | -   | -                         | -                       | -                   |
| `/admin`     | ✅  | -                         | -                       | → `/login`          |
| `/workspace` | ✅  | `check-enterprise-access` | `current_enterprise_id` | → `/admin`          |
| `/platform`  | ✅  | `check-superadmin`        | -                       | → `/admin`          |

---

## 🧪 Тестирование

### Test Case 1: Неавторизованный пользователь

```
1. Открыть /admin без JWT
2. Ожидаемый результат: redirect на /login?redirect=/admin
```

### Test Case 2: Platform без superadmin

```
1. Войти как обычный пользователь
2. Открыть /platform
3. Ожидаемый результат: redirect на /admin
```

### Test Case 3: Workspace без предприятия

```
1. Войти как пользователь
2. Удалить cookie current_enterprise_id
3. Открыть /workspace
4. Ожидаемый результат: redirect на /admin
```

### Test Case 4: Workspace с удалённым доступом

```
1. Войти как пользователь
2. Установить cookie с ID чужого предприятия
3. Открыть /workspace
4. Ожидаемый результат: redirect на /admin + cookie удалён
```

---

## 🚀 Checklist реализации

### Этап 1: Базовая структура

- [ ] Установить зависимости
- [ ] Создать `middleware.ts`
- [ ] Настроить environment variables
- [ ] Добавить `isPublicRoute()` функцию
- [ ] Настроить matcher config

### Этап 2: Проверка JWT

- [ ] Интегрировать Supabase client
- [ ] Проверка `auth.getUser()`
- [ ] Редирект на `/login` при отсутствии JWT

### Этап 3: Platform доступ

- [ ] Функция `checkPlatformAccess()`
- [ ] Запрос к `/api/auth/check-superadmin`
- [ ] Редирект на `/admin` при 403

### Этап 4: Workspace доступ

- [ ] Проверка cookie `current_enterprise_id`
- [ ] Функция `checkWorkspaceAccess()`
- [ ] Запрос к `/api/auth/check-enterprise-access`
- [ ] Редирект + очистка cookie при 403

### Этап 5: Cookie management

- [ ] Установка cookie при выборе предприятия
- [ ] Очистка cookie при logout
- [ ] Очистка cookie при потере доступа

### Этап 6: Локализация (опционально)

- [ ] Функция `detectLocale()`
- [ ] Установка header `x-next-intl-locale`
- [ ] Обработка cookie `NEXT_LOCALE`

### Этап 7: Тестирование

- [ ] Тест неавторизованного доступа
- [ ] Тест platform без superadmin
- [ ] Тест workspace без cookie
- [ ] Тест workspace с неверным enterpriseId

---

## 📚 Связанные документы

- [Middleware Specification](./MIDDLEWARE_SPECIFICATION.md) - Полная спецификация
- [Backend API Specification](./BACKEND_ACCESS_CHECK_API.md) - Спецификация backend endpoints
- [API Contract](./API_CONTRACT.md) - Контракт фронтенд ↔ бэкенд

---

## ❓ FAQ

### Q: Почему не использовать RPC напрямую?

**A:** Backend должен быть единственным источником истины. Если в будущем изменится логика проверки, нужно будет менять только backend.

### Q: Что если backend недоступен?

**A:** Middleware вернёт `false` из `checkAccess()` функций, пользователь не получит доступ к странице (fail-safe).

### Q: Можно ли кэшировать проверки доступа?

**A:** На Этапе 1 - нет. На Этапе 2 можно добавить кэш на 1-5 минут в middleware.

### Q: Нужно ли проверять доступ к admin?

**A:** Нет, достаточно проверить JWT. Страница сама покажет пустой список если нет предприятий.

---

**Статус:** ✅ Готово к реализации  
**Дата:** 15 января 2026  
**Версия:** 1.0
