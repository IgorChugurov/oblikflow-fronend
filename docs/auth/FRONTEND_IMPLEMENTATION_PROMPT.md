# Промпт для реализации авторизации (Этап 1) - Frontend

**Дата:** 14 января 2026  
**Проект:** OBLIKflow Frontend  
**Задача:** Реализация авторизации через Supabase для Next.js монорепо

---

## 🎯 Контекст проекта

### Структура проекта

Next.js монорепо с 4 приложениями на разных поддоменах:

- **site** (`site.oblikflow.com`) - публичный сайт + авторизация
- **admin** (`admin.oblikflow.com`) - дашборд со списком предприятий
- **workspace** (`workspace.oblikflow.com`) - рабочее пространство предприятия
- **platform** (`platform.oblikflow.com`) - админ-панель для superAdmin

### Технологии

- Next.js 14+ (App Router)
- Supabase Auth (авторизация)
- NestJS Backend (бизнес-логика API)
- TypeScript
- Turborepo

---

## ✅ Что согласовано

### Архитектурные решения

1. **Auth:** Supabase Auth напрямую (фронтенд → Supabase)
2. **Бизнес-логика:** ВСЕ через NestJS API (НЕТ Server Actions)
3. **JWT:** Передается в `Authorization: Bearer` header
4. **Multi-tenancy:** `X-Enterprise-ID` header из cookie
5. **Проверка ролей:** RPC functions через Supabase
6. **Автовыбор предприятия:** Фронтенд middleware в workspace

### Этап 1 - Что реализуем

✅ **Авторизация только на `site`:**
- Login, Signup, Password Reset
- Email verification
- Google OAuth
- Redirect неавторизованных с других поддоменов на `site/login`

✅ **Система ролей (упрощенная):**
- **Global:** `users.is_system_admin` (superAdmin)
- **Enterprise:** `owner` (в enterprises.owner_user_id + enterprise_memberships)
- **Enterprise:** `admin` (в enterprise_memberships)

✅ **Функционал:**
- Регистрация и логин
- Список предприятий в `/admin`
- Создание нового предприятия
- Управление admin'ами предприятия
- Автовыбор предприятия в workspace
- SuperAdmin доступ к platform

❌ **НЕ реализуем на Этапе 1:**
- Авторизация на всех поддоменах (только на site)
- Приглашения по email
- Кастомные роли и детальные permissions
- Onboarding, notifications, audit log
- Subscriptions и биллинг

---

## 🔑 Ключевые технические решения

### 1. Cookies для cross-subdomain

**Production (домены):**
```typescript
// sb-xxx-auth-token (Supabase, автоматически)
domain: '.oblikflow.com'
httpOnly: true
secure: true

// current_enterprise_id (наша кука)
domain: '.oblikflow.com'
httpOnly: false
path: '/'
```

**Development (localhost):**
```typescript
// Используем localStorage/sessionStorage
// Cookie не работает на localhost с разными портами
```

---

### 2. JWT в API запросах

```typescript
// Получить токен
const { data: { session } } = await supabase.auth.getSession();
const jwt = session?.access_token;

// Каждый API запрос
fetch(`${BACKEND_URL}/api/enterprises`, {
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'X-Enterprise-ID': getCookie('current_enterprise_id'),
    'Content-Type': 'application/json'
  }
});
```

---

### 3. Middleware для каждого приложения

**site/middleware.ts:**
- Обновление токена через `supabase.auth.getUser()`
- Redirect авторизованных с `/login` на `/admin`

**admin/middleware.ts:**
- Проверка авторизации → redirect на `site/login`
- Проверка email verification
- Доступ для всех авторизованных пользователей

**workspace/middleware.ts:**
- Проверка авторизации → redirect на `site/login`
- Проверка email verification
- **Автовыбор предприятия** если нет cookie:
  1. Если 1 предприятие → выбрать его
  2. Иначе приоритет: owner > admin > first
  3. Если нет предприятий → redirect на `/admin`

**platform/middleware.ts:**
- Проверка авторизации → redirect на `site/login`
- Проверка `is_system_admin` → redirect на `/admin` если нет прав

---

### 4. Owner в двух местах (ВАЖНО!)

```
Owner хранится:
1. enterprises.owner_user_id (для быстрого доступа)
2. enterprise_memberships с ролью 'owner' (для единообразия)

При создании предприятия бэкенд создает ОБА!
```

Это упрощает все запросы (JOIN вместо UNION).

---

### 5. RPC Functions (Supabase)

Фронтенд использует для UI-логики:

```typescript
// Проверка superAdmin
const { data } = await supabase.rpc('is_system_admin', {
  user_uuid: userId
});

// Получить роль в предприятии
const { data: role } = await supabase.rpc('get_user_enterprise_role', {
  p_user_id: userId,
  p_enterprise_id: enterpriseId
});

// Получить список предприятий
const { data: enterprises } = await supabase.rpc('get_user_enterprises', {
  p_user_id: userId
});
```

---

## 📋 API Endpoints (бэкенд готовит)

### Enterprises

1. `GET /api/enterprises` - список предприятий пользователя
2. `POST /api/enterprises` - создать предприятие
3. `GET /api/enterprises/:id` - детали предприятия
4. `PATCH /api/enterprises/:id` - обновить настройки

### Members

5. `GET /api/enterprises/:id/members` - список членов (включая owner!)
6. `POST /api/enterprises/:id/members` - добавить admin
7. `DELETE /api/enterprises/:id/members/:userId` - удалить admin

---

## 📚 Документация

Вся документация в `/docs/auth/`:

**Для фронтенда:**
1. **README.md** - навигация и FAQ
2. **ARCHITECTURE.md** - архитектура, middleware, user flows
3. **ROLES_SYSTEM_ETAP1.md** - система ролей
4. **PERMISSIONS_ETAP1.md** - базовые permissions
5. **DATABASE_SCHEMA_ETAP1.md** - схема БД, RPC functions
6. **UI_UX_FLOWS_ETAP1.md** - детальные user flows
7. **IMPLEMENTATION_PLAN_ETAP1.md** - чеклист реализации ⭐
8. **CODE_EXAMPLES.md** - готовые примеры кода
9. **API_CONTRACT.md** - контракт с бэкендом

**Для бэкенда (уже выдано):**
- BACKEND_HEADERS_GUIDE.md
- BACKEND_API_SPEC.md
- BACKEND_UPDATE_OWNER_MEMBERSHIP.md

---

## 🚀 С чего начать

### Фаза 1: Supabase и Auth компоненты (site)

1. Настроить Supabase client в `packages/shared`
2. Создать auth компоненты:
   - LoginForm
   - SignupForm
   - PasswordResetForm
   - GoogleOAuthButton
3. Создать страницы в `site`:
   - `/login`
   - `/signup`
   - `/reset-password`
   - `/verify-email`
4. Middleware для `site`

### Фаза 2: Admin приложение

1. Middleware для `admin`
2. Страница `/admin` со списком предприятий
3. Страница `/admin/enterprises/new` (создание)
4. Страница `/admin/enterprises/[id]/settings`
5. Страница `/admin/enterprises/[id]/members`

### Фаза 3: Workspace приложение

1. Middleware для `workspace` с автовыбором
2. Layout с EnterpriseProvider (context)
3. Placeholder страницы

### Фаза 4: Platform приложение

1. Middleware для `platform`
2. SuperAdmin проверка
3. Placeholder страницы

---

## 🔧 Структура shared пакетов

```
packages/
├── shared/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       # Supabase client
│   │   │   ├── server.ts       # Server-side client
│   │   │   └── middleware.ts   # Middleware helpers
│   │   ├── api/
│   │   │   ├── client.ts       # API client для NestJS
│   │   │   └── types.ts        # API types
│   │   └── hooks/
│   │       ├── useUser.ts
│   │       ├── useEnterprises.ts
│   │       └── useRole.ts
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   └── GoogleOAuthButton.tsx
│   │   └── ui/                 # shadcn/ui компоненты
│   └── types/
│       ├── auth.ts
│       ├── enterprise.ts
│       └── api.ts
```

---

## 📝 Environment Variables

### Site, Admin, Workspace, Platform

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Backend
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
# или для production: https://api.oblikflow.com

# Domains
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
NEXT_PUBLIC_WORKSPACE_URL=http://localhost:3002
NEXT_PUBLIC_PLATFORM_URL=http://localhost:3003

# Cookies (production)
NEXT_PUBLIC_COOKIE_DOMAIN=.oblikflow.com
```

---

## 🎯 Приоритеты реализации

### Must Have (MVP):

1. ✅ Login/Signup на site
2. ✅ Email verification
3. ✅ Google OAuth
4. ✅ Список предприятий в admin
5. ✅ Создание предприятия
6. ✅ Управление admin'ами
7. ✅ Автовыбор предприятия в workspace
8. ✅ SuperAdmin доступ к platform

### Should Have:

9. ⭐ Password reset
10. ⭐ User profile (email, name)
11. ⭐ Enterprise settings (name, currency)

### Nice to Have (можно на Этап 2):

- Красивый UI/UX
- Loading states
- Error boundaries
- Toast notifications

---

## ⚠️ Важные моменты

### 1. НЕТ Server Actions для бизнес-логики

```typescript
// ❌ Неправильно
'use server'
export async function createEnterprise() {
  // бизнес-логика
}

// ✅ Правильно
async function createEnterprise() {
  const response = await fetch(`${BACKEND_URL}/api/enterprises`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
}
```

### 2. Cookie vs localStorage в development

```typescript
// Development (localhost)
if (process.env.NODE_ENV === 'development') {
  localStorage.setItem('current_enterprise_id', id);
} else {
  // Production
  document.cookie = `current_enterprise_id=${id}; domain=${COOKIE_DOMAIN}`;
}
```

### 3. Автообновление токена

```typescript
// Middleware делает это автоматически
const { data: { user } } = await supabase.auth.getUser();
// ↑ Этот вызов обновляет токен если истек
```

### 4. Owner в списке members

Бэкенд возвращает owner в массиве members:

```typescript
// GET /api/enterprises/:id/members
[
  {
    user_id: "...",
    email: "owner@example.com",
    role: "owner",      // ← Owner
    is_owner: true
  },
  {
    user_id: "...",
    email: "admin@example.com",
    role: "admin",
    is_owner: false
  }
]
```

---

## 🐛 Known Issues

1. **Cookie на localhost не работает** между портами → использовать localStorage
2. **Email verification** требует настройки redirect URL в Supabase
3. **Google OAuth** требует настройки OAuth credentials

---

## 📖 Для начала работы прочитай:

1. **IMPLEMENTATION_PLAN_ETAP1.md** - пошаговый план ⭐
2. **ARCHITECTURE.md** - архитектура и middleware
3. **CODE_EXAMPLES.md** - готовые примеры кода

---

## 💬 Промпт для нового чата

```
Привет! Мне нужно реализовать Этап 1 авторизации для Next.js монорепо 
с 4 приложениями (site, admin, workspace, platform).

Проект: OBLIKflow Frontend
Путь: /Users/igorchugurov/Documents/GitHub/OUR-pack/oblikflow/olikflow-frontend

Вся документация в /docs/auth/:
- IMPLEMENTATION_PLAN_ETAP1.md - чеклист реализации
- ARCHITECTURE.md - архитектура
- CODE_EXAMPLES.md - примеры кода

Ключевые моменты:
1. Auth через Supabase (только на site)
2. Бизнес-логика через NestJS API (НЕТ Server Actions)
3. JWT в Authorization header
4. Owner в enterprise_memberships с ролью 'owner'
5. Автовыбор предприятия в workspace

Начнем с настройки Supabase и создания auth компонентов для site?
```

---

**Готов к реализации!** 🚀
