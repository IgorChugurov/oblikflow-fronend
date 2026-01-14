# Система ролей - Этап 1 (Упрощенная)

**Дата:** 14 января 2026  
**Версия:** 1.0 (MVP)  
**Статус:** ✅ Для реализации

---

## Содержание

1. [Обзор](#обзор)
2. [Три уровня ролей](#три-уровня-ролей)
3. [Owner - владелец предприятия](#owner---владелец-предприятия)
4. [Admin - администратор предприятия](#admin---администратор-предприятия)
5. [Обычные пользователи](#обычные-пользователи)
6. [Проверка ролей в коде](#проверка-ролей-в-коде)
7. [Ограничения Этапа 1](#ограничения-этапа-1)

---

## Обзор

На Этапе 1 реализуем **упрощенную систему** с фокусом на запуск MVP:

### Поддерживаемые роли

1. **System Admin** - глобальный администратор платформы
2. **Owner** - владелец предприятия (неудаляемый)
3. **Admin** - администратор предприятия (может быть удален)

### Что НЕ реализуем на Этапе 1

- ❌ Кастомные роли (accountant, warehouse, etc.)
- ❌ UI для создания ролей
- ❌ Детальное управление permissions
- ❌ Роли с ограниченным доступом

**Все эти возможности → Этап 2**

---

## Три уровня ролей

### 1. System Admin (Глобальная роль)

**Флаг:** `users.is_system_admin = true`

**Права:**
- ✅ Доступ к `/platform` (административная панель)
- ✅ Видит ВСЕ предприятия в `/admin`
- ✅ Может заходить в любое предприятие в `/workspace`
- ✅ Полный доступ ко всем функциям

**Создание:**
```sql
-- При инициализации БД (seed)
UPDATE users 
SET is_system_admin = true 
WHERE email = 'admin@oblikflow.com';
```

**Проверка в коде:**
```typescript
// Client-side
const { isSuperAdmin } = useRole();

// Server-side
const { data: user } = await supabase
  .from('users')
  .select('is_system_admin')
  .eq('id', userId)
  .single();

const isSuperAdmin = user?.is_system_admin;
```

**Количество:** Может быть несколько system admin (управление через SQL на Этапе 1)

---

### 2. Owner (Роль в предприятии)

**Определение:** Указан в `enterprises.owner_user_id`

**Хранение:**
- ✅ Прямая ссылка `enterprises.owner_user_id → users.id`
- ❌ НЕТ записи в `enterprise_memberships`

**Права:**
- ✅ Полный доступ к предприятию
- ✅ Управление настройками предприятия
- ✅ Управление пользователями (добавление/удаление admin)
- ✅ ВСЕ permissions автоматически
- ✅ **НЕ может быть удален** из предприятия
- ✅ Может передать владение другому пользователю (будущее)

**Создание:**
```sql
-- При создании предприятия
INSERT INTO enterprises (
  name,
  owner_user_id,  -- ID создателя
  country_code,
  status
) VALUES (
  'My Company',
  :creator_user_id,
  'UA',
  'active'
);
```

**Проверка в коде:**
```typescript
const { isOwner } = useRole(enterpriseId);

// Или server-side
const { data: enterprise } = await supabase
  .from('enterprises')
  .select('owner_user_id')
  .eq('id', enterpriseId)
  .single();

const isOwner = enterprise?.owner_user_id === userId;
```

**Количество:** Только 1 owner на предприятие

---

### 3. Admin (Роль в предприятии)

**Определение:** Запись в `enterprise_memberships` с ролью "admin"

**Хранение:**
```
enterprise_memberships
├─ enterprise_id: UUID предприятия
├─ user_id: UUID пользователя
├─ role_id: UUID → roles.id (where name = 'admin')
└─ status: 'active'
```

**Права:**
- ✅ Полный доступ к предприятию
- ✅ Управление настройками предприятия
- ✅ Управление пользователями (добавление/удаление других admin)
- ✅ ВСЕ permissions автоматически
- ❌ **МОЖЕТ быть удален** owner'ом или другим admin
- ❌ НЕ может передать владение

**Создание роли "admin":**
```sql
-- При создании предприятия автоматически создается роль "admin"
-- 1. Создать роль
INSERT INTO roles (enterprise_id, name, description)
VALUES (
  :enterprise_id,
  'admin',
  'Enterprise Administrator'
) RETURNING id;

-- 2. Назначить роли ВСЕ permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT :admin_role_id, id FROM permissions;
```

**Добавление admin в предприятие:**
```sql
-- 1. Получить role_id для 'admin'
SELECT id FROM roles 
WHERE enterprise_id = :enterprise_id 
  AND name = 'admin';

-- 2. Создать membership
INSERT INTO enterprise_memberships (
  enterprise_id,
  user_id,
  role_id,
  status
) VALUES (
  :enterprise_id,
  :user_id,
  :admin_role_id,
  'active'
);
```

**Проверка в коде:**
```typescript
const { isAdmin, role } = useRole(enterpriseId);

// role === 'admin'

// Или server-side
const { data: membership } = await supabase
  .from('enterprise_memberships')
  .select(`
    role:roles(name)
  `)
  .eq('enterprise_id', enterpriseId)
  .eq('user_id', userId)
  .eq('status', 'active')
  .single();

const isAdmin = membership?.role?.name === 'admin';
```

**Количество:** Может быть много admin в одном предприятии

---

## Обычные пользователи

### На Этапе 1: НЕ ОБРАБАТЫВАЕМ

**Если пользователь:**
- ❌ НЕ system admin
- ❌ НЕ owner предприятия
- ❌ НЕ admin предприятия

**То:**
- ❌ НЕТ доступа к `/admin` (редирект на "No access")
- ❌ НЕТ доступа к `/workspace` (редирект на `/admin`)
- ✅ Может только ждать приглашения от owner/admin

**На Этапе 2:**
- ✅ Будут кастомные роли (accountant, warehouse, viewer)
- ✅ Детальный контроль permissions
- ✅ Доступ к `/workspace` с ограничениями

---

## Проверка ролей в коде

### Хук useRole(enterpriseId?)

Единый хук для проверки ролей пользователя.

**Реализация (Этап 1):**

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
          hasAccess: false
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
          hasAccess: isSuperAdmin
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
        .single();
      
      const isAdmin = membership?.role?.name === 'admin';
      
      // На Этапе 1: доступ только у owner/admin
      const hasAccess = isSuperAdmin || isOwner || isAdmin;
      
      return {
        isSuperAdmin,
        isOwner,
        isAdmin,
        role: isOwner ? 'owner' : isAdmin ? 'admin' : null,
        hasAccess
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
    canManageMembers: data?.isOwner || data?.isAdmin || data?.isSuperAdmin,
    canEditSettings: data?.isOwner || data?.isAdmin || data?.isSuperAdmin,
    canDelete: data?.isAdmin, // owner не может быть удален
  };
}
```

### Примеры использования

#### 1. В admin - список предприятий

```typescript
// admin/app/page.tsx
'use client';

import { useEnterprises } from '@/hooks/useEnterprises';
import { useRole } from '@/hooks/useRole';

export default function EnterprisesPage() {
  const { isSuperAdmin } = useRole();
  const { data: enterprises, isLoading } = useEnterprises();
  
  if (isLoading) return <Skeleton />;
  
  if (!enterprises || enterprises.length === 0) {
    return (
      <EmptyState
        title="No enterprises yet"
        description="You don't have access to any enterprises yet."
      />
    );
  }
  
  return (
    <div>
      <h1>Your Enterprises</h1>
      {isSuperAdmin && <Badge>System Admin</Badge>}
      
      <div className="grid gap-4">
        {enterprises.map(enterprise => (
          <EnterpriseCard
            key={enterprise.id}
            enterprise={enterprise}
            showSettings={
              enterprise.role === 'owner' || 
              enterprise.role === 'admin'
            }
          />
        ))}
      </div>
      
      {/* Любой пользователь может создать предприятие */}
      <Button asChild>
        <Link href="/enterprises/new">
          Create New Enterprise
        </Link>
      </Button>
    </div>
  );
}
```

#### 2. В admin - настройки предприятия

```typescript
// admin/app/enterprises/[id]/settings/page.tsx
'use client';

import { useRole } from '@/hooks/useRole';

export default function EnterpriseSettingsPage({
  params
}: {
  params: { id: string }
}) {
  const { canEditSettings, isOwner, isAdmin, role } = useRole(params.id);
  
  // Если нет прав - показываем ошибку
  if (!canEditSettings) {
    return (
      <div>
        <h1>Access Denied</h1>
        <p>You don't have permission to edit this enterprise settings.</p>
        <p>Required role: Owner or Admin</p>
      </div>
    );
  }
  
  return (
    <div>
      <h1>Enterprise Settings</h1>
      <Badge>{role}</Badge>
      
      <EnterpriseForm enterpriseId={params.id} />
      
      {/* Только owner может передать владение */}
      {isOwner && (
        <DangerZone>
          <h3>Transfer Ownership</h3>
          <p>Transfer ownership to another admin</p>
          <Button variant="destructive">
            Transfer Ownership
          </Button>
        </DangerZone>
      )}
    </div>
  );
}
```

#### 3. В workspace - адаптивное меню

```typescript
// workspace/components/Sidebar.tsx
'use client';

import { useRole } from '@/hooks/useRole';
import { useEnterpriseContext } from '@/contexts/EnterpriseContext';

export function Sidebar() {
  const { currentEnterprise } = useEnterpriseContext();
  const { canEditSettings, hasAccess } = useRole(currentEnterprise?.id);
  
  if (!hasAccess) {
    return <div>No access</div>;
  }
  
  return (
    <nav>
      <SidebarItem href="/documents" icon={FileIcon}>
        Documents
      </SidebarItem>
      
      <SidebarItem href="/bank" icon={BankIcon}>
        Bank
      </SidebarItem>
      
      <SidebarItem href="/reports" icon={ChartIcon}>
        Reports
      </SidebarItem>
      
      {/* Настройки только для owner/admin */}
      {canEditSettings && (
        <SidebarItem href="/settings" icon={SettingsIcon}>
          Settings
        </SidebarItem>
      )}
    </nav>
  );
}
```

---

## Ограничения Этапа 1

### Что НЕ поддерживается

1. **Кастомные роли**
   - Нет UI для создания ролей
   - Роль "admin" создается автоматически
   - Нельзя создать "accountant", "warehouse" и т.д.

2. **Детальные permissions**
   - Owner и Admin имеют ВСЕ права
   - Нельзя ограничить доступ к модулям
   - Нет UI для управления permissions

3. **Обычные пользователи**
   - Пользователи без роли owner/admin не могут работать
   - Нет ролей с ограниченным доступом
   - Бухгалтеры/складовщики → Этап 2

4. **Приглашения**
   - Добавление пользователей напрямую (они должны быть зарегистрированы)
   - Нет email приглашений с токенами
   - Полноценная система приглашений → Этап 2

### Что планируется на Этапе 2

1. ✅ UI для создания кастомных ролей
2. ✅ Детальное управление permissions
3. ✅ Роли: accountant, warehouse, viewer
4. ✅ Система приглашений с email
5. ✅ Связь ролей с модулями подписки
6. ✅ UI для визуального управления правами

---

## Связанные документы

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Общая архитектура
- [PERMISSIONS_ETAP1.md](./PERMISSIONS_ETAP1.md) - Система permissions
- [DATABASE_SCHEMA_ETAP1.md](./DATABASE_SCHEMA_ETAP1.md) - Схема БД
- [ROLES_SYSTEM_ETAP2.md](./ROLES_SYSTEM_ETAP2.md) - Полная система (Этап 2)

---

**Статус:** ✅ Готово для реализации  
**Дата:** 14 января 2026  
**Версия:** 1.0 (MVP)
