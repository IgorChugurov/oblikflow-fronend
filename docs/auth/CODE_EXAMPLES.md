# Примеры кода - Этап 1

**Дата:** 14 января 2026  
**Назначение:** Готовые примеры для копирования

---

## Содержание

1. [Supabase Clients](#supabase-clients)
2. [Middleware примеры](#middleware-примеры)
3. [Хуки](#хуки)
4. [Server Actions](#server-actions)
5. [Компоненты авторизации](#компоненты-авторизации)

---

## Supabase Clients

### Browser Client

```typescript
// shared/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Server Client

```typescript
// shared/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component - middleware will handle
          }
        },
      },
    }
  );
}
```

---

## Middleware примеры

### Admin middleware

```typescript
// admin/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL!;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Публичные маршруты
  if (pathname === '/verify-email') {
    return NextResponse.next();
  }
  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  // Не авторизован
  if (!user) {
    return NextResponse.redirect(new URL('/login', SITE_URL));
  }
  
  // Email не подтвержден
  if (!user.email_confirmed_at && pathname !== '/verify-email') {
    return NextResponse.redirect(new URL('/verify-email', ADMIN_URL));
  }
  
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### Workspace middleware

```typescript
// workspace/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL!;

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  // Не авторизован
  if (!user) {
    return NextResponse.redirect(new URL('/login', SITE_URL));
  }
  
  // Проверка enterprise_id в cookie
  const enterpriseId = request.cookies.get('current_enterprise_id')?.value;
  
  if (!enterpriseId) {
    return NextResponse.redirect(new URL('/', ADMIN_URL));
  }
  
  // Проверка доступа к предприятию
  const { data: role } = await supabase.rpc('get_user_enterprise_role', {
    p_user_id: user.id,
    p_enterprise_id: enterpriseId,
  });
  
  if (!role) {
    const redirectResponse = NextResponse.redirect(new URL('/', ADMIN_URL));
    redirectResponse.cookies.delete('current_enterprise_id');
    return redirectResponse;
  }
  
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

## Хуки

### useRole

```typescript
// shared/hooks/useRole.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/AuthProvider';

export function useRole(enterpriseId?: string) {
  const { user } = useAuth();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['role', enterpriseId, user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return {
          isSuperAdmin: false,
          isOwner: false,
          isAdmin: false,
          role: null,
          hasAccess: false,
        };
      }
      
      const supabase = createClient();
      
      // 1. Проверка system admin
      const { data: userData } = await supabase
        .from('users')
        .select('is_system_admin')
        .eq('id', user.id)
        .single();
      
      const isSuperAdmin = userData?.is_system_admin || false;
      
      // Если нет enterpriseId - только глобальная роль
      if (!enterpriseId) {
        return {
          isSuperAdmin,
          isOwner: false,
          isAdmin: false,
          role: null,
          hasAccess: isSuperAdmin,
        };
      }
      
      // 2. Проверка owner
      const { data: enterprise } = await supabase
        .from('enterprises')
        .select('owner_user_id')
        .eq('id', enterpriseId)
        .single();
      
      const isOwner = enterprise?.owner_user_id === user.id;
      
      // 3. Проверка admin
      const { data: membership } = await supabase
        .from('enterprise_memberships')
        .select(`
          role:roles(name)
        `)
        .eq('enterprise_id', enterpriseId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      
      const isAdmin = membership?.role?.name === 'admin';
      
      // На Этапе 1: доступ только у owner/admin
      const hasAccess = isSuperAdmin || isOwner || isAdmin;
      
      return {
        isSuperAdmin,
        isOwner,
        isAdmin,
        role: isOwner ? 'owner' : isAdmin ? 'admin' : null,
        hasAccess,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 минут
  });
  
  return {
    isLoading,
    error: error instanceof Error ? error : null,
    isSuperAdmin: data?.isSuperAdmin || false,
    isOwner: data?.isOwner || false,
    isAdmin: data?.isAdmin || false,
    role: data?.role || null,
    hasAccess: data?.hasAccess || false,
    
    // Производные права
    canManageMembers: data?.isOwner || data?.isAdmin || data?.isSuperAdmin || false,
    canEditSettings: data?.isOwner || data?.isAdmin || data?.isSuperAdmin || false,
    canDelete: data?.isAdmin || false, // owner не может быть удален
  };
}
```

### useEnterprises

```typescript
// shared/hooks/useEnterprises.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/AuthProvider';

interface EnterpriseAccess {
  enterprise_id: string;
  enterprise_name: string;
  role_name: string;
  is_owner: boolean;
  status: string;
}

export function useEnterprises() {
  const { user } = useAuth();
  
  return useQuery<EnterpriseAccess[]>({
    queryKey: ['enterprises', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const supabase = createClient();
      
      // 1. Проверка system admin
      const { data: userData } = await supabase
        .from('users')
        .select('is_system_admin')
        .eq('id', user.id)
        .single();
      
      const isSuperAdmin = userData?.is_system_admin || false;
      
      // 2. Если superAdmin - все предприятия
      if (isSuperAdmin) {
        const { data } = await supabase
          .from('enterprises')
          .select('id, name, status')
          .is('deleted_at', null)
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        
        return (
          data?.map((e) => ({
            enterprise_id: e.id,
            enterprise_name: e.name,
            role_name: 'superAdmin',
            is_owner: false,
            status: e.status,
          })) || []
        );
      }
      
      // 3. Обычный пользователь - только свои
      const { data } = await supabase.rpc('get_user_enterprises', {
        p_user_id: user.id,
      });
      
      return (data as EnterpriseAccess[]) || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
```

---

## Server Actions

### Создание предприятия

```typescript
// admin/app/enterprises/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createEnterprise(formData: {
  name: string;
  country_code: string;
  default_currency: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  // 1. Создать предприятие
  const { data: enterprise, error: enterpriseError } = await supabase
    .from('enterprises')
    .insert({
      name: formData.name,
      owner_user_id: user.id,
      country_code: formData.country_code,
      default_currency: formData.default_currency,
      status: 'active',
    })
    .select()
    .single();
  
  if (enterpriseError) {
    throw new Error(`Failed to create enterprise: ${enterpriseError.message}`);
  }
  
  // 2. Создать роль "admin" для этого предприятия
  const { data: adminRole, error: roleError } = await supabase
    .from('roles')
    .insert({
      enterprise_id: enterprise.id,
      name: 'admin',
      description: 'Enterprise Administrator',
    })
    .select()
    .single();
  
  if (roleError) {
    throw new Error(`Failed to create admin role: ${roleError.message}`);
  }
  
  // 3. Получить все permissions
  const { data: allPermissions } = await supabase
    .from('permissions')
    .select('id');
  
  // 4. Назначить роли "admin" все permissions
  if (allPermissions && allPermissions.length > 0) {
    const { error: permsError } = await supabase.from('role_permissions').insert(
      allPermissions.map((p) => ({
        role_id: adminRole.id,
        permission_id: p.id,
      }))
    );
    
    if (permsError) {
      console.error('Failed to assign permissions:', permsError);
      // Не бросаем ошибку - предприятие уже создано
    }
  }
  
  revalidatePath('/');
  
  return enterprise;
}
```

### Добавление admin в предприятие

```typescript
// admin/app/enterprises/[id]/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addMember(enterpriseId: string, email: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  // 1. Проверить права (только owner/admin)
  const { data: role } = await supabase.rpc('get_user_enterprise_role', {
    p_user_id: user.id,
    p_enterprise_id: enterpriseId,
  });
  
  if (role !== 'owner' && role !== 'admin') {
    throw new Error('Insufficient permissions');
  }
  
  // 2. Найти пользователя по email
  const { data: targetUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();
  
  if (!targetUser) {
    throw new Error('User not found. They need to register first.');
  }
  
  // 3. Проверить что нет дубликата
  const { data: existing } = await supabase
    .from('enterprise_memberships')
    .select('id')
    .eq('enterprise_id', enterpriseId)
    .eq('user_id', targetUser.id)
    .maybeSingle();
  
  if (existing) {
    throw new Error('User is already a member of this enterprise');
  }
  
  // Проверить что это не owner
  const { data: enterprise } = await supabase
    .from('enterprises')
    .select('owner_user_id')
    .eq('id', enterpriseId)
    .single();
  
  if (enterprise?.owner_user_id === targetUser.id) {
    throw new Error('User is already the owner of this enterprise');
  }
  
  // 4. Получить role_id для роли "admin"
  const { data: adminRole } = await supabase
    .from('roles')
    .select('id')
    .eq('enterprise_id', enterpriseId)
    .eq('name', 'admin')
    .single();
  
  if (!adminRole) {
    throw new Error('Admin role not found. Please contact support.');
  }
  
  // 5. Создать membership
  const { error: membershipError } = await supabase
    .from('enterprise_memberships')
    .insert({
      enterprise_id: enterpriseId,
      user_id: targetUser.id,
      role_id: adminRole.id,
      status: 'active',
      created_by: user.id,
    });
  
  if (membershipError) {
    throw new Error(`Failed to add member: ${membershipError.message}`);
  }
  
  revalidatePath(`/enterprises/${enterpriseId}/members`);
  
  return { success: true };
}

export async function removeMember(
  enterpriseId: string,
  userId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  // 1. Проверить права
  const { data: role } = await supabase.rpc('get_user_enterprise_role', {
    p_user_id: user.id,
    p_enterprise_id: enterpriseId,
  });
  
  if (role !== 'owner' && role !== 'admin') {
    throw new Error('Insufficient permissions');
  }
  
  // 2. Проверить что это не owner
  const { data: enterprise } = await supabase
    .from('enterprises')
    .select('owner_user_id')
    .eq('id', enterpriseId)
    .single();
  
  if (enterprise?.owner_user_id === userId) {
    throw new Error('Cannot remove owner from enterprise');
  }
  
  // 3. Удалить membership
  const { error } = await supabase
    .from('enterprise_memberships')
    .delete()
    .eq('enterprise_id', enterpriseId)
    .eq('user_id', userId);
  
  if (error) {
    throw new Error(`Failed to remove member: ${error.message}`);
  }
  
  revalidatePath(`/enterprises/${enterpriseId}/members`);
  
  return { success: true };
}
```

---

## Компоненты авторизации

### AuthProvider

```typescript
// site/components/providers/AuthProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  signup: (data: { email: string; password: string; name: string }) => Promise<void>;
  loginWithOAuth: (provider: 'google' | 'github') => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ 
  children,
  initialUser 
}: { 
  children: React.ReactNode;
  initialUser?: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  
  useEffect(() => {
    // Подписка на изменения auth state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);
  
  const login = async ({ email, password }: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };
  
  const signup = async ({ 
    email, 
    password, 
    name 
  }: { 
    email: string; 
    password: string; 
    name: string;
  }) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });
      
      if (error) throw error;
      
      // Supabase отправляет verification email автоматически
    } finally {
      setIsLoading(false);
    }
  };
  
  const loginWithOAuth = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetPassword = async (email: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (error) throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const logout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      router.push('/login');
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        loginWithOAuth,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

## EnterpriseContext

```typescript
// workspace/contexts/EnterpriseContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Enterprise {
  id: string;
  name: string;
  country_code: string;
  default_currency: string;
}

interface EnterpriseContextType {
  currentEnterprise: Enterprise | null;
  isLoading: boolean;
  switchEnterprise: (enterpriseId: string) => Promise<void>;
}

const EnterpriseContext = createContext<EnterpriseContextType | undefined>(
  undefined
);

export function EnterpriseProvider({ children }: { children: React.ReactNode }) {
  const [currentEnterprise, setCurrentEnterprise] = useState<Enterprise | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  
  useEffect(() => {
    loadCurrentEnterprise();
  }, []);
  
  const loadCurrentEnterprise = async () => {
    setIsLoading(true);
    try {
      // Получить enterpriseId из cookie
      const cookies = document.cookie.split(';');
      const enterpriseCookie = cookies.find((c) =>
        c.trim().startsWith('current_enterprise_id=')
      );
      
      if (!enterpriseCookie) {
        // Нет cookie - редирект на admin
        router.push(process.env.NEXT_PUBLIC_ADMIN_URL!);
        return;
      }
      
      const enterpriseId = enterpriseCookie.split('=')[1]?.trim();
      
      if (!enterpriseId) {
        router.push(process.env.NEXT_PUBLIC_ADMIN_URL!);
        return;
      }
      
      // Загрузить данные предприятия
      const { data: enterprise } = await supabase
        .from('enterprises')
        .select('id, name, country_code, default_currency')
        .eq('id', enterpriseId)
        .single();
      
      if (enterprise) {
        setCurrentEnterprise(enterprise);
      } else {
        // Предприятие не найдено
        router.push(process.env.NEXT_PUBLIC_ADMIN_URL!);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const switchEnterprise = async (enterpriseId: string) => {
    // 1. Установить cookie
    const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '';
    document.cookie = `current_enterprise_id=${enterpriseId}; path=/; domain=${domain}`;
    
    // 2. Перезагрузить страницу для применения middleware
    window.location.href = process.env.NEXT_PUBLIC_WORKSPACE_URL!;
  };
  
  return (
    <EnterpriseContext.Provider
      value={{
        currentEnterprise,
        isLoading,
        switchEnterprise,
      }}
    >
      {children}
    </EnterpriseContext.Provider>
  );
}

export function useEnterpriseContext() {
  const context = useContext(EnterpriseContext);
  if (context === undefined) {
    throw new Error('useEnterpriseContext must be used within EnterpriseProvider');
  }
  return context;
}
```

---

## Связанные документы

- [IMPLEMENTATION_PLAN_ETAP1.md](./IMPLEMENTATION_PLAN_ETAP1.md) - План реализации
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Архитектура
- [ROLES_SYSTEM_ETAP1.md](./ROLES_SYSTEM_ETAP1.md) - Система ролей

---

**Дата:** 14 января 2026  
**Готово к использованию:** ✅ Да
