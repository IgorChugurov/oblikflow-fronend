# План реализации - Этап 1 (MVP)

**Дата:** 14 января 2026  
**Версия:** 1.0  
**Статус:** ✅ Готово к работе

---

## Содержание

1. [Обзор этапов](#обзор-этапов)
2. [Этап 1: Supabase Setup](#этап-1-supabase-setup)
3. [Этап 2: Shared Infrastructure](#этап-2-shared-infrastructure)
4. [Этап 3: Site - Auth Pages](#этап-3-site---auth-pages)
5. [Этап 4: Admin - Dashboard](#этап-4-admin---dashboard)
6. [Этап 5: Workspace - Setup](#этап-5-workspace---setup)
7. [Этап 6: Platform - Super Admin](#этап-6-platform---super-admin)
8. [Этап 7: Testing](#этап-7-testing)
9. [Временные оценки](#временные-оценки)

---

## Обзор этапов

```
Этап 1: Supabase Setup (1-2 дня)
  └─ Создание проекта, БД, миграции

Этап 2: Shared Infrastructure (1-2 дня)
  └─ Shared пакет с утилитами

Этап 3: Site - Auth Pages (3-4 дня)
  └─ Login, Signup, Reset Password, OAuth

Этап 4: Admin - Dashboard (4-5 дней)
  └─ Список предприятий, создание, управление

Этап 5: Workspace - Setup (2-3 дня)
  └─ Базовая структура, EnterpriseContext

Этап 6: Platform - Super Admin (1-2 дня)
  └─ Базовая админка платформы

Этап 7: Testing (2-3 дня)
  └─ Тестирование всех flows

ИТОГО: ~15-21 день
```

---

## Этап 1: Supabase Setup

**Цель:** Настроить Supabase проект и базу данных

### 1.1. Создание Supabase проекта

- [ ] Создать новый проект в Supabase Dashboard
- [ ] Записать credentials:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (для админских операций)

### 1.2. Настройка Auth

- [ ] Dashboard → Authentication → Providers
  - [ ] Email provider: включен
  - [ ] Confirm email: включен
  - [ ] Email templates: настроить (confirm, reset password)
- [ ] Google OAuth:
  - [ ] Получить Google OAuth credentials
  - [ ] Настроить в Supabase
  - [ ] Добавить redirect URL: `https://your-project.supabase.co/auth/v1/callback`
- [ ] Site URL настройки:
  - Development: `http://localhost:3000`
  - Production: `https://oblikflow.com`
- [ ] Redirect URLs:
  - `http://localhost:3000/auth/**`
  - `https://oblikflow.com/auth/**`
  - `https://*.oblikflow.com/auth/**`

### 1.3. Создание миграций

**Файлы создавать в:** `supabase/migrations/`

- [ ] `20260114000001_seed_permissions.sql`
  - Создание базовых permissions
  - См. DATABASE_SCHEMA_ETAP1.md
- [ ] `20260114000002_seed_subscription_plans.sql`
  - Создание unlimited плана
- [ ] `20260114000003_seed_first_admin.sql`
  - Назначение первого system admin
  - ⚠️ Замените email на реальный!
- [ ] `20260114000004_rpc_functions.sql`
  - `is_system_admin()`
  - `get_user_enterprise_role()`
  - `get_user_enterprises()`
- [ ] `20260114000005_rls_policies.sql`
  - RLS для `enterprises`
  - RLS для `enterprise_memberships`

### 1.4. Проверка миграций

```bash
# Применить миграции
supabase db push

# Проверить что все таблицы созданы
supabase db status

# Проверить permissions
SELECT COUNT(*) FROM permissions;
# Должно быть ~40+ permissions

# Проверить план
SELECT * FROM subscription_plans WHERE code = 'unlimited';
```

---

## Этап 2: Shared Infrastructure

**Цель:** Создать shared пакет с общими утилитами

### 2.1. Установка зависимостей

```bash
# В корне monorepo
pnpm add -w @supabase/supabase-js @supabase/ssr

# В shared/
cd shared
pnpm add @tanstack/react-query
```

### 2.2. Supabase clients

- [ ] `shared/lib/supabase/client.ts`
  ```typescript
  import { createBrowserClient } from '@supabase/ssr';
  
  export function createClient() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  ```

- [ ] `shared/lib/supabase/server.ts`
  ```typescript
  import { createServerClient } from '@supabase/ssr';
  import { cookies } from 'next/headers';
  
  export async function createClient() {
    const cookieStore = await cookies();
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookies) { /* ... */ }
        }
      }
    );
  }
  ```

- [ ] `shared/lib/supabase/types.ts`
  ```typescript
  // Generated types from Supabase
  // supabase gen types typescript --project-id xxx > shared/lib/supabase/types.ts
  ```

### 2.3. Auth utilities

- [ ] Обновить `shared/lib/auth.ts`
  - Адаптировать под Supabase (вместо кастомного JWT)
  - Использовать Supabase cookies

### 2.4. Хуки

- [ ] `shared/hooks/useRole.ts`
  ```typescript
  export function useRole(enterpriseId?: string) {
    // Проверка ролей через RPC
    // См. ROLES_SYSTEM_ETAP1.md
  }
  ```

- [ ] `shared/hooks/useEnterprises.ts`
  ```typescript
  export function useEnterprises() {
    // Получение списка предприятий
    // Через RPC get_user_enterprises()
  }
  ```

- [ ] `shared/hooks/usePermissions.ts`
  ```typescript
  export function usePermissions(enterpriseId?: string) {
    // На Этапе 1: упрощенная проверка
    // owner/admin = все права
  }
  ```

### 2.5. Contexts

- [ ] `shared/contexts/EnterpriseContext.tsx`
  ```typescript
  // Для workspace
  // Хранит currentEnterprise
  // Методы: switchEnterprise()
  ```

### 2.6. Переменные окружения

**Создать `.env.local` для каждого приложения:**

```bash
# site/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

NEXT_PUBLIC_BASE_DOMAIN=oblikflow.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
NEXT_PUBLIC_WORKSPACE_URL=http://localhost:3002
NEXT_PUBLIC_PLATFORM_URL=http://localhost:3003
NEXT_PUBLIC_COOKIE_DOMAIN=localhost

# Скопировать такие же в admin/, workspace/, platform/
```

---

## Этап 3: Site - Auth Pages

**Цель:** Реализовать страницы авторизации

**Образцы брать из:** `/Users/igorchugurov/Documents/GitHub/OUR-pack/axon-dashboard/app`

### 3.1. AuthProvider

- [ ] `site/components/providers/AuthProvider.tsx`
  - Скопировать из axon-dashboard
  - Адаптировать под наш Supabase
  - Методы:
    - `login(email, password)`
    - `signup(email, password, name)`
    - `loginWithOAuth(provider)`
    - `resetPassword(email)`
    - `logout()`

### 3.2. Login Page

- [ ] `site/app/login/page.tsx`
  - Скопировать из axon-dashboard
  - Форма: email, password
  - Google OAuth button
  - "Forgot password?" link
  - "Sign up" link
  - После успеха → redirect admin/

### 3.3. Signup Page

- [ ] `site/app/signup/page.tsx`
  - Форма: name, email, password
  - Terms checkbox
  - Google OAuth button
  - После успеха → показать "Check your email"

### 3.4. Reset Password

- [ ] `site/app/reset-password/page.tsx`
  - Форма: email
  - Отправка reset link
  - Показ "Check your email"

- [ ] `site/app/auth/reset-password/page.tsx`
  - Форма: new password, confirm password
  - Принимает token из URL
  - После успеха → redirect login с сообщением

### 3.5. Auth Callbacks

- [ ] `site/app/auth/callback/route.ts`
  - OAuth callback handler
  - Exchange code для tokens
  - Redirect на admin/

- [ ] `site/app/auth/confirm/route.ts`
  - Email confirmation handler
  - Обновляет email_verified
  - Redirect на admin/

### 3.6. Middleware (нет)

```typescript
// site/middleware.ts
// Нет middleware - все публичное
export const config = {
  matcher: []
};
```

---

## Этап 4: Admin - Dashboard

**Цель:** Реализовать персональный дашборд

### 4.1. Middleware

- [ ] `admin/middleware.ts`
  ```typescript
  export async function middleware(request: NextRequest) {
    const supabase = createServerClient(/* ... */);
    const { data: { user } } = await supabase.auth.getUser();
    
    // Не авторизован
    if (!user) {
      return NextResponse.redirect(SITE_URL + '/login');
    }
    
    // Email не подтвержден
    if (!user.email_confirmed_at && pathname !== '/verify-email') {
      return NextResponse.redirect(ADMIN_URL + '/verify-email');
    }
    
    return NextResponse.next();
  }
  ```

### 4.2. Verify Email Page

- [ ] `admin/app/verify-email/page.tsx`
  - Скопировать из axon-dashboard
  - Экран "Please verify your email"
  - Кнопка "Resend Email"
  - Кнопка "Logout"

### 4.3. Main Dashboard

- [ ] `admin/app/page.tsx`
  ```typescript
  export default function AdminDashboard() {
    const { data: enterprises } = useEnterprises();
    const { isSuperAdmin } = useRole();
    
    if (!enterprises || enterprises.length === 0) {
      return <EmptyState />;
    }
    
    return (
      <>
        {isSuperAdmin && <Badge>System Admin</Badge>}
        <EnterprisesList enterprises={enterprises} />
        <CreateEnterpriseButton />
      </>
    );
  }
  ```

- [ ] `admin/components/EnterpriseCard.tsx`
  - Карточка предприятия
  - Показывает роль
  - [Open Workspace] button
  - [Settings] button (если owner/admin)

- [ ] `admin/components/EmptyState.tsx`
  - "You don't have any enterprises yet"
  - [Create Your First Enterprise] button

### 4.4. Create Enterprise

- [ ] `admin/app/enterprises/new/page.tsx`
  - Форма создания предприятия
  - Поля: name, country, currency
  - Server Action: createEnterprise()

- [ ] `admin/app/enterprises/actions.ts`
  ```typescript
  'use server';
  
  export async function createEnterprise(data: EnterpriseData) {
    // 1. Создать enterprise (owner = current user)
    // 2. Создать роль "admin"
    // 3. Назначить роли ВСЕ permissions
    // 4. Вернуть enterprise
  }
  ```

### 4.5. Enterprise Settings

- [ ] `admin/app/enterprises/[id]/settings/page.tsx`
  - Проверка прав (только owner/admin)
  - Форма настроек предприятия
  - Server Action: updateEnterprise()

- [ ] Tabs:
  - [ ] General - основные настройки
  - [ ] Members - управление пользователями (см. ниже)

### 4.6. Members Management

- [ ] `admin/app/enterprises/[id]/members/page.tsx`
  - Список членов команды
  - Показывает owner (нельзя удалить)
  - Показывает admin (можно удалить)
  - [+ Add Member] button

- [ ] `admin/components/AddMemberModal.tsx`
  - Форма: email
  - Роль: только "Admin" на Этапе 1
  - ⚠️ Пользователь должен быть зарегистрирован
  - Server Action: addMember()

- [ ] `admin/app/enterprises/[id]/actions.ts`
  ```typescript
  'use server';
  
  export async function addMember(enterpriseId, email) {
    // 1. Найти пользователя по email
    // 2. Проверить что нет дубликата
    // 3. Получить role_id для "admin"
    // 4. INSERT INTO enterprise_memberships
  }
  
  export async function removeMember(enterpriseId, userId) {
    // 1. Проверить что это не owner
    // 2. DELETE FROM enterprise_memberships
  }
  ```

### 4.7. Navigation to Workspace

- [ ] `admin/components/EnterpriseCard.tsx` - кнопка [Open Workspace]
  ```typescript
  const handleOpenWorkspace = async (enterpriseId: string) => {
    // 1. Установить cookie
    document.cookie = `current_enterprise_id=${enterpriseId}; path=/; domain=.oblikflow.com`;
    
    // 2. Redirect
    window.location.href = WORKSPACE_URL;
  };
  ```

---

## Этап 5: Workspace - Setup

**Цель:** Базовая структура workspace с EnterpriseContext

### 5.1. Middleware

- [ ] `workspace/middleware.ts`
  ```typescript
  export async function middleware(request: NextRequest) {
    const supabase = createServerClient(/* ... */);
    const { data: { user } } = await supabase.auth.getUser();
    
    // Не авторизован
    if (!user) {
      return NextResponse.redirect(SITE_URL + '/login');
    }
    
    // Нет enterprise_id в cookie
    const enterpriseId = request.cookies.get('current_enterprise_id')?.value;
    if (!enterpriseId) {
      return NextResponse.redirect(ADMIN_URL);
    }
    
    // Проверить доступ
    const { data: role } = await supabase.rpc('get_user_enterprise_role', {
      p_user_id: user.id,
      p_enterprise_id: enterpriseId
    });
    
    if (!role) {
      const response = NextResponse.redirect(ADMIN_URL);
      response.cookies.delete('current_enterprise_id');
      return response;
    }
    
    return NextResponse.next();
  }
  ```

### 5.2. EnterpriseContext

- [ ] `workspace/contexts/EnterpriseContext.tsx`
  ```typescript
  interface EnterpriseContextType {
    currentEnterprise: Enterprise | null;
    isLoading: boolean;
    switchEnterprise: (id: string) => Promise<void>;
  }
  
  export function EnterpriseProvider({ children }) {
    // Загрузка current enterprise из cookie
    // Методы переключения
  }
  ```

- [ ] `workspace/app/layout.tsx`
  - Обернуть в EnterpriseProvider

### 5.3. Header

- [ ] `workspace/components/Header.tsx`
  ```typescript
  export function Header() {
    const { currentEnterprise } = useEnterpriseContext();
    const { canEditSettings } = useRole(currentEnterprise?.id);
    
    return (
      <header>
        <EnterpriseSelector />
        {canEditSettings && <SettingsButton />}
        <UserMenu />
      </header>
    );
  }
  ```

- [ ] `workspace/components/EnterpriseSelector.tsx`
  - Dropdown с текущим предприятием
  - Клик → переход на admin для смены

### 5.4. Sidebar

- [ ] `workspace/components/Sidebar.tsx`
  ```typescript
  export function Sidebar() {
    const { currentEnterprise } = useEnterpriseContext();
    const { hasPermission } = usePermissions(currentEnterprise?.id);
    
    return (
      <nav>
        {hasPermission('documents:read') && (
          <SidebarItem href="/documents">Documents</SidebarItem>
        )}
        {/* ... другие пункты */}
      </nav>
    );
  }
  ```

### 5.5. Main Page

- [ ] `workspace/app/page.tsx`
  - Базовый дашборд предприятия
  - Показывает имя предприятия
  - Placeholder для будущих модулей

---

## Этап 6: Platform - Super Admin

**Цель:** Базовая админка платформы

### 6.1. Middleware

- [ ] `platform/middleware.ts`
  ```typescript
  export async function middleware(request: NextRequest) {
    const supabase = createServerClient(/* ... */);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.redirect(SITE_URL + '/login');
    }
    
    // Проверка system admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_system_admin')
      .eq('id', user.id)
      .single();
    
    if (!userData?.is_system_admin) {
      return NextResponse.redirect(ADMIN_URL);
    }
    
    return NextResponse.next();
  }
  ```

### 6.2. Dashboard

- [ ] `platform/app/page.tsx`
  - Статистика платформы
  - Total users, enterprises, etc.

### 6.3. Users List

- [ ] `platform/app/users/page.tsx`
  - Список всех пользователей
  - Фильтры, поиск
  - Назначение system admin (будущее)

### 6.4. Enterprises List

- [ ] `platform/app/enterprises/page.tsx`
  - Список всех предприятий
  - Фильтры по статусу
  - Детали предприятия

---

## Этап 7: Testing

**Цель:** Протестировать все flows

### 7.1. Unit тесты

- [ ] Хуки:
  - [ ] useRole
  - [ ] useEnterprises
  - [ ] usePermissions

- [ ] Utilities:
  - [ ] Supabase clients
  - [ ] Auth utilities

### 7.2. E2E тесты (Playwright)

- [ ] Flow: Регистрация → Создание предприятия → Работа
- [ ] Flow: Авторизация → Выбор предприятия → Workspace
- [ ] Flow: Owner добавляет Admin
- [ ] Flow: Потеря доступа к предприятию
- [ ] Flow: System admin доступ

### 7.3. Manual testing

**Тестовые сценарии:**

- [ ] Регистрация нового пользователя
  - [ ] Email/password
  - [ ] Google OAuth
  - [ ] Email verification

- [ ] Авторизация
  - [ ] Email/password
  - [ ] "Remember me"
  - [ ] Google OAuth

- [ ] Reset password
  - [ ] Отправка email
  - [ ] Установка нового пароля

- [ ] Создание предприятия
  - [ ] Успешное создание
  - [ ] Проверка что пользователь стал owner

- [ ] Управление членами
  - [ ] Добавление admin
  - [ ] Удаление admin
  - [ ] Попытка удалить owner (должна fail)

- [ ] Работа с несколькими предприятиями
  - [ ] Переключение между предприятиями
  - [ ] Cookie обновляется корректно

- [ ] Middleware защита
  - [ ] Неавторизованный → site/login
  - [ ] Email не подтвержден → admin/verify-email
  - [ ] Нет прав в enterprise → admin/
  - [ ] Не superadmin → нет доступа к platform

- [ ] Cookies между поддоменами (staging)
  - [ ] Login на site → cookie доступен в admin
  - [ ] Cookie доступен в workspace
  - [ ] Logout → cookie удален везде

---

## Временные оценки

### По этапам

| Этап | Задачи | Оценка |
|------|--------|--------|
| 1. Supabase Setup | Проект, миграции, RPC | 1-2 дня |
| 2. Shared Infrastructure | Клиенты, хуки, утилиты | 1-2 дня |
| 3. Site - Auth | Login, Signup, Reset, OAuth | 3-4 дня |
| 4. Admin - Dashboard | Список, создание, управление | 4-5 дней |
| 5. Workspace - Setup | EnterpriseContext, базовая структура | 2-3 дня |
| 6. Platform | Super admin дашборд | 1-2 дня |
| 7. Testing | Unit, E2E, manual | 2-3 дня |
| **ИТОГО** | | **15-21 день** |

### По компонентам

- **Backend (Supabase):** 1-2 дня
- **Shared пакет:** 1-2 дня
- **Site (Auth):** 3-4 дня
- **Admin:** 4-5 дней
- **Workspace:** 2-3 дня
- **Platform:** 1-2 дня
- **Testing:** 2-3 дня

---

## Чеклист готовности

### Перед началом

- [ ] Доступ к Supabase
- [ ] Google OAuth credentials
- [ ] Дизайн макеты UI (или используем axon-dashboard)
- [ ] Staging environment (с реальным доменом для тестирования cookies)

### После завершения

- [ ] ✅ Все миграции применены
- [ ] ✅ Первый system admin создан
- [ ] ✅ Unlimited план создан
- [ ] ✅ Все 4 приложения работают
- [ ] ✅ Cookies работают между поддоменами (на staging)
- [ ] ✅ Все flows протестированы
- [ ] ✅ Документация обновлена

---

## Связанные документы

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Общая архитектура
- [ROLES_SYSTEM_ETAP1.md](./ROLES_SYSTEM_ETAP1.md) - Система ролей
- [PERMISSIONS_ETAP1.md](./PERMISSIONS_ETAP1.md) - Permissions
- [DATABASE_SCHEMA_ETAP1.md](./DATABASE_SCHEMA_ETAP1.md) - БД
- [UI_UX_FLOWS_ETAP1.md](./UI_UX_FLOWS_ETAP1.md) - UX flows
- [ETAP2_OVERVIEW.md](./ETAP2_OVERVIEW.md) - План Этапа 2

---

**Статус:** ✅ Готово к реализации  
**Дата:** 14 января 2026  
**Версия:** 1.0
