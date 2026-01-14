# Этап 5: Platform - SuperAdmin

**Цель:** Реализовать проверку прав superAdmin и placeholder страницы

---

## 📋 Задачи

- [ ] 5.1 Middleware с проверкой `is_system_admin`
- [ ] 5.2 Layout
- [ ] 5.3 Placeholder страницы

---

## 5.1 Middleware с проверкой superAdmin

### `platform/middleware.ts`

```typescript
import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)

  // Если пользователь не авторизован
  if (!user) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${siteUrl}/login?redirect=${encodeURIComponent(request.url)}`)
  }

  // Проверка email verification
  if (!user.email_confirmed_at) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${siteUrl}/verify-email`)
  }

  // Проверка is_system_admin через RPC
  const supabase = await createClient()
  const { data: isSuperAdmin, error } = await supabase.rpc('is_system_admin', {
    user_uuid: user.id,
  })

  if (error || !isSuperAdmin) {
    // Не superAdmin - redirect на admin
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001'
    return NextResponse.redirect(adminUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## 5.2 Layout

### `platform/app/layout.tsx`

```typescript
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Platform Admin - OBLIKflow",
  description: "Административная панель для superAdmin",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  )
}
```

---

## 5.3 Placeholder страницы

### 5.3.1 `platform/app/page.tsx`

```typescript
"use client"

import { useUser } from '@/lib/hooks/useUser'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Shield, User, Database, Settings, Users, Building2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function PlatformPage() {
  const { user, isLoading } = useUser()

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-12 w-1/2 mb-4" />
        <Skeleton className="h-6 w-1/3 mb-8" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Platform Admin</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{user?.email}</span>
          </div>
          <Badge variant="destructive">
            <Shield className="mr-1 h-3 w-3" />
            SuperAdmin
          </Badge>
        </div>
      </div>

      {/* Welcome Card */}
      <Card className="mb-8 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Добро пожаловать, SuperAdmin!</CardTitle>
          <CardDescription>
            У вас есть полный доступ ко всем функциям платформы
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Это административная панель для управления всей платформой OBLIKflow.
            Здесь вы можете управлять пользователями, предприятиями и системными настройками.
          </p>
        </CardContent>
      </Card>

      {/* Feature Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Пользователи</CardTitle>
            </div>
            <CardDescription>
              Управление пользователями системы
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Просмотр, создание и управление всеми пользователями платформы
            </p>
            <Button variant="outline" className="w-full" disabled>
              В разработке
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Предприятия</CardTitle>
            </div>
            <CardDescription>
              Управление всеми предприятиями
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Просмотр и управление всеми предприятиями в системе
            </p>
            <Button variant="outline" className="w-full" disabled>
              В разработке
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">База данных</CardTitle>
            </div>
            <CardDescription>
              Мониторинг и управление БД
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Статистика, резервные копии и обслуживание базы данных
            </p>
            <Button variant="outline" className="w-full" disabled>
              В разработке
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Настройки</CardTitle>
            </div>
            <CardDescription>
              Системные настройки платформы
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Конфигурация системы, email, интеграции
            </p>
            <Button variant="outline" className="w-full" disabled>
              В разработке
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Безопасность</CardTitle>
            </div>
            <CardDescription>
              Логи и аудит безопасности
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Мониторинг активности, логи входов, блокировки
            </p>
            <Button variant="outline" className="w-full" disabled>
              В разработке
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Мои предприятия</CardTitle>
            </div>
            <CardDescription>
              Личные предприятия
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Вернуться к управлению своими предприятиями
            </p>
            <Link href={process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001'}>
              <Button variant="outline" className="w-full">
                Перейти в Admin
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Debug Info (только для development) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="mt-8 border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">User ID:</dt>
                <dd className="font-mono">{user?.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Email:</dt>
                <dd className="font-mono">{user?.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Role:</dt>
                <dd className="font-mono text-destructive">SuperAdmin</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Email Verified:</dt>
                <dd className="font-mono">{user?.email_confirmed_at ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

---

## 5.4 Установить базовые shadcn/ui компоненты

```bash
cd platform
npx shadcn@latest init

# Установить компоненты
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add skeleton
npx shadcn@latest add toast
```

---

## ✅ Проверка

После завершения этого этапа:

- [ ] Middleware работает:
  - [ ] Проверка авторизации
  - [ ] Проверка email verification
  - [ ] Проверка `is_system_admin` через RPC
  - [ ] Redirect на `/admin` если не superAdmin
- [ ] Layout настроен
- [ ] Placeholder страница отображает:
  - [ ] Приветствие superAdmin
  - [ ] Badge с ролью
  - [ ] Feature cards (в разработке)
  - [ ] Ссылка на Admin панель
  - [ ] Debug info (development)

---

## 🔍 Тестирование

### Сценарий 1: SuperAdmin пользователь

1. Зайти в Supabase Dashboard → Table Editor → users
2. Найти своего пользователя
3. Установить `is_system_admin = true`
4. Перейти на platform.oblikflow.com
5. Должна отобразиться platform страница
6. Badge должен показать "SuperAdmin"

### Сценарий 2: Обычный пользователь (не superAdmin)

1. Зарегистрироваться как новый пользователь
2. `is_system_admin` по умолчанию = false
3. Попробовать перейти на platform.oblikflow.com
4. Middleware должен redirect на admin.oblikflow.com
5. Должно показать список предприятий (не platform)

### Сценарий 3: Неавторизованный пользователь

1. Выйти из системы
2. Попробовать перейти на platform.oblikflow.com
3. Middleware должен redirect на site.oblikflow.com/login
4. После логина НЕ superAdmin → redirect на admin

---

## 📝 Примечания

### Установка superAdmin через Supabase

Пока нет UI для управления superAdmin'ами, установка вручную через Supabase Dashboard:

```sql
-- Установить пользователя как superAdmin
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"is_system_admin": true}'::jsonb
WHERE email = 'your@email.com';

-- ИЛИ если используется таблица users
UPDATE public.users
SET is_system_admin = true
WHERE email = 'your@email.com';
```

### Будущие фичи (Этап 2)

- Список всех пользователей с фильтрацией
- Список всех предприятий
- Статистика платформы (количество пользователей, предприятий)
- Логи активности
- Системные настройки (email, OAuth providers)
- Управление subscriptions и биллингом
- Audit log

---

## 📖 Связанные документы

- [ROLES_SYSTEM_ETAP1.md](/docs/auth/ROLES_SYSTEM_ETAP1.md) - роль superAdmin
- [PERMISSIONS_ETAP1.md](/docs/auth/PERMISSIONS_ETAP1.md) - права superAdmin
- [ETAP2_OVERVIEW.md](/docs/auth/ETAP2_OVERVIEW.md) - планы на следующий этап

---

**Готово! Переходи к [Этапу 6: Тестирование и полировка](./06-testing-checklist.md)** →
