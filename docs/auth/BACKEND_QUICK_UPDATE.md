# 🔴 КРИТИЧНО: Обновление для бэкенда

**Дата:** 14 января 2026

---

## 🎯 Главное изменение

### Owner ДОЛЖЕН быть в `enterprise_memberships`

```sql
-- ✅ Правильно
enterprises.owner_user_id = user_id
+ 
enterprise_memberships (role='owner', user_id=user_id)

-- ❌ Неправильно
Только enterprises.owner_user_id (БЕЗ membership)
```

---

## 📝 При создании предприятия:

```typescript
// 1. Создать enterprise
const enterprise = { owner_user_id: userId, ... };

// 2. Создать роли 'owner' и 'admin'

// 3. Назначить ВСЕ permissions обеим ролям

// 4. ✅ ДОБАВИТЬ owner в memberships!
await db.enterprise_memberships.create({
  enterprise_id: enterprise.id,
  user_id: userId,
  role_id: ownerRoleId, // ← Роль 'owner'
  status: 'active'
});
```

---

## ✅ Преимущества:

- Простые JOIN запросы (без UNION)
- Единая логика для owner и admin
- Owner в списке `/members`

---

## 📚 Полные детали:

1. **[BACKEND_HEADERS_GUIDE.md](./BACKEND_HEADERS_GUIDE.md)** - Как передаются токены
2. **[BACKEND_API_SPEC.md](./BACKEND_API_SPEC.md)** - 7 endpoints
3. **[BACKEND_UPDATE_OWNER_MEMBERSHIP.md](./BACKEND_UPDATE_OWNER_MEMBERSHIP.md)** - Полное объяснение

---

**Начать с:** BACKEND_HEADERS_GUIDE.md → BACKEND_API_SPEC.md
