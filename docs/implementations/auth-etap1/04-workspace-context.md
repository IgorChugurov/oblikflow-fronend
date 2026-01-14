# Этап 4: Workspace - Контекст предприятия

**Цель:** Реализовать автовыбор предприятия и контекст для работы

---

## 📋 Задачи

- [ ] 4.1 Middleware с автовыбором
- [ ] 4.2 EnterpriseProvider (React Context)
- [ ] 4.3 Layout
- [ ] 4.4 Placeholder страницы

---

## 4.1 Middleware с автовыбором

### `workspace/middleware.ts`

```typescript
import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getCurrentEnterpriseId(request: NextRequest): Promise<string | null> {
  // Production: cookie
  if (process.env.NODE_ENV === 'production') {
    return request.cookies.get('current_enterprise_id')?.value || null
  }

  // Development: localStorage не доступен в middleware
  // Проверяем через header (будет установлен в EnterpriseProvider)
  return request.cookies.get('dev_current_enterprise_id')?.value || null
}

async function selectBestEnterprise(userId: string) {
  const supabase = await createClient()

  // Получить список предприятий через RPC
  const { data: enterprises, error } = await supabase.rpc('get_user_enterprises', {
    p_user_id: userId,
  })

  if (error || !enterprises || enterprises.length === 0) {
    return null
  }

  // Если 1 предприятие - выбрать его
  if (enterprises.length === 1) {
    return enterprises[0].id
  }

  // Логика выбора: owner > admin > first
  const owner = enterprises.find((e) => e.is_owner)
  if (owner) {
    return owner.id
  }

  const admin = enterprises.find((e) => e.role === 'admin')
  if (admin) {
    return admin.id
  }

  // Первое в списке
  return enterprises[0].id
}

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

  // Проверить наличие выбранного предприятия
  const currentEnterpriseId = await getCurrentEnterpriseId(request)

  if (!currentEnterpriseId) {
    // Автовыбор предприятия
    const selectedEnterpriseId = await selectBestEnterprise(user.id)

    if (!selectedEnterpriseId) {
      // Нет предприятий - redirect на admin для создания
      const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001'
      return NextResponse.redirect(adminUrl)
    }

    // Установить cookie
    const newResponse = NextResponse.next()
    
    if (process.env.NODE_ENV === 'production') {
      const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.oblikflow.com'
      newResponse.cookies.set('current_enterprise_id', selectedEnterpriseId, {
        domain: cookieDomain,
        httpOnly: false,
        secure: true,
        sameSite: 'lax',
        path: '/',
      })
    } else {
      // Development: используем обычный cookie (без domain)
      newResponse.cookies.set('dev_current_enterprise_id', selectedEnterpriseId, {
        httpOnly: false,
        path: '/',
      })
    }

    return newResponse
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

## 4.2 EnterpriseProvider

### Структура

```
workspace/
├── components/
│   └── EnterpriseProvider.tsx
├── lib/
│   └── hooks/
│       └── useEnterprise.ts
```

### 4.2.1 `workspace/components/EnterpriseProvider.tsx`

```typescript
"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { useUser } from '@/lib/hooks/useUser'

interface Enterprise {
  id: string
  name: string
  owner_user_id: string
  created_at: string
  updated_at: string
}

interface EnterpriseContextType {
  enterprise: Enterprise | null
  isLoading: boolean
  error: Error | null
  setEnterpriseId: (id: string) => void
  refetch: () => void
}

const EnterpriseContext = createContext<EnterpriseContextType | undefined>(undefined)

export function useEnterprise() {
  const context = useContext(EnterpriseContext)
  if (!context) {
    throw new Error('useEnterprise must be used within EnterpriseProvider')
  }
  return context
}

function getCurrentEnterpriseId(): string | null {
  if (typeof window === 'undefined') return null

  // Production: cookie
  if (process.env.NODE_ENV === 'production') {
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('current_enterprise_id='))
    return cookie ? cookie.split('=')[1] : null
  }

  // Development: localStorage
  return localStorage.getItem('current_enterprise_id')
}

function setCurrentEnterpriseId(id: string) {
  if (typeof window === 'undefined') return

  if (process.env.NODE_ENV === 'production') {
    const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.oblikflow.com'
    document.cookie = `current_enterprise_id=${id}; domain=${cookieDomain}; path=/; SameSite=Lax`
  } else {
    localStorage.setItem('current_enterprise_id', id)
    // Также установим cookie для middleware
    document.cookie = `dev_current_enterprise_id=${id}; path=/;`
  }
}

interface EnterpriseProviderProps {
  children: React.ReactNode
}

export function EnterpriseProvider({ children }: EnterpriseProviderProps) {
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useUser()

  const fetchEnterprise = async (enterpriseId: string) => {
    try {
      setIsLoading(true)
      const data = await apiClient.get<Enterprise>(`/api/enterprises/${enterpriseId}`)
      setEnterprise(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch enterprise'))
      setEnterprise(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!user) {
      setEnterprise(null)
      setIsLoading(false)
      return
    }

    const enterpriseId = getCurrentEnterpriseId()
    if (enterpriseId) {
      fetchEnterprise(enterpriseId)
    } else {
      setIsLoading(false)
    }
  }, [user])

  const setEnterpriseId = (id: string) => {
    setCurrentEnterpriseId(id)
    fetchEnterprise(id)
  }

  const refetch = () => {
    const enterpriseId = getCurrentEnterpriseId()
    if (enterpriseId) {
      fetchEnterprise(enterpriseId)
    }
  }

  return (
    <EnterpriseContext.Provider
      value={{
        enterprise,
        isLoading,
        error,
        setEnterpriseId,
        refetch,
      }}
    >
      {children}
    </EnterpriseContext.Provider>
  )
}
```

---

## 4.3 Layout

### `workspace/app/layout.tsx`

```typescript
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { EnterpriseProvider } from "@/components/EnterpriseProvider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Workspace - OBLIKflow",
  description: "Рабочее пространство предприятия",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <EnterpriseProvider>
          {children}
        </EnterpriseProvider>
        <Toaster />
      </body>
    </html>
  )
}
```

---

## 4.4 Placeholder страницы

### 4.4.1 `workspace/app/page.tsx`

```typescript
"use client"

import { useEnterprise } from '@/components/EnterpriseProvider'
import { useRole } from '@/lib/hooks/useRole'
import { useUser } from '@/lib/hooks/useUser'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, Crown, Shield, User } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function WorkspacePage() {
  const { user } = useUser()
  const { enterprise, isLoading: isEnterpriseLoading } = useEnterprise()
  const { role, isLoading: isRoleLoading } = useRole(enterprise?.id || null)

  if (isEnterpriseLoading || isRoleLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-12 w-1/2 mb-4" />
        <Skeleton className="h-6 w-1/3 mb-8" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!enterprise) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">Предприятие не выбрано</p>
              <p className="text-sm text-muted-foreground">
                Выберите предприятие в панели управления
              </p>
            </div>
            <Link href={process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001'}>
              <Button>Перейти к списку предприятий</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">{enterprise.name}</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{user?.email}</span>
          </div>
          <Badge variant={role === 'owner' ? 'default' : 'secondary'}>
            {role === 'owner' ? (
              <>
                <Crown className="mr-1 h-3 w-3" />
                Owner
              </>
            ) : (
              <>
                <Shield className="mr-1 h-3 w-3" />
                Admin
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Добро пожаловать!</CardTitle>
            <CardDescription>
              Рабочее пространство предприятия
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Это placeholder страница. Здесь будет основной функционал приложения.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ваша роль</CardTitle>
            <CardDescription>
              Уровень доступа в предприятии
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {role === 'owner' ? (
                <>
                  <Crown className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium">Владелец</span>
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Администратор</span>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {role === 'owner' 
                ? 'Полный доступ ко всем функциям' 
                : 'Доступ к основным функциям предприятия'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Управление</CardTitle>
            <CardDescription>
              Настройки и администрирование
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001'}>
              <Button variant="outline" className="w-full">
                Перейти в Admin панель
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
                <dt className="text-muted-foreground">Enterprise ID:</dt>
                <dd className="font-mono">{enterprise.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">User ID:</dt>
                <dd className="font-mono">{user?.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Role:</dt>
                <dd className="font-mono">{role}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Owner:</dt>
                <dd className="font-mono">{enterprise.owner_user_id}</dd>
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

## 4.5 Enterprise Switcher (опционально)

Компонент для переключения между предприятиями:

### `workspace/components/EnterpriseSwitcher.tsx`

```typescript
"use client"

import { useState } from 'react'
import { useEnterprise } from './EnterpriseProvider'
import { useEnterprises } from '@/lib/hooks/useEnterprises'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Building2, Check, ChevronsUpDown } from 'lucide-react'

export function EnterpriseSwitcher() {
  const { enterprise, setEnterpriseId } = useEnterprise()
  const { enterprises, isLoading } = useEnterprises()

  if (isLoading || !enterprise) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="truncate">{enterprise.name}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Переключить предприятие</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {enterprises.map((ent) => (
          <DropdownMenuItem
            key={ent.id}
            onClick={() => setEnterpriseId(ent.id)}
          >
            <Check
              className={`mr-2 h-4 w-4 ${
                enterprise.id === ent.id ? 'opacity-100' : 'opacity-0'
              }`}
            />
            <span className="truncate">{ent.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

Добавить в layout или page где нужно переключение.

---

## ✅ Проверка

После завершения этого этапа:

- [ ] Middleware работает:
  - [ ] Проверка авторизации
  - [ ] Проверка email verification
  - [ ] Автовыбор предприятия если нет cookie
  - [ ] Логика выбора: owner > admin > first
  - [ ] Redirect на `/admin` если нет предприятий
  - [ ] Cookie устанавливается правильно (production/development)
- [ ] EnterpriseProvider работает:
  - [ ] Загрузка предприятия по ID из cookie/localStorage
  - [ ] `useEnterprise()` hook доступен
  - [ ] `setEnterpriseId()` работает
  - [ ] `refetch()` обновляет данные
- [ ] Layout обернут в EnterpriseProvider
- [ ] Placeholder страница отображает:
  - [ ] Название предприятия
  - [ ] Роль пользователя
  - [ ] Информационные карточки
  - [ ] Debug info (development)
- [ ] EnterpriseSwitcher (опционально) работает

---

## 🔍 Тестирование автовыбора

### Сценарий 1: Пользователь с 1 предприятием

1. Зарегистрироваться → создать 1 предприятие в `/admin`
2. Перейти на workspace.oblikflow.com
3. Middleware должен автоматически выбрать это предприятие
4. Cookie/localStorage должен быть установлен
5. Страница должна отобразить предприятие

### Сценарий 2: Пользователь с несколькими предприятиями

1. Создать 3 предприятия:
   - Enterprise A (owner)
   - Enterprise B (admin)
   - Enterprise C (admin)
2. Перейти на workspace.oblikflow.com
3. Middleware должен выбрать Enterprise A (owner приоритетнее)
4. Проверить что выбрано именно Enterprise A

### Сценарий 3: Пользователь без предприятий

1. Зарегистрироваться но НЕ создавать предприятия
2. Перейти на workspace.oblikflow.com
3. Middleware должен redirect на `/admin`
4. Должно показать экран создания предприятия

### Сценарий 4: Переключение предприятий

1. Использовать EnterpriseSwitcher
2. Выбрать другое предприятие
3. Cookie/localStorage должен обновиться
4. Страница должна перезагрузить данные

---

## 📖 Связанные документы

- [ARCHITECTURE.md](/docs/auth/ARCHITECTURE.md) - автовыбор предприятия
- [REAL_SANDBOX_CONTEXTS.md](/docs/architecture/REAL_SANDBOX_CONTEXTS.md) - мультитенантность

---

**Готово! Переходи к [Этапу 5: Platform - SuperAdmin](./05-platform-superadmin.md)** →
