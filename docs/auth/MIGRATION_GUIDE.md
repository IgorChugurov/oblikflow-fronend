# Руководство по миграциям Supabase

**Дата:** 14 января 2026  
**Назначение:** Пошаговое руководство по настройке БД

---

## Содержание

1. [Подготовка](#подготовка)
2. [Создание миграций](#создание-миграций)
3. [Применение миграций](#применение-миграций)
4. [Проверка результатов](#проверка-результатов)
5. [Troubleshooting](#troubleshooting)

---

## Подготовка

### 1. Установка Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Или через npm
npm install -g supabase
```

### 2. Инициализация проекта

```bash
# В корне monorepo
supabase init

# Это создаст:
# supabase/
#   config.toml
#   seed.sql
#   migrations/
```

### 3. Связь с Supabase проектом

```bash
# Login в Supabase
supabase login

# Связь с проектом
supabase link --project-ref your-project-ref
```

---

## Создание миграций

### Порядок создания (важно!)

Миграции должны выполняться в строгом порядке:

```
1. 20260114000001_seed_permissions.sql
2. 20260114000002_seed_subscription_plans.sql
3. 20260114000003_seed_first_admin.sql
4. 20260114000004_rpc_functions.sql
5. 20260114000005_rls_policies.sql
```

### Файл 1: Permissions

```bash
# Создать файл
touch supabase/migrations/20260114000001_seed_permissions.sql
```

```sql
-- supabase/migrations/20260114000001_seed_permissions.sql

-- ====================================
-- БАЗОВЫЕ PERMISSIONS
-- ====================================
-- ⚠️ Этот список будет расширяться!

-- Documents
INSERT INTO permissions (code, description) VALUES
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

-- Проверка
SELECT COUNT(*) as permissions_count FROM permissions;
-- Должно быть ~40
```

### Файл 2: Subscription Plans

```bash
touch supabase/migrations/20260114000002_seed_subscription_plans.sql
```

```sql
-- supabase/migrations/20260114000002_seed_subscription_plans.sql

-- ====================================
-- UNLIMITED ПЛАН (Этап 1)
-- ====================================

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

-- Проверка
SELECT * FROM subscription_plans WHERE code = 'unlimited';
```

### Файл 3: First Admin

```bash
touch supabase/migrations/20260114000003_seed_first_admin.sql
```

```sql
-- supabase/migrations/20260114000003_seed_first_admin.sql

-- ====================================
-- СОЗДАНИЕ ПЕРВОГО SYSTEM ADMIN
-- ====================================

-- ⚠️ ВАЖНО: Замените email на реальный!
-- Этот email должен быть зарегистрирован в системе

-- Если пользователь еще не зарегистрирован:
-- 1. Зарегистрируйтесь через site/signup
-- 2. Подтвердите email
-- 3. Затем выполните эту миграцию

UPDATE users 
SET is_system_admin = TRUE 
WHERE email = 'admin@oblikflow.com';

-- Проверка
SELECT email, is_system_admin 
FROM users 
WHERE is_system_admin = TRUE;
```

### Файл 4: RPC Functions

```bash
touch supabase/migrations/20260114000004_rpc_functions.sql
```

```sql
-- supabase/migrations/20260114000004_rpc_functions.sql

-- ====================================
-- RPC ФУНКЦИИ ДЛЯ АВТОРИЗАЦИИ
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

-- Проверка
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('is_system_admin', 'get_user_enterprise_role', 'get_user_enterprises');
-- Должно показать 3 функции
```

### Файл 5: RLS Policies

```bash
touch supabase/migrations/20260114000005_rls_policies.sql
```

```sql
-- supabase/migrations/20260114000005_rls_policies.sql

-- ====================================
-- RLS POLICIES
-- ====================================

-- Включаем RLS
ALTER TABLE enterprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────
-- ENTERPRISES POLICIES
-- ────────────────────────────────────

-- SELECT: видят owner, members и superadmin
CREATE POLICY enterprises_select_policy ON enterprises
  FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR
    id IN (
      SELECT enterprise_id 
      FROM enterprise_memberships 
      WHERE user_id = auth.uid() 
        AND status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
        AND is_system_admin = TRUE
    )
  );

-- INSERT: любой авторизованный может создать
CREATE POLICY enterprises_insert_policy ON enterprises
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: только owner/admin/superadmin
CREATE POLICY enterprises_update_policy ON enterprises
  FOR UPDATE
  USING (
    owner_user_id = auth.uid()
    OR
    id IN (
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

-- DELETE: только owner/superadmin
CREATE POLICY enterprises_delete_policy ON enterprises
  FOR DELETE
  USING (
    owner_user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
        AND is_system_admin = TRUE
    )
  );

-- ────────────────────────────────────
-- ENTERPRISE_MEMBERSHIPS POLICIES
-- ────────────────────────────────────

-- SELECT: видят owner, admin, superadmin и сам пользователь
CREATE POLICY memberships_select_policy ON enterprise_memberships
  FOR SELECT
  USING (
    user_id = auth.uid() -- Сам пользователь видит свои memberships
    OR
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

-- INSERT: только owner/admin/superadmin
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

-- DELETE: только owner/admin/superadmin (но не owner предприятия)
CREATE POLICY memberships_delete_policy ON enterprise_memberships
  FOR DELETE
  USING (
    -- НЕ owner (owner удалить нельзя через memberships)
    enterprise_id NOT IN (
      SELECT id FROM enterprises 
      WHERE owner_user_id = user_id
    )
    AND
    (
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
    )
  );

-- ────────────────────────────────────
-- ROLES POLICIES
-- ────────────────────────────────────

-- Роли видны членам предприятия
CREATE POLICY roles_select_policy ON roles
  FOR SELECT
  USING (
    enterprise_id IN (
      SELECT id FROM enterprises 
      WHERE owner_user_id = auth.uid()
    )
    OR
    enterprise_id IN (
      SELECT em.enterprise_id
      FROM enterprise_memberships em
      WHERE em.user_id = auth.uid()
        AND em.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
        AND is_system_admin = TRUE
    )
  );

-- Проверка
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('enterprises', 'enterprise_memberships', 'roles');
```

---

## Применение миграций

### Локальная разработка

```bash
# Запустить локальный Supabase
supabase start

# Применить все миграции
supabase db push

# Или применить конкретную миграцию
supabase migration up --file 20260114000001_seed_permissions.sql
```

### Production

```bash
# Связаться с production проектом
supabase link --project-ref your-production-ref

# Применить миграции
supabase db push

# Или через Supabase Dashboard:
# Dashboard → Database → Migrations → Run Migration
```

---

## Проверка результатов

### 1. Проверка permissions

```sql
-- В Supabase SQL Editor
SELECT COUNT(*) as total FROM permissions;
-- Ожидается: ~40

SELECT code FROM permissions ORDER BY code;
-- Должен показать список всех permissions
```

### 2. Проверка subscription plan

```sql
SELECT * FROM subscription_plans WHERE code = 'unlimited';
-- Должна быть 1 запись
```

### 3. Проверка system admin

```sql
SELECT email, is_system_admin 
FROM users 
WHERE is_system_admin = TRUE;
-- Должен показать вашего admin
```

### 4. Проверка RPC функций

```sql
-- Проверка is_system_admin
SELECT is_system_admin('user-uuid-here');
-- Должно вернуть TRUE для admin

-- Проверка get_user_enterprises
SELECT * FROM get_user_enterprises('user-uuid-here');
-- Должно вернуть список предприятий
```

### 5. Проверка RLS policies

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE tablename IN ('enterprises', 'enterprise_memberships', 'roles')
ORDER BY tablename, policyname;
-- Должно показать все policies
```

---

## Troubleshooting

### Ошибка: "permission denied for table permissions"

**Причина:** RLS включен, но нет policies

**Решение:**
```sql
-- Временно выключить RLS для заполнения
ALTER TABLE permissions DISABLE ROW LEVEL SECURITY;

-- Вставить данные
INSERT INTO permissions ...

-- Включить обратно
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
```

### Ошибка: "function get_user_enterprise_role does not exist"

**Причина:** Миграция с RPC функциями не применилась

**Решение:**
```bash
# Проверить статус миграций
supabase migration list

# Применить конкретную миграцию
supabase migration up --file 20260114000004_rpc_functions.sql
```

### Ошибка: "user not found" при создании first admin

**Причина:** Пользователь еще не зарегистрирован

**Решение:**
1. Зарегистрируйтесь через site/signup
2. Подтвердите email
3. Затем выполните миграцию вручную:
   ```sql
   UPDATE users 
   SET is_system_admin = TRUE 
   WHERE email = 'your-admin@email.com';
   ```

### Миграции не применяются

**Проверка:**
```bash
# Статус миграций
supabase migration list

# Проверка подключения
supabase projects list

# Проверка активного проекта
cat .supabase/config.toml | grep project_id
```

---

## Генерация TypeScript типов

После применения миграций сгенерируйте типы:

```bash
# Генерация типов из БД
supabase gen types typescript --project-id your-project-ref > shared/lib/supabase/types.ts

# Или для локальной БД
supabase gen types typescript --local > shared/lib/supabase/types.ts
```

---

## Связанные документы

- [DATABASE_SCHEMA_ETAP1.md](./DATABASE_SCHEMA_ETAP1.md) - Полная схема БД
- [IMPLEMENTATION_PLAN_ETAP1.md](./IMPLEMENTATION_PLAN_ETAP1.md) - План реализации

---

**Дата:** 14 января 2026  
**Версия:** 1.0
