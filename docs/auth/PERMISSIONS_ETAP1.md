# Система Permissions - Этап 1 (Базовая)

**Дата:** 14 января 2026  
**Версия:** 1.0 (MVP)  
**Статус:** ⚠️ Требует доработки в процессе реализации бухгалтерии

---

## ⚠️ ВАЖНОЕ ПРЕДУПРЕЖДЕНИЕ

Этот документ содержит **базовый набор permissions** для запуска MVP.

**Список permissions будет дорабатываться:**
- 🔄 В процессе реализации модулей бухгалтерии
- 🔄 По мере появления новых функций
- 🔄 На основе реальных требований к ролям

**НЕ используйте этот список как финальный!**

---

## Содержание

1. [Обзор](#обзор)
2. [Архитектура permissions](#архитектура-permissions)
3. [Базовый набор permissions](#базовый-набор-permissions)
4. [Seed данные](#seed-данные)
5. [Проверка прав в коде](#проверка-прав-в-коде)
6. [Ограничения Этапа 1](#ограничения-этапа-1)

---

## Обзор

### Что такое permissions?

**Permissions** - это детальные права доступа к функциям системы.

Формат: `module:action`
- `module` - модуль системы (documents, bank, inventory)
- `action` - действие (read, create, update, delete, post)

Примеры:
- `documents:read` - просмотр документов
- `documents:post` - проведение документов
- `bank:reconcile` - сверка банка
- `periods:close` - закрытие периодов

### Как это работает?

```
permissions (глобальная таблица)
    ↓
role_permissions (связь M2M)
    ↓
roles (роли предприятия)
    ↓
enterprise_memberships (пользователь + роль)
```

### Упрощение на Этапе 1

**Owner и Admin имеют ВСЕ permissions автоматически:**

```typescript
// Упрощенная проверка
if (isOwner || isAdmin) {
  return true; // Полный доступ
}

// Обычные пользователи не поддерживаются на Этапе 1
return false;
```

---

## Архитектура permissions

### Таблица permissions

```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,  -- 'documents:read'
  description TEXT
);
```

**Ключевые моменты:**
- ✅ Глобальная таблица (не зависит от предприятия)
- ✅ Создается при инициализации системы (seed)
- ✅ Одинаковые permissions для всей платформы

### Таблица role_permissions

```sql
CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
```

**Как связывается:**
1. При создании предприятия создается роль "admin"
2. Этой роли автоматически назначаются ВСЕ permissions
3. При добавлении пользователя в предприятие он получает роль "admin"
4. Через роль пользователь получает все permissions

---

## Базовый набор permissions

### ⚠️ ВНИМАНИЕ

Этот список является **стартовой точкой** и будет расширяться в процессе разработки.

### 1. Documents (Документы)

```sql
INSERT INTO permissions (code, description) VALUES
  ('documents:read', 'View documents'),
  ('documents:create', 'Create new documents'),
  ('documents:update', 'Update draft documents'),
  ('documents:delete', 'Delete draft documents'),
  ('documents:post', 'Post documents to ledger'),
  ('documents:void', 'Void posted documents');
```

**Когда потребуется доработка:**
- Разные типы документов (поступление, продажа, возврат)
- Разделение прав на черновики и проведенные
- Права на отмену проведения

### 2. Periods (Периоды)

```sql
INSERT INTO permissions (code, description) VALUES
  ('periods:read', 'View accounting periods'),
  ('periods:create', 'Create new periods'),
  ('periods:close', 'Close accounting periods'),
  ('periods:reopen', 'Reopen closed periods');
```

**Когда потребуется доработка:**
- Права на закрытие года vs месяца
- Специальные права на работу в закрытых периодах

### 3. Enterprise Settings (Настройки предприятия)

```sql
INSERT INTO permissions (code, description) VALUES
  ('enterprise:read', 'View enterprise settings'),
  ('enterprise:update', 'Update enterprise settings'),
  ('enterprise:members', 'Manage enterprise members'),
  ('enterprise:delete', 'Delete/archive enterprise');
```

### 4. Bank (Банк)

```sql
INSERT INTO permissions (code, description) VALUES
  ('bank:read', 'View bank accounts and transactions'),
  ('bank:import', 'Import bank statements'),
  ('bank:reconcile', 'Reconcile bank transactions'),
  ('bank:allocate', 'Allocate bank payments to documents');
```

**Когда потребуется доработка:**
- Разделение прав на разные банковские счета
- Права на подключение банков через API
- Права на создание/редактирование банковских счетов

### 5. Inventory (Склад)

```sql
INSERT INTO permissions (code, description) VALUES
  ('inventory:read', 'View inventory and stock levels'),
  ('inventory:create', 'Create inventory operations'),
  ('inventory:manage', 'Manage inventory points'),
  ('inventory:count', 'Perform stock counting'),
  ('inventory:reserve', 'Create and manage reservations');
```

**Когда потребуется доработка:**
- Разделение прав на разные склады
- Права на инвентаризацию
- Права на резервы
- Права на списание

### 6. Reports (Отчеты)

```sql
INSERT INTO permissions (code, description) VALUES
  ('reports:view', 'View financial reports'),
  ('reports:export', 'Export reports to PDF/Excel'),
  ('reports:custom', 'Create custom reports');
```

**Когда потребуется доработка:**
- Разные типы отчетов (баланс, P&L, tax)
- Права на чувствительные отчеты

### 7. Counterparties (Контрагенты)

```sql
INSERT INTO permissions (code, description) VALUES
  ('counterparties:read', 'View counterparties'),
  ('counterparties:create', 'Create counterparties'),
  ('counterparties:update', 'Update counterparties'),
  ('counterparties:delete', 'Delete counterparties');
```

### 8. Products (Товары)

```sql
INSERT INTO permissions (code, description) VALUES
  ('products:read', 'View products catalog'),
  ('products:create', 'Create products'),
  ('products:update', 'Update products'),
  ('products:delete', 'Delete products');
```

### 9. Tax (Налоги)

```sql
INSERT INTO permissions (code, description) VALUES
  ('tax:read', 'View tax information'),
  ('tax:configure', 'Configure tax profiles'),
  ('tax:reports', 'Generate tax reports');
```

**Когда потребуется доработка:**
- Разные типы налоговых отчетов
- Права на отправку отчетов в налоговую

### 10. Recurring Operations (Регулярные операции)

```sql
INSERT INTO permissions (code, description) VALUES
  ('recurring:read', 'View recurring operations'),
  ('recurring:create', 'Create recurring templates'),
  ('recurring:execute', 'Execute recurring operations');
```

**Когда потребуется доработка:**
- Разные типы операций (амортизация, начисления)
- Права на автоматический запуск

---

## Seed данные

### Создание базовых permissions

```sql
-- File: supabase/migrations/XXXXX_seed_permissions.sql

-- ====================================
-- БАЗОВЫЕ PERMISSIONS (Этап 1)
-- ====================================
-- ⚠️ Этот список будет дорабатываться!

-- Documents
INSERT INTO permissions (code, description) VALUES
  ('documents:read', 'View documents'),
  ('documents:create', 'Create new documents'),
  ('documents:update', 'Update draft documents'),
  ('documents:delete', 'Delete draft documents'),
  ('documents:post', 'Post documents to ledger'),
  ('documents:void', 'Void posted documents');

-- Periods
INSERT INTO permissions (code, description) VALUES
  ('periods:read', 'View accounting periods'),
  ('periods:create', 'Create new periods'),
  ('periods:close', 'Close accounting periods'),
  ('periods:reopen', 'Reopen closed periods');

-- Enterprise
INSERT INTO permissions (code, description) VALUES
  ('enterprise:read', 'View enterprise settings'),
  ('enterprise:update', 'Update enterprise settings'),
  ('enterprise:members', 'Manage enterprise members'),
  ('enterprise:delete', 'Delete/archive enterprise');

-- Bank
INSERT INTO permissions (code, description) VALUES
  ('bank:read', 'View bank accounts and transactions'),
  ('bank:import', 'Import bank statements'),
  ('bank:reconcile', 'Reconcile bank transactions'),
  ('bank:allocate', 'Allocate bank payments to documents');

-- Inventory
INSERT INTO permissions (code, description) VALUES
  ('inventory:read', 'View inventory and stock levels'),
  ('inventory:create', 'Create inventory operations'),
  ('inventory:manage', 'Manage inventory points'),
  ('inventory:count', 'Perform stock counting'),
  ('inventory:reserve', 'Create and manage reservations');

-- Reports
INSERT INTO permissions (code, description) VALUES
  ('reports:view', 'View financial reports'),
  ('reports:export', 'Export reports to PDF/Excel'),
  ('reports:custom', 'Create custom reports');

-- Counterparties
INSERT INTO permissions (code, description) VALUES
  ('counterparties:read', 'View counterparties'),
  ('counterparties:create', 'Create counterparties'),
  ('counterparties:update', 'Update counterparties'),
  ('counterparties:delete', 'Delete counterparties');

-- Products
INSERT INTO permissions (code, description) VALUES
  ('products:read', 'View products catalog'),
  ('products:create', 'Create products'),
  ('products:update', 'Update products'),
  ('products:delete', 'Delete products');

-- Tax
INSERT INTO permissions (code, description) VALUES
  ('tax:read', 'View tax information'),
  ('tax:configure', 'Configure tax profiles'),
  ('tax:reports', 'Generate tax reports');

-- Recurring
INSERT INTO permissions (code, description) VALUES
  ('recurring:read', 'View recurring operations'),
  ('recurring:create', 'Create recurring templates'),
  ('recurring:execute', 'Execute recurring operations');

-- ====================================
-- ПРИМЕЧАНИЕ:
-- При разработке модулей бухгалтерии
-- этот список будет расширяться!
-- ====================================
```

### Назначение permissions роли "admin"

```sql
-- При создании предприятия (в Server Action)
-- 1. Создать предприятие
-- 2. Создать роль "admin"
-- 3. Назначить роли ВСЕ permissions

-- Это делается в коде:
const { data: role } = await supabase
  .from('roles')
  .insert({
    enterprise_id,
    name: 'admin',
    description: 'Enterprise Administrator'
  })
  .select()
  .single();

// Назначить ВСЕ permissions
const { data: allPermissions } = await supabase
  .from('permissions')
  .select('id');

await supabase
  .from('role_permissions')
  .insert(
    allPermissions.map(p => ({
      role_id: role.id,
      permission_id: p.id
    }))
  );
```

---

## Проверка прав в коде

### На Этапе 1: Упрощенная проверка

```typescript
// shared/hooks/usePermissions.ts
'use client';

import { useRole } from './useRole';

export function usePermissions(enterpriseId?: string) {
  const { isOwner, isAdmin, isSuperAdmin } = useRole(enterpriseId);
  
  // На Этапе 1: owner/admin имеют ВСЕ права
  const hasFullAccess = isOwner || isAdmin || isSuperAdmin;
  
  return {
    hasPermission: (code: string) => hasFullAccess,
    hasAnyPermission: (codes: string[]) => hasFullAccess,
    hasAllPermissions: (codes: string[]) => hasFullAccess,
    permissions: hasFullAccess ? ['*'] : [], // '*' = все права
  };
}
```

### Использование в компонентах

```typescript
// workspace/app/documents/page.tsx
'use client';

import { usePermissions } from '@/hooks/usePermissions';
import { useEnterpriseContext } from '@/contexts/EnterpriseContext';

export default function DocumentsPage() {
  const { currentEnterprise } = useEnterpriseContext();
  const { hasPermission } = usePermissions(currentEnterprise?.id);
  
  // На Этапе 1 всегда вернет true для owner/admin
  const canCreate = hasPermission('documents:create');
  const canPost = hasPermission('documents:post');
  
  return (
    <div>
      <h1>Documents</h1>
      
      {canCreate && (
        <Button asChild>
          <Link href="/documents/new">
            Create Document
          </Link>
        </Button>
      )}
      
      <DocumentsList 
        canPost={canPost}
      />
    </div>
  );
}
```

### В Server Actions

```typescript
// workspace/app/documents/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';

export async function postDocument(documentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  // Получить предприятие документа
  const { data: document } = await supabase
    .from('documents')
    .select('enterprise_id')
    .eq('id', documentId)
    .single();
  
  // Проверить права (на Этапе 1: owner или admin)
  const hasAccess = await checkUserAccess(user.id, document.enterprise_id);
  
  if (!hasAccess) {
    throw new Error('Access denied');
  }
  
  // Выполнить операцию
  // ...
}

async function checkUserAccess(userId: string, enterpriseId: string) {
  const supabase = await createClient();
  
  // Проверка owner
  const { data: enterprise } = await supabase
    .from('enterprises')
    .select('owner_user_id')
    .eq('id', enterpriseId)
    .single();
  
  if (enterprise?.owner_user_id === userId) {
    return true;
  }
  
  // Проверка admin
  const { data: membership } = await supabase
    .from('enterprise_memberships')
    .select('role:roles(name)')
    .eq('enterprise_id', enterpriseId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  
  return membership?.role?.name === 'admin';
}
```

---

## Ограничения Этапа 1

### Что НЕ работает

1. **Детальная проверка permissions**
   - Owner/Admin имеют ВСЕ права
   - Нельзя ограничить доступ к конкретным функциям
   - Нет ролей с частичным доступом

2. **Обычные пользователи**
   - Пользователи без роли owner/admin не могут работать
   - Нет проверки конкретных permissions для них

3. **UI для управления permissions**
   - Нельзя выбрать какие permissions дать роли
   - Нельзя создать кастомную роль с ограниченными правами

### Что планируется на Этапе 2

1. ✅ Полная проверка permissions
   ```typescript
   // Реальная проверка через БД
   const { data: rolePerms } = await supabase
     .from('role_permissions')
     .select('permission:permissions(code)')
     .eq('role_id', membership.role_id);
   
   const permissions = rolePerms.map(rp => rp.permission.code);
   
   return {
     hasPermission: (code) => permissions.includes(code),
     permissions
   };
   ```

2. ✅ Кастомные роли с выбором permissions
   ```typescript
   // UI для создания роли
   <RoleForm>
     <PermissionsSelector
       availablePermissions={allPermissions}
       selectedPermissions={selectedPerms}
       onChange={setSelectedPerms}
     />
   </RoleForm>
   ```

3. ✅ Обычные пользователи с ограниченным доступом
   ```typescript
   // Бухгалтер видит только documents и reports
   const accountantPerms = [
     'documents:read',
     'documents:create',
     'documents:post',
     'reports:view'
   ];
   ```

---

## Связанные документы

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Общая архитектура
- [ROLES_SYSTEM_ETAP1.md](./ROLES_SYSTEM_ETAP1.md) - Система ролей
- [DATABASE_SCHEMA_ETAP1.md](./DATABASE_SCHEMA_ETAP1.md) - Схема БД
- [PERMISSIONS_ETAP2.md](./PERMISSIONS_ETAP2.md) - Полная система (Этап 2)

---

**Статус:** ⚠️ Требует доработки в процессе реализации  
**Дата:** 14 января 2026  
**Версия:** 1.0 (базовый набор для MVP)
