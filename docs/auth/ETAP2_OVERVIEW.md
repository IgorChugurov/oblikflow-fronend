# Обзор Этапа 2 - Расширенная функциональность

**Дата:** 14 января 2026  
**Статус:** 📋 План для будущей реализации

---

## Содержание

1. [Что реализуем на Этапе 2](#что-реализуем-на-этапе-2)
2. [Кастомные роли и permissions](#кастомные-роли-и-permissions)
3. [Система приглашений](#система-приглашений)
4. [Онбординг](#онбординг)
5. [Subscriptions и биллинг](#subscriptions-и-биллинг)
6. [Notifications](#notifications)
7. [Audit log](#audit-log)
8. [Soft delete предприятий](#soft-delete-предприятий)
9. [Временные оценки](#временные-оценки)

---

## Что реализуем на Этапе 2

### Цели Этапа 2

1. **Авторизация на всех поддоменах** - shared auth компоненты, login на admin/workspace/platform
2. **Полноценная система ролей** - кастомные роли с детальным управлением permissions
3. **Обычные пользователи** - бухгалтеры, складовщики с ограниченным доступом
4. **Приглашения** - email приглашения с токенами
5. **Онбординг** - guided tour для новых пользователей
6. **Subscriptions** - реальный биллинг с тарифами и лимитами
7. **Notifications** - система уведомлений
8. **Audit** - полный audit trail действий

### Отличия от Этапа 1

| Функционал                   | Этап 1 (MVP)                           | Этап 2 (Полный)                          |
| ---------------------------- | -------------------------------------- | ---------------------------------------- |
| **Роли**                     | Owner, Admin (фиксированные)           | Кастомные роли с любыми названиями       |
| **Permissions**              | Все или ничего                         | Детальный контроль по модулям            |
| **Добавление пользователей** | Напрямую (должен быть зарегистрирован) | Email приглашения с токенами             |
| **Обычные пользователи**     | Не поддерживаются                      | Полная поддержка (accountant, warehouse) |
| **Subscriptions**            | Unlimited план для всех                | Реальные тарифы, лимиты, биллинг         |
| **Приглашения**              | Нет                                    | Email с токенами, статусы                |
| **Онбординг**                | Нет                                    | Guided tour, чеклист задач               |
| **Notifications**            | Нет                                    | In-app + email уведомления               |
| **Audit**                    | Нет                                    | Полный лог действий                      |

---

## Авторизация на всех поддоменах

### Что реализуем

#### 1. Shared auth компоненты

**Вынести в shared пакет:**

```
shared/
├── components/
│   └── auth/
│       ├── LoginForm.tsx           # Форма входа
│       ├── SignupForm.tsx          # Форма регистрации
│       ├── ResetPasswordForm.tsx   # Восстановление пароля
│       └── OAuthButtons.tsx        # Google/GitHub кнопки
└── hooks/
    └── useAuth.ts                  # Auth hook
```

#### 2. Login страницы на всех поддоменах

**Добавить везде:**

- `admin/app/login/page.tsx`
- `workspace/app/login/page.tsx`
- `platform/app/login/page.tsx`

**Использование shared компонентов:**

```typescript
// admin/app/login/page.tsx
import { LoginForm } from "@/shared/components/auth/LoginForm";
import { OAuthButtons } from "@/shared/components/auth/OAuthButtons";

export default function AdminLoginPage() {
  return (
    <div>
      <h1>Sign In to Admin</h1>
      <LoginForm redirectTo="/admin" />
      <OAuthButtons providers={["google"]} redirectTo="/admin" />
    </div>
  );
}
```

#### 3. Supabase Redirect URLs

**Настроить в Supabase Dashboard:**

```
https://oblikflow.com/auth/**
https://admin.oblikflow.com/auth/**
https://workspace.oblikflow.com/auth/**
https://platform.oblikflow.com/auth/**
```

#### 4. UX улучшения

**Сценарий:**

```
User открывает workspace.oblikflow.com (из закладок)
   ↓
Не авторизован
   ↓
Показать workspace/login (НЕ redirect на site!)
   ↓
User логинится прямо там
   ↓
Остается на workspace (автовыбор предприятия)
```

**Преимущества:**

- ✅ Удобнее для пользователя (не нужно переходить на site)
- ✅ Единый UI/UX на всех поддоменах
- ✅ Поддержка deep links

---

## Кастомные роли и permissions

### Что реализуем

#### 1. UI для создания ролей

**Страница:** `admin/enterprises/[id]/roles`

```typescript
// Список ролей предприятия
┌────────────────────────────────────────────────┐
│ Roles                          [+ Create Role] │
│ ───────────────────────────────────────────────│
│                                                 │
│ ┌─────────────────────────────────────────────┐│
│ │ Owner                                       ││
│ │ Full access to everything                   ││
│ │ [System role - cannot be edited]            ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ ┌─────────────────────────────────────────────┐│
│ │ Admin                                       ││
│ │ Full access to enterprise                   ││
│ │ [System role - cannot be edited]            ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ ┌─────────────────────────────────────────────┐│
│ │ Accountant                         [Edit]   ││
│ │ Работа с документами и отчетами             ││
│ │ Permissions: 12 granted                     ││
│ │ Members: 3 users                            ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ ┌─────────────────────────────────────────────┐│
│ │ Warehouse Manager                  [Edit]   ││
│ │ Складской учет                              ││
│ │ Permissions: 8 granted                      ││
│ │ Members: 2 users                            ││
│ └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

#### 2. Форма создания роли

**Страница:** `admin/enterprises/[id]/roles/new`

```typescript
┌────────────────────────────────────────────────┐
│ Create Role                                     │
│ ───────────────────────────────────────────────│
│                                                 │
│ Name: [Бухгалтер                ]              │
│                                                 │
│ Description: [Работа с документами и отчетами] │
│                                                 │
│ Permissions:                                    │
│ ┌───────────────────────────────────────────┐  │
│ │ 📄 Documents                              │  │
│ │ [✓] View documents                        │  │
│ │ [✓] Create documents                      │  │
│ │ [✓] Update draft documents                │  │
│ │ [ ] Delete documents                      │  │
│ │ [✓] Post documents                        │  │
│ │ [ ] Void posted documents                 │  │
│ │                                           │  │
│ │ 📊 Reports                                │  │
│ │ [✓] View reports                          │  │
│ │ [✓] Export reports                        │  │
│ │ [ ] Create custom reports                 │  │
│ │                                           │  │
│ │ 🏦 Bank                                   │  │
│ │ [✓] View bank transactions                │  │
│ │ [ ] Import statements                     │  │
│ │ [✓] Reconcile transactions                │  │
│ │                                           │  │
│ │ ... (другие модули)                       │  │
│ └───────────────────────────────────────────┘  │
│                                                 │
│ [Cancel] [Create Role]                          │
└─────────────────────────────────────────────────┘
```

#### 3. Назначение кастомной роли пользователю

**Обновленная модалка добавления:**

```typescript
┌────────────────────────────────────────────────┐
│ Add Team Member                        [X]      │
│                                                 │
│ Email: [user@example.com             ]         │
│                                                 │
│ Role: [Бухгалтер                    ▼]        │
│       • Owner - Full access                    │
│       • Admin - Enterprise admin               │
│       • Бухгалтер - Работа с документами       │
│       • Warehouse Manager - Складской учет     │
│                                                 │
│ [Cancel] [Add Member]                           │
└─────────────────────────────────────────────────┘
```

#### 4. Реальная проверка permissions

```typescript
// Вместо упрощенной проверки (owner/admin = все)
// Реальная проверка через БД

export function usePermissions(enterpriseId?: string) {
  const { user } = useAuth();
  const { isOwner, isAdmin } = useRole(enterpriseId);

  return useQuery({
    queryKey: ["permissions", enterpriseId, user?.id],
    queryFn: async () => {
      // Owner/Admin - все права
      if (isOwner || isAdmin) {
        return {
          hasPermission: () => true,
          permissions: ["*"],
        };
      }

      const supabase = createClient();

      // Получить membership
      const { data: membership } = await supabase
        .from("enterprise_memberships")
        .select("role_id")
        .eq("enterprise_id", enterpriseId)
        .eq("user_id", user.id)
        .single();

      if (!membership) {
        return {
          hasPermission: () => false,
          permissions: [],
        };
      }

      // Получить permissions роли
      const { data: rolePerms } = await supabase
        .from("role_permissions")
        .select("permission:permissions(code)")
        .eq("role_id", membership.role_id);

      const permissions = rolePerms.map((rp) => rp.permission.code);

      return {
        hasPermission: (code: string) => permissions.includes(code),
        permissions,
      };
    },
  });
}
```

---

## Система приглашений

### Что реализуем

#### 1. Таблица приглашений (уже есть в БД)

```sql
CREATE TABLE user_invitations (
  id UUID PRIMARY KEY,
  enterprise_id UUID REFERENCES enterprises(id),
  email VARCHAR(255) NOT NULL,
  role_id UUID REFERENCES roles(id),
  invited_by UUID REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

#### 2. Flow приглашения

```
1. Owner/Admin отправляет приглашение
   → admin/enterprises/[id]/members → [Invite Member]

2. Форма:
   Email: [newuser@example.com]
   Role: [Accountant ▼]

3. Backend:
   → Создает запись в user_invitations
   → Генерирует уникальный token
   → Отправляет email с ссылкой

4. Email получателю:
   "You've been invited to join Company A as Accountant"
   [Accept Invitation] → site/invite/[token]

5. Получатель кликает:
   → Если НЕ зарегистрирован: Signup form (email prefilled)
   → Если зарегистрирован: Автоматическое принятие

6. После принятия:
   → Создается enterprise_membership
   → Обновляется invitation (status = accepted)
   → Redirect → admin/ (видит новое предприятие)
```

#### 3. UI компоненты

- `admin/components/InviteMemberModal.tsx` - форма приглашения
- `site/app/invite/[token]/page.tsx` - страница принятия приглашения
- `admin/app/enterprises/[id]/invitations/page.tsx` - список приглашений

#### 4. Управление приглашениями

```typescript
┌────────────────────────────────────────────────┐
│ Pending Invitations                             │
│ ───────────────────────────────────────────────│
│                                                 │
│ Email              Role      Status   Actions   │
│ ──────────────────────────────────────────────│
│ new@email.com      Accountant Pending [Resend] [Cancel] │
│ test@email.com     Warehouse  Expired [Resend]            │
│                                                 │
│ Accepted Invitations:                           │
│ user@email.com     Accountant Accepted (2 days ago)      │
└─────────────────────────────────────────────────┘
```

---

## Онбординг

### Что реализуем

#### 1. Таблица onboarding (уже есть в БД)

```sql
CREATE TABLE user_onboarding_steps (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  step_key VARCHAR(100) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

#### 2. Чеклист шагов

```typescript
const onboardingSteps = [
  { key: "create_enterprise", title: "Create your first enterprise" },
  { key: "invite_user", title: "Invite your first team member" },
  { key: "configure_settings", title: "Configure enterprise settings" },
  { key: "create_first_document", title: "Create your first document" },
  { key: "post_first_document", title: "Post your first document" },
];
```

#### 3. UI компонент

```typescript
// admin/components/OnboardingChecklist.tsx
┌────────────────────────────────────────────────┐
│ 🚀 Get Started with OblikFlow                  │
│ ───────────────────────────────────────────────│
│                                                 │
│ Complete these steps to get started:            │
│                                                 │
│ [✓] Create your first enterprise               │
│ [ ] Invite your first team member              │
│ [ ] Configure enterprise settings              │
│ [ ] Create your first document                 │
│ [ ] Post your first document                   │
│                                                 │
│ Progress: 1/5 completed                         │
│ [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━]  20% │
└─────────────────────────────────────────────────┘
```

#### 4. Guided tour

- Интеграция с библиотекой tour (например, `react-joyride`)
- Пошаговые подсказки на ключевых экранах
- Возможность пропустить или вернуться к tour позже

---

## Subscriptions и биллинг

### Что реализуем

#### 1. Реальные тарифные планы

```sql
-- Вместо только unlimited
INSERT INTO subscription_plans (code, name, price_monthly, price_yearly) VALUES
  ('free', 'Free', 0, 0),
  ('starter', 'Starter', 29, 290),
  ('professional', 'Professional', 79, 790),
  ('enterprise', 'Enterprise', 199, 1990);
```

#### 2. Лимиты по тарифам

```sql
-- subscription_plan_limits
INSERT INTO subscription_plan_limits (plan_id, limit_key, limit_value) VALUES
  -- Free plan
  (:free_plan_id, 'max_enterprises', 1),
  (:free_plan_id, 'max_users_per_enterprise', 2),
  (:free_plan_id, 'max_documents_per_month', 50),

  -- Starter plan
  (:starter_plan_id, 'max_enterprises', 3),
  (:starter_plan_id, 'max_users_per_enterprise', 5),
  (:starter_plan_id, 'max_documents_per_month', 500),

  -- Professional plan
  (:pro_plan_id, 'max_enterprises', 10),
  (:pro_plan_id, 'max_users_per_enterprise', 20),
  (:pro_plan_id, 'max_documents_per_month', 5000),

  -- Enterprise plan
  (:enterprise_plan_id, 'max_enterprises', -1), -- unlimited
  (:enterprise_plan_id, 'max_users_per_enterprise', -1),
  (:enterprise_plan_id, 'max_documents_per_month', -1);
```

#### 3. Проверка лимитов

```typescript
// При создании предприятия
export async function createEnterprise(data: EnterpriseData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Получить subscription пользователя
  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("plan:subscription_plans(limits:subscription_plan_limits(*))")
    .eq("user_id", user.id)
    .single();

  // 2. Проверить лимит max_enterprises
  const maxEnterprises = subscription.plan.limits.find(
    (l) => l.limit_key === "max_enterprises"
  )?.limit_value;

  // 3. Подсчитать текущие предприятия
  const { count } = await supabase
    .from("enterprises")
    .select("*", { count: "exact", head: true })
    .eq("owner_user_id", user.id);

  // 4. Проверить лимит
  if (maxEnterprises !== -1 && count >= maxEnterprises) {
    throw new Error("Enterprise limit reached. Upgrade your plan.");
  }

  // 5. Создать предприятие
  // ...
}
```

#### 4. Billing UI

- `admin/app/settings/billing/page.tsx` - управление подпиской
- Показ текущего плана
- Upgrade/downgrade
- История платежей
- Интеграция со Stripe

#### 5. Stripe Integration

- Webhooks для обработки событий
- `stripe_webhooks_log` таблица (уже есть в БД)
- Автоматическое обновление статуса подписки

---

## Notifications

### Что реализуем

#### 1. Типы уведомлений

```typescript
type NotificationType =
  | "quota_warning" // "You've used 90% of your document limit"
  | "subscription_expiring" // "Your subscription expires in 3 days"
  | "invitation_received" // "You've been invited to Company A"
  | "access_granted" // "You now have access to Company A"
  | "access_revoked" // "Your access to Company A has been removed"
  | "member_added" // "New member joined your enterprise"
  | "role_changed"; // "Your role has been changed to Accountant"
```

#### 2. In-app notifications

```typescript
// Компонент в header
┌────────────────────────────────────────────────┐
│ 🔔 (3)                                          │
│ ───────────────────────────────────────────────│
│                                                 │
│ ⚠️ Quota Warning                        2h ago │
│   You've used 90% of your document limit       │
│                                                 │
│ ✉️ Invitation Received                  1d ago │
│   You've been invited to Company B             │
│   [Accept] [Decline]                           │
│                                                 │
│ ✅ Access Granted                       3d ago │
│   You now have access to Company C             │
│                                                 │
│ [View All Notifications]                        │
└─────────────────────────────────────────────────┘
```

#### 3. Email notifications

- Интеграция с email сервисом (Resend, SendGrid)
- Настройки предпочтений
- Возможность отключить определенные типы

#### 4. Настройки

```typescript
// admin/app/settings/notifications/page.tsx
┌────────────────────────────────────────────────┐
│ Notification Preferences                        │
│ ───────────────────────────────────────────────│
│                                                 │
│ In-App Notifications:                           │
│ [✓] Quota warnings                             │
│ [✓] Subscription updates                       │
│ [✓] Team invitations                           │
│ [✓] Access changes                             │
│                                                 │
│ Email Notifications:                            │
│ [✓] Quota warnings                             │
│ [✓] Subscription updates                       │
│ [ ] Team invitations (disabled)                │
│ [✓] Access changes                             │
│                                                 │
│ [Save Preferences]                              │
└─────────────────────────────────────────────────┘
```

---

## Audit log

### Что реализуем

#### 1. Логирование действий

```typescript
// При важных операциях
await logAction({
  user_id: user.id,
  enterprise_id: enterpriseId,
  action: "document.posted",
  resource_type: "document",
  resource_id: documentId,
  details_json: {
    document_number: "DOC-001",
    amount: 1000,
  },
});
```

#### 2. UI для просмотра

```typescript
// admin/app/enterprises/[id]/audit/page.tsx
┌────────────────────────────────────────────────┐
│ Activity Log                                    │
│ ───────────────────────────────────────────────│
│                                                 │
│ Filters: [All Actions ▼] [All Users ▼] [Today ▼] │
│                                                 │
│ Date       User          Action         Details │
│ ──────────────────────────────────────────────│
│ 10:30 AM   igor@email    document.posted       │
│            Posted DOC-001 (Amount: $1,000)     │
│                                                 │
│ 09:15 AM   admin@email   member.added          │
│            Added user@example.com as Accountant│
│                                                 │
│ Yesterday  igor@email    period.closed         │
│            Closed period January 2026          │
│                                                 │
│ [Load More]                                     │
└─────────────────────────────────────────────────┘
```

#### 3. Login history

```typescript
// admin/app/settings/security/page.tsx
┌────────────────────────────────────────────────┐
│ Login History                                   │
│ ───────────────────────────────────────────────│
│                                                 │
│ Date       IP Address    Location    Device    │
│ ──────────────────────────────────────────────│
│ 10:30 AM   192.168.1.1   Kyiv, UA   Chrome    │
│ Yesterday  192.168.1.1   Kyiv, UA   Chrome    │
│ 2 days ago 10.0.0.1      Kyiv, UA   Safari    │
│                                                 │
│ [View All Login History]                        │
└─────────────────────────────────────────────────┘
```

---

## Soft delete предприятий

### Что реализуем

#### 1. Архивация вместо удаления

```typescript
// Вместо DELETE
export async function archiveEnterprise(enterpriseId: string) {
  const supabase = await createClient();

  await supabase
    .from("enterprises")
    .update({
      status: "inactive",
      deleted_at: new Date().toISOString(),
      retention_ends_at: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(), // +1 год
    })
    .eq("id", enterpriseId);
}
```

#### 2. UI для архивных предприятий

```typescript
// admin/app/archived/page.tsx
┌────────────────────────────────────────────────┐
│ Archived Enterprises                            │
│ ───────────────────────────────────────────────│
│                                                 │
│ Name        Archived    Retention Ends  Actions│
│ ──────────────────────────────────────────────│
│ Old Company 2025-12-01  2026-12-01     [Restore] [Delete Permanently] │
│                                                 │
│ ⚠️ Enterprises are permanently deleted after   │
│    retention period ends (1 year)              │
└─────────────────────────────────────────────────┘
```

#### 3. Восстановление

```typescript
export async function restoreEnterprise(enterpriseId: string) {
  await supabase
    .from("enterprises")
    .update({
      status: "active",
      deleted_at: null,
      retention_ends_at: null,
    })
    .eq("id", enterpriseId);
}
```

---

## Временные оценки

### По функционалам

| Функционал                 | Оценка    |
| -------------------------- | --------- |
| **Shared auth компоненты** | 2-3 дня   |
| - Вынос в shared           | 1 день    |
| - Login на всех поддоменах | 1 день    |
| - Тестирование             | 1 день    |
| **Кастомные роли**         | 5-7 дней  |
| - UI создания ролей        | 2 дня     |
| - Permissions selector     | 1 день    |
| - Реальная проверка прав   | 2 дня     |
| **Приглашения**            | 4-5 дней  |
| - Backend логика           | 1 день    |
| - Email templates          | 1 день    |
| - UI компоненты            | 2 дня     |
| **Онбординг**              | 3-4 дня   |
| - Чеклист шагов            | 2 дня     |
| - Guided tour              | 2 дня     |
| **Subscriptions**          | 7-10 дней |
| - Тарифные планы           | 1 день    |
| - Проверка лимитов         | 2 дня     |
| - Billing UI               | 2 дня     |
| - Stripe integration       | 3 дня     |
| **Notifications**          | 5-6 дней  |
| - Backend                  | 2 дня     |
| - In-app UI                | 2 дня     |
| - Email integration        | 2 дня     |
| **Audit log**              | 3-4 дня   |
| - Логирование              | 1 день    |
| - UI просмотра             | 2 дня     |
| **Soft delete**            | 2-3 дня   |
| - Backend логика           | 1 день    |
| - UI архива                | 1 день    |

**ИТОГО:** ~33-45 дней работы

---

## Приоритизация

### Must Have (Этап 2.1)

1. ✅ **Shared auth компоненты** - удобство, единый UX
2. ✅ **Кастомные роли** - критично для обычных пользователей
3. ✅ **Приглашения** - удобство добавления пользователей
4. ✅ **Реальная проверка permissions** - безопасность

### Should Have (Этап 2.2)

5. ✅ **Subscriptions и лимиты** - монетизация
6. ✅ **Notifications** - улучшение UX

### Nice to Have (Этап 2.3)

7. ✅ **Онбординг** - улучшение UX для новых пользователей
8. ✅ **Audit log** - compliance
9. ✅ **Soft delete** - безопасность данных

---

## Связанные документы

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Общая архитектура
- [ROLES_SYSTEM_ETAP1.md](./ROLES_SYSTEM_ETAP1.md) - Система ролей Этап 1
- [IMPLEMENTATION_PLAN_ETAP1.md](./IMPLEMENTATION_PLAN_ETAP1.md) - План Этапа 1

---

**Статус:** 📋 План для будущей реализации  
**Дата:** 14 января 2026  
**Версия:** 1.0
