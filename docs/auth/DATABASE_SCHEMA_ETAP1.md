# Database Schema - Этап 1 (MVP)

**Дата:** 14 января 2026  
**Версия:** 1.0  
**Статус:** ✅ Готово для реализации

---

## Содержание

1. [Обзор](#обзор)
2. [Используемые таблицы](#используемые-таблицы)
3. [RPC функции](#rpc-функции)
4. [Seed данные](#seed-данные)
5. [RLS Policies](#rls-policies)
6. [Миграции Supabase](#миграции-supabase)

---

## Обзор

### Источник

Схема БД берется из **ERD бэкенда** (`oblikflow-backend/docs/EDR/ERD_v1.0_CANONICAL.md`)

### Что создаем на фронтенде

**НЕ создаем таблицы** - они уже есть в бэкенде!

**Создаем на фронтенде:**
1. ✅ RPC функции для проверки ролей
2. ✅ Seed данные (permissions, первый system admin, unlimited план)
3. ✅ RLS policies для изоляции данных

---

## Используемые таблицы

### 1. users (из Supabase Auth + кастомные поля)

**Назначение:** Глобальный пул пользователей

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NULL, -- handled by Supabase Auth
  
  -- Platform administration
  is_system_admin BOOLEAN DEFAULT FALSE,
  language_preference VARCHAR(5) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  current_subscription_id UUID NULL REFERENCES user_subscriptions(id),
  email_verified BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  last_login_at timestamptz NULL,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NULL
);
```

**Для Этапа 1 важны:**
- `is_system_admin` - флаг system admin
- `email_verified` - проверка в middleware
- `current_subscription_id` - ссылка на подписку (unlimited)

---

### 2. enterprises (Предприятия)

```sql
CREATE TABLE enterprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  default_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  
  -- Owner (не может быть удален)
  owner_user_id UUID NOT NULL REFERENCES users(id),
  
  -- Lifecycle
  status VARCHAR(50) DEFAULT 'active', -- 'active' | 'inactive' | 'suspended'
  deleted_at timestamptz NULL, -- soft delete
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by UUID NULL,
  updated_at timestamptz NULL
);

CREATE INDEX idx_enterprises_owner ON enterprises(owner_user_id);
CREATE INDEX idx_enterprises_status ON enterprises(status) WHERE deleted_at IS NULL;
```

**Ключевые поля:**
- `owner_user_id` - владелец предприятия (роль owner)
- `status` - статус предприятия
- `deleted_at` - мягкое удаление (на Этапе 2)

---

### 3. roles (Роли предприятия)

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enterprise_id, name)
);

CREATE INDEX idx_roles_enterprise ON roles(enterprise_id);
```

**На Этапе 1:**
- При создании предприятия автоматически создается роль "admin"
- Кастомные роли не создаются

---

### 4. permissions (Глобальный справочник прав)

```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL, -- 'documents:read', 'documents:post'
  description TEXT
);

CREATE INDEX idx_permissions_code ON permissions(code);
```

**На Этапе 1:**
- Создается базовый набор при seed
- Расширяется в процессе разработки модулей

---

### 5. role_permissions (Связь роль-права)

```sql
CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_perms_role ON role_permissions(role_id);
```

**На Этапе 1:**
- Роли "admin" назначаются ВСЕ permissions
- Проверка permissions в коде упрощенная (owner/admin = все права)

---

### 6. enterprise_memberships (Членство в предприятиях)

```sql
CREATE TABLE enterprise_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NULL REFERENCES roles(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active' | 'inactive'
  
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by UUID NULL,
  updated_at timestamptz NULL,
  
  UNIQUE (enterprise_id, user_id)
);

CREATE INDEX idx_memberships_enterprise ON enterprise_memberships(enterprise_id);
CREATE INDEX idx_memberships_user ON enterprise_memberships(user_id);
CREATE INDEX idx_memberships_status ON enterprise_memberships(status);
```

**Ключевые моменты:**
- Owner НЕ хранится здесь (только в `enterprises.owner_user_id`)
- Admin хранятся здесь с `role_id` → роль "admin"
- `status` позволяет деактивировать пользователя без удаления

---

### 7. subscription_plans (Тарифные планы)

```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL, -- 'unlimited', 'free', 'starter', 'pro'
  name_i18n_key VARCHAR(100) NOT NULL,
  description_i18n_key VARCHAR(100),
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  trial_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**На Этапе 1:**
- Создается только план "unlimited"
- Проверки лимитов пропускаются

---

### 8. user_subscriptions (Подписки пользователей)

```sql
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_subs_user ON user_subscriptions(user_id);
CREATE INDEX idx_user_subs_status ON user_subscriptions(status);
```

**На Этапе 1:**
- При регистрации автоматически создается подписка "unlimited"
- Биллинг не реализован

---

## RPC функции

### 1. is_system_admin

**Назначение:** Проверка, является ли пользователь system admin

```sql
CREATE OR REPLACE FUNCTION is_system_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COALESCE(is_system_admin, FALSE)
  FROM users
  WHERE id = user_uuid;
$$;
```

**Использование:**
```typescript
const { data } = await supabase.rpc('is_system_admin', {
  user_uuid: userId
});

const isSuperAdmin = data === true;
```

---

### 2. get_user_enterprise_role

**Назначение:** Получить роль пользователя в предприятии

```sql
CREATE OR REPLACE FUNCTION get_user_enterprise_role(
  p_user_id UUID,
  p_enterprise_id UUID
)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
AS $$
  -- Проверка owner
  SELECT 'owner'
  FROM enterprises
  WHERE id = p_enterprise_id 
    AND owner_user_id = p_user_id
    AND deleted_at IS NULL
    AND status = 'active'
  
  UNION
  
  -- Проверка membership
  SELECT r.name
  FROM enterprise_memberships em
  JOIN roles r ON em.role_id = r.id
  WHERE em.user_id = p_user_id 
    AND em.enterprise_id = p_enterprise_id
    AND em.status = 'active'
  
  LIMIT 1;
$$;
```

**Возвращает:**
- `'owner'` - пользователь owner
- `'admin'` - пользователь admin
- `NULL` - нет доступа

**Использование:**
```typescript
const { data: role } = await supabase.rpc('get_user_enterprise_role', {
  p_user_id: userId,
  p_enterprise_id: enterpriseId
});

// role = 'owner' | 'admin' | null
```

---

### 3. get_user_enterprises

**Назначение:** Получить список предприятий пользователя

```sql
CREATE OR REPLACE FUNCTION get_user_enterprises(p_user_id UUID)
RETURNS TABLE (
  enterprise_id UUID,
  enterprise_name TEXT,
  role_name TEXT,
  is_owner BOOLEAN,
  status TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  -- Предприятия где пользователь owner
  SELECT 
    e.id as enterprise_id,
    e.name as enterprise_name,
    'owner'::TEXT as role_name,
    TRUE as is_owner,
    e.status as status
  FROM enterprises e
  WHERE e.owner_user_id = p_user_id
    AND e.deleted_at IS NULL
    AND e.status = 'active'
  
  UNION
  
  -- Предприятия где пользователь member
  SELECT 
    e.id as enterprise_id,
    e.name as enterprise_name,
    r.name as role_name,
    FALSE as is_owner,
    e.status as status
  FROM enterprises e
  JOIN enterprise_memberships em ON e.id = em.enterprise_id
  JOIN roles r ON em.role_id = r.id
  WHERE em.user_id = p_user_id
    AND em.status = 'active'
    AND e.deleted_at IS NULL
    AND e.status = 'active'
  
  ORDER BY enterprise_name;
$$;
```

**Возвращает таблицу:**
```typescript
interface EnterpriseAccess {
  enterprise_id: string;
  enterprise_name: string;
  role_name: string;  // 'owner' | 'admin'
  is_owner: boolean;
  status: string;
}
```

**Использование:**
```typescript
const { data: enterprises } = await supabase.rpc('get_user_enterprises', {
  p_user_id: userId
});

// enterprises = [
//   { enterprise_id: 'uuid1', enterprise_name: 'Company A', role_name: 'owner', is_owner: true },
//   { enterprise_id: 'uuid2', enterprise_name: 'Company B', role_name: 'admin', is_owner: false }
// ]
```

---

## Seed данные

### 1. Создание permissions

```sql
-- File: supabase/migrations/20260114000001_seed_permissions.sql

-- Базовые permissions для Этапа 1
-- ⚠️ Список будет дорабатываться!

INSERT INTO permissions (code, description) VALUES
  -- Documents
  ('documents:read', 'View documents'),
  ('documents:create', 'Create new documents'),
  ('documents:update', 'Update draft documents'),
  ('documents:delete', 'Delete draft documents'),
  ('documents:post', 'Post documents to ledger'),
  ('documents:void', 'Void posted documents'),
  
  -- Periods
  ('periods:read', 'View accounting periods'),
  ('periods:create', 'Create new periods'),
  ('periods:close', 'Close accounting periods'),
  ('periods:reopen', 'Reopen closed periods'),
  
  -- Enterprise
  ('enterprise:read', 'View enterprise settings'),
  ('enterprise:update', 'Update enterprise settings'),
  ('enterprise:members', 'Manage enterprise members'),
  ('enterprise:delete', 'Delete/archive enterprise'),
  
  -- Bank
  ('bank:read', 'View bank accounts and transactions'),
  ('bank:import', 'Import bank statements'),
  ('bank:reconcile', 'Reconcile bank transactions'),
  ('bank:allocate', 'Allocate bank payments to documents'),
  
  -- Inventory
  ('inventory:read', 'View inventory and stock levels'),
  ('inventory:create', 'Create inventory operations'),
  ('inventory:manage', 'Manage inventory points'),
  ('inventory:count', 'Perform stock counting'),
  ('inventory:reserve', 'Create and manage reservations'),
  
  -- Reports
  ('reports:view', 'View financial reports'),
  ('reports:export', 'Export reports to PDF/Excel'),
  ('reports:custom', 'Create custom reports'),
  
  -- Counterparties
  ('counterparties:read', 'View counterparties'),
  ('counterparties:create', 'Create counterparties'),
  ('counterparties:update', 'Update counterparties'),
  ('counterparties:delete', 'Delete counterparties'),
  
  -- Products
  ('products:read', 'View products catalog'),
  ('products:create', 'Create products'),
  ('products:update', 'Update products'),
  ('products:delete', 'Delete products'),
  
  -- Tax
  ('tax:read', 'View tax information'),
  ('tax:configure', 'Configure tax profiles'),
  ('tax:reports', 'Generate tax reports'),
  
  -- Recurring
  ('recurring:read', 'View recurring operations'),
  ('recurring:create', 'Create recurring templates'),
  ('recurring:execute', 'Execute recurring operations')
ON CONFLICT (code) DO NOTHING;
```

### 2. Создание unlimited плана

```sql
-- File: supabase/migrations/20260114000002_seed_subscription_plans.sql

INSERT INTO subscription_plans (
  code,
  name_i18n_key,
  description_i18n_key,
  price_monthly,
  price_yearly,
  trial_days,
  is_active
) VALUES (
  'unlimited',
  'plans.unlimited.name',
  'plans.unlimited.description',
  0.00,
  0.00,
  0,
  TRUE
) ON CONFLICT (code) DO NOTHING;
```

### 3. Создание первого system admin

```sql
-- File: supabase/migrations/20260114000003_seed_first_admin.sql

-- ⚠️ ВАЖНО: Замените email на реальный!

UPDATE users 
SET is_system_admin = TRUE 
WHERE email = 'admin@oblikflow.com';

-- Если пользователь еще не зарегистрирован, эта миграция не сработает.
-- После регистрации admin@oblikflow.com выполните эту миграцию вручную.
```

---

## RLS Policies

### Для таблицы enterprises

```sql
-- Политика: пользователь видит только свои предприятия
CREATE POLICY enterprises_access_policy ON enterprises
  FOR SELECT
  USING (
    -- Owner
    owner_user_id = auth.uid()
    OR
    -- Member
    id IN (
      SELECT enterprise_id 
      FROM enterprise_memberships 
      WHERE user_id = auth.uid() 
        AND status = 'active'
    )
    OR
    -- System admin
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
        AND is_system_admin = TRUE
    )
  );

-- Политика: создание предприятия доступно всем авторизованным
CREATE POLICY enterprises_create_policy ON enterprises
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Политика: изменение только для owner/admin
CREATE POLICY enterprises_update_policy ON enterprises
  FOR UPDATE
  USING (
    -- Owner
    owner_user_id = auth.uid()
    OR
    -- Admin
    id IN (
      SELECT em.enterprise_id
      FROM enterprise_memberships em
      JOIN roles r ON em.role_id = r.id
      WHERE em.user_id = auth.uid()
        AND r.name = 'admin'
        AND em.status = 'active'
    )
    OR
    -- System admin
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
        AND is_system_admin = TRUE
    )
  );
```

### Для таблицы enterprise_memberships

```sql
-- Политика: видят owner и admin
CREATE POLICY memberships_select_policy ON enterprise_memberships
  FOR SELECT
  USING (
    -- Owner предприятия
    enterprise_id IN (
      SELECT id FROM enterprises 
      WHERE owner_user_id = auth.uid()
    )
    OR
    -- Admin предприятия
    enterprise_id IN (
      SELECT em.enterprise_id
      FROM enterprise_memberships em
      JOIN roles r ON em.role_id = r.id
      WHERE em.user_id = auth.uid()
        AND r.name = 'admin'
        AND em.status = 'active'
    )
    OR
    -- System admin
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
        AND is_system_admin = TRUE
    )
    OR
    -- Сам пользователь может видеть свои memberships
    user_id = auth.uid()
  );

-- Политика: управление только для owner/admin
CREATE POLICY memberships_insert_policy ON enterprise_memberships
  FOR INSERT
  WITH CHECK (
    enterprise_id IN (
      SELECT id FROM enterprises 
      WHERE owner_user_id = auth.uid()
    )
    OR
    enterprise_id IN (
      SELECT em.enterprise_id
      FROM enterprise_memberships em
      JOIN roles r ON em.role_id = r.id
      WHERE em.user_id = auth.uid()
        AND r.name = 'admin'
        AND em.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
        AND is_system_admin = TRUE
    )
  );

-- Политика: удаление только для owner/admin (но не owner предприятия)
CREATE POLICY memberships_delete_policy ON enterprise_memberships
  FOR DELETE
  USING (
    -- НЕ owner предприятия (owner нельзя удалить)
    enterprise_id NOT IN (
      SELECT id FROM enterprises 
      WHERE owner_user_id = user_id
    )
    AND
    (
      -- Управление от owner
      enterprise_id IN (
        SELECT id FROM enterprises 
        WHERE owner_user_id = auth.uid()
      )
      OR
      -- Управление от admin
      enterprise_id IN (
        SELECT em.enterprise_id
        FROM enterprise_memberships em
        JOIN roles r ON em.role_id = r.id
        WHERE em.user_id = auth.uid()
          AND r.name = 'admin'
          AND em.status = 'active'
      )
      OR
      -- System admin
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
          AND is_system_admin = TRUE
      )
    )
  );
```

---

## Миграции Supabase

### Порядок выполнения

```
1. 20260114000001_seed_permissions.sql
   └─ Создание базовых permissions

2. 20260114000002_seed_subscription_plans.sql
   └─ Создание unlimited плана

3. 20260114000003_seed_first_admin.sql
   └─ Назначение первого system admin

4. 20260114000004_rpc_functions.sql
   └─ Создание RPC функций

5. 20260114000005_rls_policies.sql
   └─ Настройка RLS policies
```

### Полный файл с RPC функциями

```sql
-- File: supabase/migrations/20260114000004_rpc_functions.sql

-- ====================================
-- RPC функции для системы авторизации
-- ====================================

-- 1. Проверка system admin
CREATE OR REPLACE FUNCTION is_system_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COALESCE(is_system_admin, FALSE)
  FROM users
  WHERE id = user_uuid;
$$;

-- 2. Получение роли в предприятии
CREATE OR REPLACE FUNCTION get_user_enterprise_role(
  p_user_id UUID,
  p_enterprise_id UUID
)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 'owner'
  FROM enterprises
  WHERE id = p_enterprise_id 
    AND owner_user_id = p_user_id
    AND deleted_at IS NULL
    AND status = 'active'
  
  UNION
  
  SELECT r.name
  FROM enterprise_memberships em
  JOIN roles r ON em.role_id = r.id
  WHERE em.user_id = p_user_id 
    AND em.enterprise_id = p_enterprise_id
    AND em.status = 'active'
  
  LIMIT 1;
$$;

-- 3. Получение списка предприятий пользователя
CREATE OR REPLACE FUNCTION get_user_enterprises(p_user_id UUID)
RETURNS TABLE (
  enterprise_id UUID,
  enterprise_name TEXT,
  role_name TEXT,
  is_owner BOOLEAN,
  status TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    e.id as enterprise_id,
    e.name as enterprise_name,
    'owner'::TEXT as role_name,
    TRUE as is_owner,
    e.status as status
  FROM enterprises e
  WHERE e.owner_user_id = p_user_id
    AND e.deleted_at IS NULL
    AND e.status = 'active'
  
  UNION
  
  SELECT 
    e.id as enterprise_id,
    e.name as enterprise_name,
    r.name as role_name,
    FALSE as is_owner,
    e.status as status
  FROM enterprises e
  JOIN enterprise_memberships em ON e.id = em.enterprise_id
  JOIN roles r ON em.role_id = r.id
  WHERE em.user_id = p_user_id
    AND em.status = 'active'
    AND e.deleted_at IS NULL
    AND e.status = 'active'
  
  ORDER BY enterprise_name;
$$;
```

---

## Связанные документы

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Общая архитектура
- [ROLES_SYSTEM_ETAP1.md](./ROLES_SYSTEM_ETAP1.md) - Система ролей
- [PERMISSIONS_ETAP1.md](./PERMISSIONS_ETAP1.md) - Система permissions
- [IMPLEMENTATION_PLAN_ETAP1.md](./IMPLEMENTATION_PLAN_ETAP1.md) - План реализации

---

**Статус:** ✅ Готово для реализации  
**Дата:** 14 января 2026  
**Версия:** 1.0
