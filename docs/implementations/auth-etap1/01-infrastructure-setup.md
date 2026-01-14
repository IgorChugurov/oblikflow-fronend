# Этап 1: Инфраструктура и Shared пакет

**Цель:** Подготовить общие инструменты для всех приложений

---

## 📋 Задачи

- [ ] 1.1 Настройка Supabase
- [ ] 1.2 Supabase клиенты (shared/lib/supabase/)
- [ ] 1.3 API клиент для NestJS (shared/lib/api/)
- [ ] 1.4 TypeScript типы (shared/types/)
- [ ] 1.5 Environment variables

---

## 1.1 Настройка Supabase

### Создать проект в Supabase Dashboard

1. Перейти на https://supabase.com/dashboard
2. Создать новый проект "oblikflow"
3. Сохранить credentials:
   - Project URL: `https://your-project.supabase.co`
   - Anon/Public Key: `eyJhbGc...`

### Настроить Email Authentication

**Настройки → Authentication → Providers → Email:**

- ✅ Enable Email Provider
- ✅ Confirm email: **Enabled** (включить email verification)
- ✅ Secure email change: Enabled
- Email templates: настроить ниже ⬇️

### Настроить Email Templates

**Настройки → Authentication → Email Templates:**

#### Confirm signup (Email Verification)

```html
<h2>Подтверждение email</h2>
<p>Для завершения регистрации подтвердите ваш email:</p>
<p><a href="{{ .ConfirmationURL }}">Подтвердить email</a></p>
```

**Redirect URL:**
```
https://site.oblikflow.com/verify-email?confirmed=true
```

Для development:
```
http://localhost:3000/verify-email?confirmed=true
```

#### Reset password

```html
<h2>Сброс пароля</h2>
<p>Вы запросили сброс пароля. Нажмите на ссылку ниже:</p>
<p><a href="{{ .ConfirmationURL }}">Сбросить пароль</a></p>
<p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
```

**Redirect URL:**
```
https://site.oblikflow.com/reset-password/confirm
```

Для development:
```
http://localhost:3000/reset-password/confirm
```

### Настроить Google OAuth

**Настройки → Authentication → Providers → Google:**

1. Создать OAuth credentials в Google Cloud Console:
   - https://console.cloud.google.com/apis/credentials
   - Создать проект "OBLIKflow"
   - OAuth consent screen → External
   - Создать OAuth 2.0 Client ID (Web application)

2. **Authorized redirect URIs:**
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```

3. Скопировать Client ID и Client Secret в Supabase:
   - Client ID: `xxx.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-xxx`

4. ✅ Enable Google Provider в Supabase

### Настроить Site URL

**Настройки → Authentication → URL Configuration:**

- **Site URL:** `https://site.oblikflow.com` (production)
- **Site URL:** `http://localhost:3000` (development)

### Настроить Redirect URLs

**Настройки → Authentication → Redirect URLs:**

Добавить allowed URLs для всех поддоменов:

**Production:**
```
https://site.oblikflow.com/**
https://admin.oblikflow.com/**
https://workspace.oblikflow.com/**
https://platform.oblikflow.com/**
```

**Development:**
```
http://localhost:3000/**
http://localhost:3001/**
http://localhost:3002/**
http://localhost:3003/**
```

---

## 1.2 Supabase клиенты

### Структура

```
shared/
├── lib/
│   └── supabase/
│       ├── client.ts        # Браузерный клиент
│       ├── server.ts        # Серверный клиент
│       ├── middleware.ts    # Middleware хелперы
│       └── types.ts         # TypeScript типы (генерируются)
```

### 1.2.1 `shared/lib/supabase/client.ts`

```typescript
/**
 * Supabase клиент для Client Components
 * Используется в компонентах с 'use client'
 */

import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 1.2.2 `shared/lib/supabase/server.ts`

```typescript
/**
 * Supabase клиент для Server Components
 * Автоматически обрабатывает cookies
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore errors from Server Components
            // Middleware will handle session refresh
          }
        },
      },
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
      },
    }
  )
}
```

### 1.2.3 `shared/lib/supabase/middleware.ts`

```typescript
/**
 * Supabase клиент для Middleware
 * Обновляет токены автоматически
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Важно! Этот вызов обновляет токен если истек
  const { data: { user } } = await supabase.auth.getUser()

  return { response, user }
}
```

### 1.2.4 `shared/lib/supabase/types.ts`

Этот файл будет сгенерирован из Supabase схемы. Пока создадим базовую структуру:

```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          is_system_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          is_system_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          is_system_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      enterprises: {
        Row: {
          id: string
          name: string
          owner_user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      enterprise_memberships: {
        Row: {
          id: string
          enterprise_id: string
          user_id: string
          role: 'owner' | 'admin'
          created_at: string
        }
        Insert: {
          id?: string
          enterprise_id: string
          user_id: string
          role: 'owner' | 'admin'
          created_at?: string
        }
        Update: {
          id?: string
          enterprise_id?: string
          user_id?: string
          role?: 'owner' | 'admin'
          created_at?: string
        }
      }
    }
    Functions: {
      is_system_admin: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      get_user_enterprise_role: {
        Args: { p_user_id: string; p_enterprise_id: string }
        Returns: 'owner' | 'admin' | null
      }
      get_user_enterprises: {
        Args: { p_user_id: string }
        Returns: Array<{
          id: string
          name: string
          role: 'owner' | 'admin'
          is_owner: boolean
        }>
      }
    }
  }
}
```

### Установить зависимости

```bash
cd shared
pnpm add @supabase/ssr @supabase/supabase-js
```

---

## 1.3 API клиент для NestJS

### Структура

```
shared/
├── lib/
│   └── api/
│       ├── client.ts        # Fetch wrapper
│       └── types.ts         # API типы
```

### 1.3.1 `shared/lib/api/client.ts`

```typescript
/**
 * API клиент для запросов к NestJS Backend
 * Автоматически добавляет JWT и X-Enterprise-ID headers
 */

import { createClient as createSupabaseClient } from '../supabase/client'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl
  }

  /**
   * Получить JWT токен из Supabase
   */
  private async getToken(): Promise<string | null> {
    const supabase = createSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  /**
   * Получить текущий Enterprise ID из cookie/localStorage
   */
  private getCurrentEnterpriseId(): string | null {
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

  /**
   * Выполнить API запрос
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    includeEnterpriseId: boolean = false
  ): Promise<T> {
    const token = await this.getToken()
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    // Добавить JWT токен
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Добавить Enterprise ID (опционально)
    if (includeEnterpriseId) {
      const enterpriseId = this.getCurrentEnterpriseId()
      if (enterpriseId) {
        headers['X-Enterprise-ID'] = enterpriseId
      }
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(error.message || `API Error: ${response.status}`)
    }

    return response.json()
  }

  // Convenience methods
  async get<T>(endpoint: string, includeEnterpriseId = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, includeEnterpriseId)
  }

  async post<T>(endpoint: string, data?: unknown, includeEnterpriseId = false): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      includeEnterpriseId
    )
  }

  async patch<T>(endpoint: string, data?: unknown, includeEnterpriseId = false): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
      },
      includeEnterpriseId
    )
  }

  async delete<T>(endpoint: string, includeEnterpriseId = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, includeEnterpriseId)
  }
}

// Singleton instance
export const apiClient = new ApiClient()
```

### 1.3.2 `shared/lib/api/types.ts`

```typescript
/**
 * API Request/Response типы
 */

// Enterprise types
export interface Enterprise {
  id: string
  name: string
  owner_user_id: string
  created_at: string
  updated_at: string
}

export interface CreateEnterpriseRequest {
  name: string
}

export interface UpdateEnterpriseRequest {
  name?: string
}

// Member types
export interface Member {
  user_id: string
  email: string
  role: 'owner' | 'admin'
  is_owner: boolean
  created_at: string
}

export interface AddMemberRequest {
  email: string
  role: 'admin' // Только admin можно добавлять
}

// API Response wrappers
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  message: string
  statusCode: number
  error?: string
}
```

---

## 1.4 TypeScript типы

### Структура

```
shared/
├── types/
│   ├── index.ts           # Re-exports
│   ├── auth.ts            # Auth типы
│   ├── enterprise.ts      # Enterprise типы
│   └── api.ts             # API типы (симлинк на lib/api/types.ts)
```

### 1.4.1 `shared/types/auth.ts`

```typescript
/**
 * Auth-related типы
 */

import { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js'

export type User = SupabaseUser

export type Session = SupabaseSession

export interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
}

export type Role = 'owner' | 'admin' | null

export interface UserRole {
  enterpriseId: string
  role: Role
  isOwner: boolean
}
```

### 1.4.2 `shared/types/enterprise.ts`

```typescript
/**
 * Enterprise-related типы
 */

export interface Enterprise {
  id: string
  name: string
  owner_user_id: string
  created_at: string
  updated_at: string
}

export interface EnterpriseWithRole extends Enterprise {
  role: 'owner' | 'admin'
  is_owner: boolean
}

export interface Member {
  user_id: string
  email: string
  role: 'owner' | 'admin'
  is_owner: boolean
  created_at: string
}
```

### 1.4.3 `shared/types/index.ts`

```typescript
/**
 * Centralized exports для всех типов
 */

export * from './auth'
export * from './enterprise'
export * from '../lib/api/types'
```

---

## 1.5 Environment Variables

### `.env.local` для каждого приложения

#### `site/.env.local`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Backend
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Domains
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
NEXT_PUBLIC_WORKSPACE_URL=http://localhost:3002
NEXT_PUBLIC_PLATFORM_URL=http://localhost:3003

# Cookies (production only)
# NEXT_PUBLIC_COOKIE_DOMAIN=.oblikflow.com
```

#### `admin/.env.local`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Backend
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Domains
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
NEXT_PUBLIC_WORKSPACE_URL=http://localhost:3002
NEXT_PUBLIC_PLATFORM_URL=http://localhost:3003

# Cookies (production only)
# NEXT_PUBLIC_COOKIE_DOMAIN=.oblikflow.com
```

#### `workspace/.env.local`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Backend
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Domains
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
NEXT_PUBLIC_WORKSPACE_URL=http://localhost:3002
NEXT_PUBLIC_PLATFORM_URL=http://localhost:3003

# Cookies (production only)
# NEXT_PUBLIC_COOKIE_DOMAIN=.oblikflow.com
```

#### `platform/.env.local`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Backend
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Domains
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
NEXT_PUBLIC_WORKSPACE_URL=http://localhost:3002
NEXT_PUBLIC_PLATFORM_URL=http://localhost:3003

# Cookies (production only)
# NEXT_PUBLIC_COOKIE_DOMAIN=.oblikflow.com
```

### Создать файлы через скрипт

Создай файл `scripts/setup-env.sh`:

```bash
#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up environment variables for all apps...${NC}"

# Запросить credentials
read -p "Supabase URL: " SUPABASE_URL
read -p "Supabase Anon Key: " SUPABASE_KEY
read -p "Backend URL (default: http://localhost:3001): " BACKEND_URL
BACKEND_URL=${BACKEND_URL:-http://localhost:3001}

# Создать .env.local для каждого приложения
for app in site admin workspace platform; do
  cat > "$app/.env.local" << EOF
# Supabase
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_KEY

# Backend
NEXT_PUBLIC_BACKEND_URL=$BACKEND_URL

# Domains (Development)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
NEXT_PUBLIC_WORKSPACE_URL=http://localhost:3002
NEXT_PUBLIC_PLATFORM_URL=http://localhost:3003

# Cookies (production only)
# NEXT_PUBLIC_COOKIE_DOMAIN=.oblikflow.com
EOF

  echo -e "${GREEN}✓ Created $app/.env.local${NC}"
done

echo -e "${BLUE}Done! Environment variables set up for all apps.${NC}"
```

Сделать исполняемым:

```bash
chmod +x scripts/setup-env.sh
```

Запустить:

```bash
./scripts/setup-env.sh
```

---

## ✅ Проверка

После завершения этого этапа:

- [ ] Supabase проект создан и настроен
- [ ] Email Authentication и Google OAuth работают
- [ ] Redirect URLs настроены для всех поддоменов
- [ ] Supabase клиенты созданы в `shared/lib/supabase/`
- [ ] API клиент создан в `shared/lib/api/`
- [ ] TypeScript типы созданы в `shared/types/`
- [ ] `.env.local` файлы созданы для всех приложений
- [ ] Зависимости установлены (`@supabase/ssr`, `@supabase/supabase-js`)

---

## 📖 Связанные документы

- [DATABASE_SCHEMA_ETAP1.md](/docs/auth/DATABASE_SCHEMA_ETAP1.md) - RPC functions
- [CODE_EXAMPLES.md](/docs/auth/CODE_EXAMPLES.md) - примеры кода

---

**Готово! Переходи к [Этапу 2: Site - Авторизация](./02-site-authentication.md)** →
