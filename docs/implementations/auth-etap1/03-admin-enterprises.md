# Этап 3: Admin - Управление предприятиями

**Цель:** Реализовать список предприятий, создание, настройки и управление админами

---

## 📋 Задачи

- [ ] 3.1 Middleware для admin
- [ ] 3.2 React hooks (shared/lib/hooks/)
- [ ] 3.3 Страницы (admin/app/)
- [ ] 3.4 Компоненты
- [ ] 3.5 API интеграция

---

## 3.1 Middleware для admin

### `admin/middleware.ts`

```typescript
import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)

  // Если пользователь не авторизован
  if (!user) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const redirectUrl = `${siteUrl}/login?redirect=${encodeURIComponent(request.url)}`
    return NextResponse.redirect(redirectUrl)
  }

  // Проверка email verification
  if (!user.email_confirmed_at) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${siteUrl}/verify-email`)
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

## 3.2 React hooks

### Структура

```
shared/
├── lib/
│   └── hooks/
│       ├── useUser.ts
│       ├── useEnterprises.ts
│       └── useRole.ts
```

### 3.2.1 `shared/lib/hooks/useUser.ts`

```typescript
"use client"

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Получить текущего пользователя
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setIsLoading(false)
    }

    getUser()

    // Слушать изменения auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return { user, isLoading }
}
```

### 3.2.2 `shared/lib/hooks/useEnterprises.ts`

```typescript
"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { apiClient } from '@/lib/api/client'
import { useUser } from './useUser'

interface EnterpriseWithRole {
  id: string
  name: string
  role: 'owner' | 'admin'
  is_owner: boolean
  created_at: string
}

export function useEnterprises() {
  const [enterprises, setEnterprises] = useState<EnterpriseWithRole[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useUser()
  const supabase = createClient()

  useEffect(() => {
    if (!user) {
      setEnterprises([])
      setIsLoading(false)
      return
    }

    const fetchEnterprises = async () => {
      try {
        setIsLoading(true)
        
        // Используем RPC function для получения списка
        const { data, error: rpcError } = await supabase.rpc('get_user_enterprises', {
          p_user_id: user.id,
        })

        if (rpcError) throw rpcError

        setEnterprises(data || [])
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch enterprises'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchEnterprises()
  }, [user, supabase])

  const refetch = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const { data, error: rpcError } = await supabase.rpc('get_user_enterprises', {
        p_user_id: user.id,
      })

      if (rpcError) throw rpcError

      setEnterprises(data || [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch enterprises'))
    } finally {
      setIsLoading(false)
    }
  }

  return { enterprises, isLoading, error, refetch }
}
```

### 3.2.3 `shared/lib/hooks/useRole.ts`

```typescript
"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './useUser'

type Role = 'owner' | 'admin' | null

export function useRole(enterpriseId: string | null) {
  const [role, setRole] = useState<Role>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const { user } = useUser()
  const supabase = createClient()

  useEffect(() => {
    if (!user) {
      setRole(null)
      setIsSuperAdmin(false)
      setIsLoading(false)
      return
    }

    const fetchRole = async () => {
      try {
        setIsLoading(true)

        // Проверка superAdmin
        const { data: superAdminData } = await supabase.rpc('is_system_admin', {
          user_uuid: user.id,
        })
        setIsSuperAdmin(!!superAdminData)

        // Проверка роли в предприятии
        if (enterpriseId) {
          const { data: roleData } = await supabase.rpc('get_user_enterprise_role', {
            p_user_id: user.id,
            p_enterprise_id: enterpriseId,
          })
          setRole(roleData)
        }
      } catch (err) {
        console.error('Failed to fetch role:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRole()
  }, [user, enterpriseId, supabase])

  return { role, isSuperAdmin, isLoading }
}
```

---

## 3.3 Страницы

### 3.3.1 `admin/app/page.tsx` - Список предприятий

```typescript
import { EnterpriseList } from '@/components/EnterpriseList'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function AdminDashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Мои предприятия</h1>
          <p className="text-muted-foreground mt-1">
            Управление вашими предприятиями
          </p>
        </div>
        <Link href="/enterprises/new">
          <Button>Создать предприятие</Button>
        </Link>
      </div>

      <EnterpriseList />
    </div>
  )
}
```

### 3.3.2 `admin/app/enterprises/new/page.tsx` - Создание

```typescript
import { CreateEnterpriseForm } from '@/components/CreateEnterpriseForm'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewEnterprisePage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к списку
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Создать предприятие</h1>
        <p className="text-muted-foreground mt-1">
          Добавьте новое предприятие для управления
        </p>
      </div>

      <CreateEnterpriseForm />
    </div>
  )
}
```

### 3.3.3 `admin/app/enterprises/[id]/settings/page.tsx` - Настройки

```typescript
import { EnterpriseSettings } from '@/components/EnterpriseSettings'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function EnterpriseSettingsPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к списку
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Настройки предприятия</h1>
        <p className="text-muted-foreground mt-1">
          Управление настройками предприятия
        </p>
      </div>

      <EnterpriseSettings enterpriseId={params.id} />
    </div>
  )
}
```

### 3.3.4 `admin/app/enterprises/[id]/members/page.tsx` - Управление админами

```typescript
import { MembersList } from '@/components/MembersList'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function EnterpriseMembersPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к списку
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Управление доступом</h1>
        <p className="text-muted-foreground mt-1">
          Добавьте или удалите администраторов предприятия
        </p>
      </div>

      <MembersList enterpriseId={params.id} />
    </div>
  )
}
```

---

## 3.4 Компоненты

### 3.4.1 `admin/components/EnterpriseList.tsx`

```typescript
"use client"

import { useEnterprises } from '@/lib/hooks/useEnterprises'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { Building2, Crown, Shield, Settings, Users } from 'lucide-react'

export function EnterpriseList() {
  const { enterprises, isLoading, error } = useEnterprises()

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Ошибка загрузки предприятий: {error.message}</p>
        </CardContent>
      </Card>
    )
  }

  if (enterprises.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">Нет предприятий</p>
            <p className="text-sm text-muted-foreground">
              Создайте первое предприятие для начала работы
            </p>
          </div>
          <Link href="/enterprises/new">
            <Button>Создать предприятие</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {enterprises.map((enterprise) => (
        <Card key={enterprise.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle>{enterprise.name}</CardTitle>
              </div>
              <Badge variant={enterprise.is_owner ? 'default' : 'secondary'}>
                {enterprise.is_owner ? (
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
            <CardDescription>
              Создано: {new Date(enterprise.created_at).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex gap-2">
            <Link href={`/enterprises/${enterprise.id}/settings`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                <Settings className="mr-2 h-4 w-4" />
                Настройки
              </Button>
            </Link>
            {enterprise.is_owner && (
              <Link href={`/enterprises/${enterprise.id}/members`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  <Users className="mr-2 h-4 w-4" />
                  Админы
                </Button>
              </Link>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
```

### 3.4.2 `admin/components/CreateEnterpriseForm.tsx`

```typescript
"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { apiClient } from '@/lib/api/client'

const createEnterpriseSchema = z.object({
  name: z.string().min(2, 'Название должно быть минимум 2 символа'),
})

type CreateEnterpriseFormData = z.infer<typeof createEnterpriseSchema>

export function CreateEnterpriseForm() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateEnterpriseFormData>({
    resolver: zodResolver(createEnterpriseSchema),
  })

  const onSubmit = async (data: CreateEnterpriseFormData) => {
    setIsLoading(true)
    try {
      await apiClient.post('/api/enterprises', data)

      toast({
        title: 'Предприятие создано',
        description: `${data.name} успешно добавлено`,
      })

      router.push('/')
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать предприятие',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Основная информация</CardTitle>
        <CardDescription>
          Введите название нового предприятия
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название предприятия</Label>
            <Input
              id="name"
              placeholder="ООО Рога и Копыта"
              {...register('name')}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Создание...' : 'Создать предприятие'}
        </Button>
      </CardFooter>
    </Card>
  )
}
```

### 3.4.3 `admin/components/EnterpriseSettings.tsx`

```typescript
"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { apiClient } from '@/lib/api/client'
import { useRole } from '@/lib/hooks/useRole'

const updateEnterpriseSchema = z.object({
  name: z.string().min(2, 'Название должно быть минимум 2 символа'),
})

type UpdateEnterpriseFormData = z.infer<typeof updateEnterpriseSchema>

interface EnterpriseSettingsProps {
  enterpriseId: string
}

export function EnterpriseSettings({ enterpriseId }: EnterpriseSettingsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const { toast } = useToast()
  const { role } = useRole(enterpriseId)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UpdateEnterpriseFormData>({
    resolver: zodResolver(updateEnterpriseSchema),
  })

  useEffect(() => {
    const fetchEnterprise = async () => {
      try {
        setIsFetching(true)
        const data = await apiClient.get(`/api/enterprises/${enterpriseId}`)
        setValue('name', data.name)
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: 'Не удалось загрузить данные предприятия',
        })
      } finally {
        setIsFetching(false)
      }
    }

    fetchEnterprise()
  }, [enterpriseId, setValue, toast])

  const onSubmit = async (data: UpdateEnterpriseFormData) => {
    setIsLoading(true)
    try {
      await apiClient.patch(`/api/enterprises/${enterpriseId}`, data)

      toast({
        title: 'Настройки сохранены',
        description: 'Изменения успешно применены',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось сохранить настройки',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  const canEdit = role === 'owner'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Основные настройки</CardTitle>
        <CardDescription>
          {canEdit ? 'Обновите информацию о предприятии' : 'Только владелец может изменять настройки'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название предприятия</Label>
            <Input
              id="name"
              {...register('name')}
              aria-invalid={!!errors.name}
              disabled={!canEdit}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading || !canEdit}
          className="w-full"
        >
          {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
        </Button>
      </CardFooter>
    </Card>
  )
}
```

### 3.4.4 `admin/components/MembersList.tsx`

```typescript
"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { apiClient } from '@/lib/api/client'
import { useRole } from '@/lib/hooks/useRole'
import { AddMemberForm } from './AddMemberForm'
import { Crown, Shield, Trash2, UserPlus } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Member {
  user_id: string
  email: string
  role: 'owner' | 'admin'
  is_owner: boolean
  created_at: string
}

interface MembersListProps {
  enterpriseId: string
}

export function MembersList({ enterpriseId }: MembersListProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null)
  const { toast } = useToast()
  const { role } = useRole(enterpriseId)

  const fetchMembers = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.get(`/api/enterprises/${enterpriseId}/members`)
      setMembers(data)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось загрузить список членов',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [enterpriseId])

  const handleDelete = async (userId: string) => {
    try {
      await apiClient.delete(`/api/enterprises/${enterpriseId}/members/${userId}`)

      toast({
        title: 'Администратор удален',
        description: 'Доступ отозван',
      })

      setMemberToDelete(null)
      fetchMembers()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось удалить администратора',
      })
    }
  }

  const handleAddSuccess = () => {
    setShowAddForm(false)
    fetchMembers()
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-6 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const canManageMembers = role === 'owner'

  return (
    <div className="space-y-6">
      {canManageMembers && !showAddForm && (
        <Card>
          <CardContent className="pt-6">
            <Button onClick={() => setShowAddForm(true)} className="w-full">
              <UserPlus className="mr-2 h-4 w-4" />
              Добавить администратора
            </Button>
          </CardContent>
        </Card>
      )}

      {showAddForm && (
        <AddMemberForm
          enterpriseId={enterpriseId}
          onSuccess={handleAddSuccess}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Члены предприятия ({members.length})</CardTitle>
          <CardDescription>
            Владелец и администраторы с доступом к предприятию
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div>
                    {member.is_owner ? (
                      <Crown className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <Shield className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{member.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Добавлен: {new Date(member.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={member.is_owner ? 'default' : 'secondary'}>
                    {member.is_owner ? 'Owner' : 'Admin'}
                  </Badge>
                  {canManageMembers && !member.is_owner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMemberToDelete(member)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={!!memberToDelete} onOpenChange={() => setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить администратора?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить {memberToDelete?.email}? Пользователь потеряет доступ к предприятию.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToDelete && handleDelete(memberToDelete.user_id)}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

### 3.4.5 `admin/components/AddMemberForm.tsx`

```typescript
"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { apiClient } from '@/lib/api/client'

const addMemberSchema = z.object({
  email: z.string().email('Введите корректный email'),
})

type AddMemberFormData = z.infer<typeof addMemberSchema>

interface AddMemberFormProps {
  enterpriseId: string
  onSuccess: () => void
  onCancel: () => void
}

export function AddMemberForm({ enterpriseId, onSuccess, onCancel }: AddMemberFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddMemberFormData>({
    resolver: zodResolver(addMemberSchema),
  })

  const onSubmit = async (data: AddMemberFormData) => {
    setIsLoading(true)
    try {
      await apiClient.post(`/api/enterprises/${enterpriseId}/members`, {
        email: data.email,
        role: 'admin',
      })

      toast({
        title: 'Администратор добавлен',
        description: `${data.email} теперь имеет доступ к предприятию`,
      })

      onSuccess()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось добавить администратора',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Добавить администратора</CardTitle>
        <CardDescription>
          Введите email пользователя для предоставления доступа
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              {...register('email')}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Пользователь должен быть зарегистрирован в системе
            </p>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Отмена
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? 'Добавление...' : 'Добавить'}
        </Button>
      </CardFooter>
    </Card>
  )
}
```

---

## 3.5 API интеграция

### Установить дополнительные shadcn/ui компоненты

```bash
cd admin
npx shadcn@latest add badge
npx shadcn@latest add skeleton
npx shadcn@latest add alert-dialog
```

---

## ✅ Проверка

После завершения этого этапа:

- [ ] Middleware работает (проверка авторизации и email verification)
- [ ] React hooks созданы и работают:
  - [ ] `useUser` - получение текущего пользователя
  - [ ] `useEnterprises` - список предприятий
  - [ ] `useRole` - роль в предприятии
- [ ] Страницы созданы:
  - [ ] `/` - список предприятий
  - [ ] `/enterprises/new` - создание
  - [ ] `/enterprises/[id]/settings` - настройки
  - [ ] `/enterprises/[id]/members` - управление админами
- [ ] Компоненты работают:
  - [ ] `EnterpriseList` - отображает список с ролями
  - [ ] `CreateEnterpriseForm` - создание через API
  - [ ] `EnterpriseSettings` - обновление через API
  - [ ] `MembersList` - список с возможностью удаления
  - [ ] `AddMemberForm` - добавление админов
- [ ] API интеграция:
  - [ ] GET /api/enterprises - работает
  - [ ] POST /api/enterprises - создание
  - [ ] PATCH /api/enterprises/:id - обновление
  - [ ] GET /api/enterprises/:id/members - список членов
  - [ ] POST /api/enterprises/:id/members - добавление админа
  - [ ] DELETE /api/enterprises/:id/members/:userId - удаление

---

## 📖 Связанные документы

- [API_CONTRACT.md](/docs/auth/API_CONTRACT.md) - контракт с бэкендом
- [ROLES_SYSTEM_ETAP1.md](/docs/auth/ROLES_SYSTEM_ETAP1.md) - система ролей

---

**Готово! Переходи к [Этапу 4: Workspace - Контекст предприятия](./04-workspace-context.md)** →
