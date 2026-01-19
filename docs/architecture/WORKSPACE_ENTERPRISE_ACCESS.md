# Workspace - Проверка доступа к Enterprise

## Обзор

Когда пользователь переходит из Admin в Workspace, enterprise_id передается в URL параметре.
Workspace должен проверить доступ пользователя к этому enterprise через backend API перед установкой cookie.

---

## Поток навигации

### 1. Клик на Enterprise в Admin

```
Admin: http://admin.localhost:3001/enterprises
  ↓ (клик на имя enterprise)
Workspace: http://workspace.localhost:3002/workspace?enterprise_id=abc-123
```

**Конфигурация в `enterprises.config.json`:**

```json
{
  "id": "name",
  "name": "name",
  "label": "Назва",
  "type": "link",
  "urlTemplate": "/workspace?enterprise_id={id}",
  "external": true,
  "externalBaseUrl": "WORKSPACE"
}
```

### 2. Workspace получает enterprise_id из URL

**URL:** `http://workspace.localhost:3002/workspace?enterprise_id=abc-123`

---

## Реализация проверки доступа

### Вариант 1: Middleware (рекомендуется)

**Файл:** `workspace/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  
  // Получить JWT токен из cookie (установлен при логине)
  const token = request.cookies.get('supabase-auth-token')?.value;
  
  if (!token) {
    // Не авторизован - redirect на login
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${siteUrl}/login?redirect=${encodeURIComponent(request.url)}`);
  }
  
  // Проверить enterprise_id из URL параметра
  const enterpriseId = searchParams.get('enterprise_id');
  
  if (enterpriseId) {
    // Проверить доступ через backend API
    const hasAccess = await checkEnterpriseAccess(token, enterpriseId);
    
    if (!hasAccess) {
      // Нет доступа - redirect на admin с ошибкой
      const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';
      return NextResponse.redirect(
        `${adminUrl}?error=no_access&message=${encodeURIComponent('У вас нет доступа к этому предприятию')}`
      );
    }
    
    // Доступ есть - установить cookie и redirect без query параметра
    const response = NextResponse.redirect(new URL('/workspace', request.url));
    
    // Установить cookie с enterprise_id
    if (process.env.NODE_ENV === 'production') {
      const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.oblikflow.com';
      response.cookies.set('current_enterprise_id', enterpriseId, {
        domain: cookieDomain,
        httpOnly: false,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 дней
      });
    } else {
      // Development: обычный cookie без domain
      response.cookies.set('current_enterprise_id', enterpriseId, {
        httpOnly: false,
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 дней
      });
    }
    
    return response;
  }
  
  // Проверить наличие cookie с enterprise_id
  const currentEnterpriseId = request.cookies.get('current_enterprise_id')?.value;
  
  if (!currentEnterpriseId) {
    // Нет выбранного enterprise - redirect на admin для выбора
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';
    return NextResponse.redirect(adminUrl);
  }
  
  // Все ОК - пропустить запрос
  return NextResponse.next();
}

/**
 * Проверить доступ пользователя к enterprise через backend API
 */
async function checkEnterpriseAccess(
  token: string,
  enterpriseId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/auth/check-enterprise-access?enterpriseId=${enterpriseId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );
    
    if (!response.ok) {
      console.error('[Workspace Middleware] Access check failed:', response.status);
      return false;
    }
    
    const data = await response.json();
    return data.hasAccess === true;
    
  } catch (error) {
    console.error('[Workspace Middleware] Error checking enterprise access:', error);
    return false;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
```

---

### Вариант 2: Server Component в Layout

**Файл:** `workspace/app/layout.tsx`

```typescript
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oblikflow - Workspace",
  description: "Project workspace",
};

async function checkEnterpriseAccess(
  token: string,
  enterpriseId: string
): Promise<boolean> {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
  
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/auth/check-enterprise-access?enterpriseId=${enterpriseId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.hasAccess === true;
    
  } catch (error) {
    console.error('Error checking enterprise access:', error);
    return false;
  }
}

export default async function RootLayout({
  children,
  searchParams,
}: Readonly<{
  children: React.ReactNode;
  searchParams?: { enterprise_id?: string };
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-auth-token')?.value;
  
  // Проверка авторизации
  if (!token) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    redirect(`${siteUrl}/login`);
  }
  
  // Если есть enterprise_id в URL - проверить доступ
  if (searchParams?.enterprise_id) {
    const hasAccess = await checkEnterpriseAccess(token, searchParams.enterprise_id);
    
    if (!hasAccess) {
      const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';
      redirect(`${adminUrl}?error=no_access`);
    }
    
    // Установить cookie
    cookieStore.set('current_enterprise_id', searchParams.enterprise_id, {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
    });
    
    // Redirect без query параметра
    redirect('/workspace');
  }
  
  // Проверить наличие cookie
  const currentEnterpriseId = cookieStore.get('current_enterprise_id')?.value;
  
  if (!currentEnterpriseId) {
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';
    redirect(adminUrl);
  }
  
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

---

## Backend API Endpoint

Backend должен предоставить endpoint для проверки доступа:

**Endpoint:** `GET /api/auth/check-enterprise-access?enterpriseId={enterpriseId}`

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Response (Success - 200):**
```json
{
  "hasAccess": true,
  "role": "owner", // или "admin"
  "enterprise": {
    "id": "abc-123",
    "name": "Моя компания"
  }
}
```

**Response (No Access - 403):**
```json
{
  "hasAccess": false,
  "message": "You don't have access to this enterprise"
}
```

**Backend Implementation (NestJS):**

```typescript
// auth.controller.ts
@Get('check-enterprise-access')
@UseGuards(JwtAuthGuard)
async checkEnterpriseAccess(
  @Query('enterpriseId') enterpriseId: string,
  @GetUser() user: User,
) {
  if (!enterpriseId) {
    throw new BadRequestException('enterpriseId is required');
  }
  
  // Проверить через таблицу enterprise_members
  const member = await this.prisma.enterpriseMember.findUnique({
    where: {
      enterprise_id_user_id: {
        enterprise_id: enterpriseId,
        user_id: user.id,
      },
    },
    include: {
      enterprise: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  
  if (!member) {
    return {
      hasAccess: false,
      message: "You don't have access to this enterprise",
    };
  }
  
  return {
    hasAccess: true,
    role: member.is_owner ? 'owner' : 'admin',
    enterprise: member.enterprise,
  };
}
```

---

## Обработка ошибок в Admin

Когда workspace redirect обратно на admin с ошибкой, показать toast:

**Файл:** `admin/app/layout.tsx` или `admin/app/page.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export function ErrorHandler() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const message = searchParams.get('message');
  
  useEffect(() => {
    if (error === 'no_access') {
      toast.error(
        message || 'У вас нет доступа к этому предприятию',
        {
          duration: 5000,
        }
      );
      
      // Очистить URL параметры
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [error, message]);
  
  return null;
}
```

---

## Тестирование

### Сценарий 1: Успешный доступ

1. User авторизован в admin
2. User кликает на enterprise в списке
3. Redirect на `workspace.localhost:3002/workspace?enterprise_id=abc-123`
4. Middleware проверяет доступ → OK
5. Cookie устанавливается
6. Redirect на `workspace.localhost:3002/workspace`
7. Workspace загружается

### Сценарий 2: Нет доступа

1. User пытается перейти на enterprise где он не member
2. Redirect на `workspace.localhost:3002/workspace?enterprise_id=xyz-789`
3. Middleware проверяет доступ → FAIL
4. Redirect на `admin.localhost:3001?error=no_access`
5. Toast показывает ошибку

### Сценарий 3: Нет cookie

1. User переходит напрямую на `workspace.localhost:3002/workspace`
2. Нет cookie `current_enterprise_id`
3. Redirect на admin для выбора enterprise

---

## Security Considerations

1. **JWT Token:**
   - Всегда проверяется валидность токена
   - Токен должен быть httpOnly для безопасности

2. **Backend Validation:**
   - Backend ВСЕГДА проверяет доступ при каждом запросе
   - Не доверяем frontend проверкам

3. **Cookie Security:**
   - Production: используем domain cookie (`.oblikflow.com`)
   - HTTPS only в production
   - SameSite=Lax для защиты от CSRF

4. **Rate Limiting:**
   - Backend должен ограничивать частоту запросов к `/check-enterprise-access`

---

## Environment Variables

Необходимые переменные в `.env`:

```bash
# Backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080

# Cross-app URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
NEXT_PUBLIC_WORKSPACE_URL=http://localhost:3002

# Production only
NEXT_PUBLIC_COOKIE_DOMAIN=.oblikflow.com
```

---

## Связанные документы

- [MIDDLEWARE_IMPLEMENTATION_GUIDE.md](/docs/auth/MIDDLEWARE_IMPLEMENTATION_GUIDE.md)
- [04-workspace-context.md](/docs/implementations/auth-etap1/04-workspace-context.md)
- [ARCHITECTURE.md](/docs/auth/ARCHITECTURE.md)

---

## Чеклист реализации

- [ ] Backend endpoint `/api/auth/check-enterprise-access` реализован
- [ ] Middleware в workspace создан
- [ ] Проверка доступа работает
- [ ] Cookie устанавливается после проверки
- [ ] Redirect на admin при отсутствии доступа
- [ ] Toast с ошибкой в admin работает
- [ ] Environment variables настроены
- [ ] Тестирование всех сценариев пройдено
