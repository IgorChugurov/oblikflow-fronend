# Обновление: Owner в enterprise_memberships

**Дата:** 14 января 2026  
**Важность:** 🔴 Критично для реализации  
**Статус:** ✅ Финальная архитектура

---

## 🎯 Что изменилось

### ❌ Было (сложно):

```
Owner: ТОЛЬКО в enterprises.owner_user_id
Admins: enterprise_memberships + roles

Результат: UNION запросы везде
```

### ✅ Стало (просто):

```
Owner: enterprises.owner_user_id (для быстрой проверки)
       + enterprise_memberships с ролью 'owner'

Admins: enterprise_memberships с ролью 'admin'

Результат: Простые JOIN запросы
```

---

## 📊 Почему это лучше?

| Аспект | Без membership | С membership |
|--------|----------------|--------------|
| Запросы | ❌ UNION везде | ✅ Простой JOIN |
| Логика | ❌ Проверка в 2 местах | ✅ Единое место |
| RLS | ❌ Сложные policies | ✅ Простые policies |
| Риск багов | ❌ Можно забыть owner | ✅ Единообразно |

---

## 🔧 Что нужно реализовать

### 1. При создании предприятия

```typescript
async createEnterprise(dto: CreateEnterpriseDto, userId: string) {
  // 1. Создать enterprise
  const enterprise = await db.enterprises.create({
    data: {
      name: dto.name,
      country_code: dto.country_code,
      default_currency: dto.default_currency,
      owner_user_id: userId, // ← Для быстрого доступа
      status: 'active'
    }
  });

  // 2. Создать роли
  const ownerRole = await db.roles.create({
    data: { 
      enterprise_id: enterprise.id, 
      name: 'owner',
      description: 'Enterprise owner'
    }
  });
  
  const adminRole = await db.roles.create({
    data: { 
      enterprise_id: enterprise.id, 
      name: 'admin',
      description: 'Enterprise administrator'
    }
  });

  // 3. Получить ВСЕ permissions
  const permissions = await db.permissions.findMany();
  
  // 4. Назначить permissions обеим ролям
  const rolePermissions = [
    ...permissions.map(p => ({ 
      role_id: ownerRole.id, 
      permission_id: p.id 
    })),
    ...permissions.map(p => ({ 
      role_id: adminRole.id, 
      permission_id: p.id 
    }))
  ];
  
  await db.role_permissions.createMany({
    data: rolePermissions
  });

  // 5. ✅ КРИТИЧНО: Добавить owner в memberships!
  await db.enterprise_memberships.create({
    data: {
      enterprise_id: enterprise.id,
      user_id: userId,
      role_id: ownerRole.id, // ← Роль 'owner'
      status: 'active',
      created_by: userId
    }
  });

  return {
    ...enterprise,
    role: 'owner',
    is_owner: true
  };
}
```

---

### 2. GET /api/enterprises (список предприятий)

```typescript
async getUserEnterprises(userId: string) {
  // ✅ Простой JOIN вместо UNION
  const enterprises = await db.$queryRaw`
    SELECT 
      e.id,
      e.name,
      e.country_code,
      e.default_currency,
      e.status,
      r.name as role,
      (e.owner_user_id = ${userId}) as is_owner,
      e.created_at
    FROM enterprises e
    JOIN enterprise_memberships em ON e.id = em.enterprise_id
    JOIN roles r ON em.role_id = r.id
    WHERE em.user_id = ${userId}
      AND em.status = 'active'
      AND e.deleted_at IS NULL
      AND e.status = 'active'
    ORDER BY e.name
  `;

  return enterprises;
}
```

---

### 3. GET /api/enterprises/:id/members (список членов)

```typescript
async getEnterpriseMembers(enterpriseId: string) {
  // ✅ Owner в том же списке, что и admins
  const members = await db.$queryRaw`
    SELECT 
      u.id as user_id,
      u.email,
      u.name,
      r.name as role,
      (e.owner_user_id = u.id) as is_owner,
      em.status,
      em.created_at as joined_at,
      em.created_by as invited_by
    FROM enterprise_memberships em
    JOIN users u ON em.user_id = u.id
    JOIN roles r ON em.role_id = r.id
    JOIN enterprises e ON em.enterprise_id = e.id
    WHERE em.enterprise_id = ${enterpriseId}
      AND em.status = 'active'
    ORDER BY is_owner DESC, u.name
  `;

  return members;
}
```

---

### 4. Проверка доступа (Guard)

```typescript
async checkUserEnterpriseAccess(
  userId: string, 
  enterpriseId: string
): Promise<string | null> {
  // ✅ Простой запрос без UNION
  const result = await db.enterprise_memberships.findFirst({
    where: {
      user_id: userId,
      enterprise_id: enterpriseId,
      status: 'active'
    },
    include: {
      role: true,
      enterprise: true
    }
  });

  if (!result) return null;
  
  // Проверить что enterprise активно
  if (result.enterprise.status !== 'active' || result.enterprise.deleted_at) {
    return null;
  }

  return result.role.name; // 'owner' или 'admin'
}
```

---

## 🗄️ Обновленные RPC Functions

### get_user_enterprise_role

```sql
CREATE OR REPLACE FUNCTION get_user_enterprise_role(
  p_user_id UUID,
  p_enterprise_id UUID
)
RETURNS TEXT AS $$
  -- Упрощенный: owner тоже в memberships
  SELECT r.name
  FROM enterprise_memberships em
  JOIN roles r ON em.role_id = r.id
  WHERE em.user_id = p_user_id
    AND em.enterprise_id = p_enterprise_id
    AND em.status = 'active'
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;
```

---

### get_user_enterprises

```sql
CREATE OR REPLACE FUNCTION get_user_enterprises(p_user_id UUID)
RETURNS TABLE (
  enterprise_id UUID,
  enterprise_name TEXT,
  role_name TEXT,
  is_owner BOOLEAN,
  status TEXT
) AS $$
  -- Упрощенный: owner тоже в memberships
  SELECT
    e.id,
    e.name,
    r.name,
    (e.owner_user_id = p_user_id) AS is_owner,
    e.status
  FROM enterprises e
  JOIN enterprise_memberships em ON e.id = em.enterprise_id
  JOIN roles r ON em.role_id = r.id
  WHERE em.user_id = p_user_id
    AND em.status = 'active'
    AND e.deleted_at IS NULL
    AND e.status = 'active'
  ORDER BY e.name;
$$ LANGUAGE SQL SECURITY DEFINER;
```

---

## ⚠️ Зачем тогда owner_user_id?

`owner_user_id` нужен для:

### 1. Быстрая проверка "кто владелец"

```sql
-- Без JOIN (быстро!)
SELECT * FROM enterprises WHERE owner_user_id = :user_id;
```

### 2. Запрет удаления owner

```typescript
async removeMember(enterpriseId: string, userId: string) {
  const enterprise = await db.enterprises.findUnique({
    where: { id: enterpriseId }
  });

  // ✅ Простая проверка
  if (enterprise.owner_user_id === userId) {
    throw new BadRequestException('Cannot remove owner');
  }

  // Удалить membership
  await db.enterprise_memberships.delete({
    where: {
      enterprise_id_user_id: {
        enterprise_id: enterpriseId,
        user_id: userId
      }
    }
  });
}
```

### 3. Передача владения (Этап 2)

```typescript
async transferOwnership(enterpriseId: string, newOwnerId: string) {
  await db.$transaction([
    // 1. Обновить owner_user_id
    db.enterprises.update({
      where: { id: enterpriseId },
      data: { owner_user_id: newOwnerId }
    }),

    // 2. Обновить роль в membership
    db.enterprise_memberships.update({
      where: { 
        enterprise_id_user_id: {
          enterprise_id: enterpriseId,
          user_id: newOwnerId
        }
      },
      data: { role_id: ownerRoleId }
    })
  ]);
}
```

---

## ✅ Чеклист для бэкенда

### Обязательно реализовать:

- [ ] При создании enterprise создавать ДВЕ роли: 'owner' и 'admin'
- [ ] Назначать ВСЕ permissions обеим ролям
- [ ] ✅ **Добавлять owner в enterprise_memberships с ролью 'owner'**
- [ ] Использовать простые JOIN запросы (без UNION)
- [ ] Проверять `owner_user_id` при удалении членов
- [ ] В `/members` возвращать owner в общем списке

### Тестирование:

```typescript
// Тест: Owner должен быть в memberships
const members = await getEnterpriseMembers(enterpriseId);
const owner = members.find(m => m.is_owner);
expect(owner).toBeDefined();
expect(owner.role).toBe('owner');

// Тест: Owner в списке предприятий
const enterprises = await getUserEnterprises(ownerId);
expect(enterprises[0].role).toBe('owner');
expect(enterprises[0].is_owner).toBe(true);
```

---

## 📚 Обновленные документы

Следующие документы были обновлены:

1. ✅ **BACKEND_API_SPEC.md** - логика создания, SQL запросы, RPC functions
2. ✅ **BACKEND_UPDATE_OWNER_MEMBERSHIP.md** (этот документ)

Нужно обновить в бэкенд проекте:

- Database migrations
- RPC functions
- API endpoints логика

---

## 🎯 Итого

**Главное правило:** 

```
Owner ВСЕГДА в двух местах:
1. enterprises.owner_user_id (для быстрого доступа)
2. enterprise_memberships (для единообразия)
```

Это упрощает ВСЕ запросы и делает код понятнее! 🚀

---

**Вопросы?** Смотри [BACKEND_API_SPEC.md](./BACKEND_API_SPEC.md) для полных примеров.
