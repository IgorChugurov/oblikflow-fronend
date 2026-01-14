# API Contract - Фронтенд ↔ Бэкенд

**Дата:** 14 января 2026  
**Версия:** 1.0 (Этап 1 MVP)  
**Статус:** ✅ Утверждено

---

## ✅ Подтвержденные решения

1. **Auth:** Supabase напрямую (фронтенд → Supabase Auth, бэкенд валидирует JWT)
2. **Проверка ролей:** RPC functions через Supabase для простых проверок
3. **Multi-tenancy:** `X-Enterprise-ID` header (из cookie `current_enterprise_id`)
4. **Автовыбор предприятия:** Фронтенд middleware

---

## Содержание

1. [Архитектура взаимодействия](#архитектура-взаимодействия)
2. [Авторизация и JWT](#авторизация-и-jwt)
3. [API Endpoints - Enterprises](#api-endpoints---enterprises)
4. [API Endpoints - Members](#api-endpoints---members)
5. [TypeScript интерфейсы](#typescript-интерфейсы)
6. [User Flows с API](#user-flows-с-api)
7. [Edge Cases](#edge-cases)
8. [MVP Приоритеты](#mvp-приоритеты)

---

## Архитектура взаимодействия

### Разделение ответственности

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js)                         │
│  Ответственность:                                            │
│  ✅ Рендеринг HTML                                           │
│  ✅ Авторизация через Supabase Auth                          │
│  ✅ Управление JWT токенами                                  │
│  ✅ Middleware проверка токенов                              │
│  ✅ Автовыбор предприятия (client-side логика)               │
│  ❌ НЕТ Server Actions для бизнес-логики                     │
│  ❌ НЕТ прямого доступа к БД (кроме Supabase Auth)           │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                            JWT Token в headers
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (NestJS)                           │
│  Ответственность:                                            │
│  ✅ Все API endpoints для бизнес-логики                      │
│  ✅ Валидация Supabase JWT                                   │
│  ✅ RLS проверки через Supabase                              │
│  ✅ Multi-tenancy (enterprise context)                       │
│  ✅ Управление enterprises, members, roles, permissions      │
│  ✅ Бизнес-логика приложения                                 │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL + Supabase                           │
│  ✅ Auth таблицы (управляются Supabase)                      │
│  ✅ Бизнес таблицы (enterprises, roles, etc)                 │
│  ✅ RLS policies                                             │
└─────────────────────────────────────────────────────────────┘
```

### Что делает фронтенд

**Для авторизации:**

```typescript
// Supabase Auth (встроенное)
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// Получение токена для API запросов
const {
  data: { session },
} = await supabase.auth.getSession();
const jwt = session?.access_token;
```

**Для проверки ролей (RPC через Supabase):**

```typescript
// Проверка роли в предприятии
const { data: role } = await supabase.rpc("get_user_enterprise_role", {
  p_user_id: userId,
  p_enterprise_id: enterpriseId,
});
```

**Для бизнес-логики (через NestJS API):**

```typescript
// Все запросы через бэкенд
const response = await fetch(`${BACKEND_URL}/api/enterprises`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${jwt}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(data),
});
```

---

## Авторизация и JWT

### JWT Token Structure

**Supabase генерирует JWT:**

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "authenticated",
  "aud": "authenticated",
  "exp": 1705234567,
  "iat": 1705230967
}
```

### Отправка токена на бэкенд

**Все API запросы:**

```typescript
headers: {
  'Authorization': `Bearer ${supabaseJWT}`,
  'Content-Type': 'application/json',
  'X-Enterprise-ID': enterpriseId // Из cookie current_enterprise_id
}
```

**Откуда X-Enterprise-ID:**

```typescript
// Фронтенд автоматически добавляет из cookie
const enterpriseId = getCookie("current_enterprise_id");

if (enterpriseId) {
  headers["X-Enterprise-ID"] = enterpriseId;
}
```

### Валидация на бэкенде (NestJS)

**Что должен делать бэкенд:**

1. **Проверить JWT signature** через Supabase public key
2. **Извлечь user_id** из `sub` claim
3. **Проверить RLS** для запроса (если нужно)
4. **Проверить роль в enterprise** (если передан X-Enterprise-ID)

```typescript
// Псевдокод для NestJS Guard
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    // 1. Verify JWT with Supabase
    const decoded = await this.supabaseAdmin.auth.getUser(token);

    if (!decoded.user) {
      throw new UnauthorizedException();
    }

    // 2. Attach user to request
    request.user = decoded.user;

    // 3. Check enterprise access (if X-Enterprise-ID provided)
    const enterpriseId = request.headers["x-enterprise-id"];
    if (enterpriseId) {
      const hasAccess = await this.checkEnterpriseAccess(
        decoded.user.id,
        enterpriseId
      );
      if (!hasAccess) {
        throw new ForbiddenException();
      }
    }

    return true;
  }
}
```

---

## API Endpoints - Enterprises

### 1. GET /api/enterprises

**Назначение:** Получить список предприятий текущего пользователя

**Request:**

```http
GET /api/enterprises
Authorization: Bearer {supabase_jwt}
```

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "My Company",
      "country_code": "UA",
      "default_currency": "UAH",
      "status": "active",
      "role": "owner",
      "is_owner": true,
      "created_at": "2026-01-14T10:00:00Z"
    },
    {
      "id": "uuid2",
      "name": "Another Company",
      "country_code": "PL",
      "default_currency": "PLN",
      "status": "active",
      "role": "admin",
      "is_owner": false,
      "created_at": "2026-01-10T15:30:00Z"
    }
  ],
  "meta": {
    "total": 2
  }
}
```

**Бизнес-логика на бэкенде:**

- Извлечь `user_id` из JWT
- Получить предприятия через JOIN с `enterprise_memberships`
  - Owner также находится в `enterprise_memberships` с ролью 'owner'
  - Один простой запрос, без UNION
- Для каждого предприятия определить роль и is_owner
- Вернуть список

**Edge Cases:**

- Пользователь без предприятий → `data: []`
- SuperAdmin → вернуть все предприятия? (обсудить)

---

### 2. POST /api/enterprises

**Назначение:** Создать новое предприятие

**Request:**

```http
POST /api/enterprises
Authorization: Bearer {supabase_jwt}
Content-Type: application/json

{
  "name": "New Company",
  "country_code": "UA",
  "default_currency": "UAH"
}
```

**Response 201:**

```json
{
  "data": {
    "id": "new-uuid",
    "name": "New Company",
    "country_code": "UA",
    "default_currency": "UAH",
    "status": "active",
    "owner_user_id": "user-uuid",
    "role": "owner",
    "is_owner": true,
    "created_at": "2026-01-14T12:00:00Z"
  }
}
```

**Бизнес-логика на бэкенде:**

1. Извлечь `user_id` из JWT
2. **Проверить subscription лимиты** (на Этапе 1 - пропустить, unlimited)
3. Создать `enterprise` с `owner_user_id = user_id`, `status = 'active'`
4. Создать роли `owner` и `admin` для этого предприятия
5. Назначить обеим ролям ВСЕ permissions из таблицы `permissions`
6. **✅ Добавить owner в `enterprise_memberships` с ролью 'owner'**
7. Вернуть созданное предприятие

**Edge Cases:**

- Лимит предприятий достигнут → `403 Forbidden`
- Невалидные данные → `400 Bad Request`

**TypeScript Interface:**

```typescript
interface CreateEnterpriseDto {
  name: string;
  country_code: string;
  default_currency: string;
}

interface Enterprise {
  id: string;
  name: string;
  country_code: string;
  default_currency: string;
  status: "active" | "inactive" | "suspended";
  owner_user_id: string;
  role?: "owner" | "admin";
  is_owner?: boolean;
  created_at: string;
  updated_at?: string;
}
```

---

### 3. GET /api/enterprises/:id

**Назначение:** Получить детали предприятия

**Request:**

```http
GET /api/enterprises/{enterprise_id}
Authorization: Bearer {supabase_jwt}
```

**Response 200:**

```json
{
  "data": {
    "id": "uuid",
    "name": "My Company",
    "country_code": "UA",
    "default_currency": "UAH",
    "status": "active",
    "owner_user_id": "owner-uuid",
    "role": "admin",
    "is_owner": false,
    "created_at": "2026-01-14T10:00:00Z",
    "updated_at": "2026-01-14T11:00:00Z"
  }
}
```

**Бизнес-логика:**

- Проверить доступ пользователя к предприятию
- Если нет доступа → `403 Forbidden`
- Вернуть детали с ролью пользователя

---

### 4. PATCH /api/enterprises/:id

**Назначение:** Обновить настройки предприятия

**Request:**

```http
PATCH /api/enterprises/{enterprise_id}
Authorization: Bearer {supabase_jwt}
Content-Type: application/json

{
  "name": "Updated Company Name",
  "default_currency": "PLN"
}
```

**Response 200:**

```json
{
  "data": {
    "id": "uuid",
    "name": "Updated Company Name",
    "country_code": "UA",
    "default_currency": "PLN",
    "status": "active",
    "updated_at": "2026-01-14T12:30:00Z"
  }
}
```

**Бизнес-логика:**

- Проверить что пользователь - owner или admin
- Если нет прав → `403 Forbidden`
- Обновить поля
- Вернуть обновленное предприятие

**Edge Cases:**

- Попытка изменить `owner_user_id` → `400 Bad Request` (или игнорировать)
- Попытка изменить `status` → только через отдельный endpoint (Этап 2)

---

## API Endpoints - Members

### 5. GET /api/enterprises/:id/members

**Назначение:** Получить список членов команды

**Request:**

```http
GET /api/enterprises/{enterprise_id}/members
Authorization: Bearer {supabase_jwt}
```

**Response 200:**

```json
{
  "data": [
    {
      "user_id": "uuid1",
      "email": "owner@example.com",
      "name": "Owner Name",
      "role": "owner",
      "is_owner": true,
      "status": "active",
      "joined_at": "2026-01-01T00:00:00Z"
    },
    {
      "user_id": "uuid2",
      "email": "admin@example.com",
      "name": "Admin Name",
      "role": "admin",
      "is_owner": false,
      "status": "active",
      "joined_at": "2026-01-05T10:00:00Z",
      "invited_by": "uuid1"
    }
  ],
  "meta": {
    "total": 2
  }
}
```

**Бизнес-логика:**

- Проверить доступ к предприятию (owner/admin)
- Получить всех members (включая owner!) из `enterprise_memberships`
- JOIN с `users` для получения email, name
- JOIN с `roles` для получения роли
- Определить `is_owner` через сравнение с `enterprises.owner_user_id`
- Вернуть список (owner будет в списке с ролью 'owner')

---

### 6. POST /api/enterprises/:id/members

**Назначение:** Добавить нового admin в предприятие

**Request:**

```http
POST /api/enterprises/{enterprise_id}/members
Authorization: Bearer {supabase_jwt}
Content-Type: application/json

{
  "email": "newadmin@example.com"
}
```

**Response 201:**

```json
{
  "data": {
    "user_id": "new-user-uuid",
    "email": "newadmin@example.com",
    "name": "New Admin Name",
    "role": "admin",
    "is_owner": false,
    "status": "active",
    "joined_at": "2026-01-14T13:00:00Z",
    "invited_by": "current-user-uuid"
  }
}
```

**Бизнес-логика (Этап 1 - упрощенно):**

1. Проверить что текущий пользователь - owner или admin
2. Найти пользователя по email в таблице `users`
   - Если не найден → `404 Not Found` ("User not registered")
3. Проверить что пользователь не owner этого предприятия
4. Проверить что нет дубликата в `enterprise_memberships`
5. Получить `role_id` для роли "admin" этого предприятия
6. Создать `enterprise_membership`:
   - `user_id`, `enterprise_id`, `role_id`
   - `status = 'active'`
   - `created_by = current_user_id`
7. Вернуть данные добавленного пользователя

**Edge Cases:**

- Email не найден → `404` с сообщением "User must register first"
- Пользователь уже в команде → `409 Conflict`
- Пользователь уже owner → `400 Bad Request`
- Нет прав (не owner/admin) → `403 Forbidden`

**TypeScript Interface:**

```typescript
interface AddMemberDto {
  email: string;
}

interface Member {
  user_id: string;
  email: string;
  name: string;
  role: "owner" | "admin";
  is_owner: boolean;
  status: "active" | "inactive";
  joined_at: string;
  invited_by?: string;
}
```

---

### 7. DELETE /api/enterprises/:id/members/:userId

**Назначение:** Удалить admin из предприятия

**Request:**

```http
DELETE /api/enterprises/{enterprise_id}/members/{user_id}
Authorization: Bearer {supabase_jwt}
```

**Response 204:** No Content

**Бизнес-логика:**

1. Проверить что текущий пользователь - owner или admin
2. Проверить что удаляемый пользователь НЕ owner (нельзя удалить owner!)
3. Удалить `enterprise_membership`
4. Вернуть 204

**Edge Cases:**

- Попытка удалить owner → `400 Bad Request` ("Cannot remove owner")
- Пользователь не найден → `404 Not Found`
- Нет прав → `403 Forbidden`

---

## TypeScript интерфейсы

### Общие типы

```typescript
// shared/types/api.ts

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;
```

### Enterprise типы

```typescript
// shared/types/enterprise.ts

export interface Enterprise {
  id: string;
  name: string;
  country_code: string;
  default_currency: string;
  status: "active" | "inactive" | "suspended";
  owner_user_id: string;
  role?: "owner" | "admin"; // Роль текущего пользователя
  is_owner?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CreateEnterpriseDto {
  name: string;
  country_code: string;
  default_currency: string;
}

export interface UpdateEnterpriseDto {
  name?: string;
  default_currency?: string;
}

export interface Member {
  user_id: string;
  email: string;
  name: string;
  role: "owner" | "admin";
  is_owner: boolean;
  status: "active" | "inactive";
  joined_at: string;
  invited_by?: string;
}

export interface AddMemberDto {
  email: string;
}
```

---

## User Flows с API

### Flow 1: Создание первого предприятия

```typescript
// 1. User на admin/ видит empty state
// 2. Click [Create Your First Enterprise]
// 3. Форма заполнена

const createEnterprise = async (data: CreateEnterpriseDto) => {
  const session = await supabase.auth.getSession();
  const jwt = session.data.session?.access_token;

  const response = await fetch(`${BACKEND_URL}/api/enterprises`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error.message);
  }

  const result: ApiResponse<Enterprise> = await response.json();
  return result.data;
};

// 4. Использование
try {
  const newEnterprise = await createEnterprise({
    name: "My Company",
    country_code: "UA",
    default_currency: "UAH",
  });

  // 5. Redirect на admin/ (теперь показывает 1 предприятие)
  router.push("/");
} catch (error) {
  toast.error(error.message);
}
```

### Flow 2: Добавление admin в предприятие

```typescript
// 1. Owner на admin/enterprises/[id]/members
// 2. Click [+ Add Member]
// 3. Форма: email

const addMember = async (enterpriseId: string, email: string) => {
  const session = await supabase.auth.getSession();
  const jwt = session.data.session?.access_token;

  const response = await fetch(
    `${BACKEND_URL}/api/enterprises/${enterpriseId}/members`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    }
  );

  if (!response.ok) {
    const error: ApiError = await response.json();

    if (response.status === 404) {
      throw new Error("User not found. They need to register first.");
    }

    if (response.status === 409) {
      throw new Error("User is already a member of this enterprise.");
    }

    throw new Error(error.error.message);
  }

  const result: ApiResponse<Member> = await response.json();
  return result.data;
};

// Использование
try {
  const newMember = await addMember(enterpriseId, "newadmin@example.com");

  toast.success(`${newMember.name} added as admin`);

  // Обновить список членов
  refetchMembers();
} catch (error) {
  toast.error(error.message);
}
```

### Flow 3: Загрузка списка предприятий

```typescript
// При загрузке admin/

const fetchEnterprises = async (): Promise<Enterprise[]> => {
  const session = await supabase.auth.getSession();
  const jwt = session.data.session?.access_token;

  if (!jwt) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${BACKEND_URL}/api/enterprises`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch enterprises");
  }

  const result: ApiResponse<Enterprise[]> = await response.json();
  return result.data;
};

// В компоненте (React Query)
const { data: enterprises, isLoading } = useQuery({
  queryKey: ["enterprises"],
  queryFn: fetchEnterprises,
});
```

---

## Edge Cases

### 1. JWT Token истек во время работы

**Проблема:** User работает в workspace, токен истекает

**Решение:**

```typescript
// Middleware автоматически обновляет токен
// API wrapper проверяет ошибку 401

const apiClient = {
  async request(url: string, options: RequestInit) {
    let session = await supabase.auth.getSession();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${session.data.session?.access_token}`,
      },
    });

    if (response.status === 401) {
      // Токен истек, попробовать обновить
      const { data } = await supabase.auth.refreshSession();

      if (data.session) {
        // Повторить запрос с новым токеном
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${data.session.access_token}`,
          },
        });
      }

      // Не удалось обновить - redirect login
      window.location.href = "/login";
    }

    return response;
  },
};
```

### 2. Пользователь удален из предприятия во время работы

**Проблема:** User работает в workspace, owner удаляет его

**Фронтенд:**

```typescript
// При любом API запросе к предприятию
const response = await apiClient.request(
  `/api/enterprises/${enterpriseId}/...`
);

if (response.status === 403) {
  // Нет доступа
  toast.error("Your access to this enterprise has been removed");

  // Удалить cookie
  document.cookie = "current_enterprise_id=; Max-Age=0";

  // Redirect на admin
  router.push("/");
}
```

**Бэкенд:**

- При каждом запросе проверять доступ к enterprise
- Если нет → `403 Forbidden`

### 3. Попытка добавить пользователя который не зарегистрирован

**Фронтенд:**

```typescript
try {
  await addMember(enterpriseId, "unknown@example.com");
} catch (error) {
  if (error.message.includes("not registered")) {
    toast.error("This user is not registered. Ask them to sign up first.", {
      duration: 5000,
    });
  }
}
```

**Бэкенд:**

- Искать пользователя в `users` таблице
- Если не найден → `404` с ясным сообщением

### 4. Race condition при автовыборе предприятия

**Проблема:**

- User заходит на workspace
- Middleware делает автовыбор
- Параллельно компонент делает API запрос
- API запрос приходит без X-Enterprise-ID

**Решение:**

```typescript
// workspace/middleware.ts
// Если нет cookie, сделать автовыбор и установить cookie
// Затем REDIRECT на ту же страницу (чтобы cookie применился)

if (!enterpriseId) {
  const selectedId = await autoSelectEnterprise(user.id);

  if (!selectedId) {
    return NextResponse.redirect(ADMIN_URL);
  }

  // Установить cookie и REDIRECT
  const response = NextResponse.redirect(request.url); // Та же URL
  response.cookies.set("current_enterprise_id", selectedId, {
    path: "/",
    domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
  });

  return response;
}
```

### 5. SuperAdmin доступ

**Вопрос:** Должен ли superAdmin видеть ВСЕ предприятия в `/api/enterprises`?

**Варианты:**

**A) Да, все предприятия:**

```typescript
// Бэкенд
if (user.is_system_admin) {
  return await this.enterprisesService.findAll();
}
```

**B) Нет, только свои + отдельный endpoint для admin:**

```typescript
// Обычный endpoint
GET /api/enterprises -> только свои

// Admin endpoint
GET /api/admin/enterprises -> все (только для superAdmin)
```

**Рекомендация:** Вариант B (разделить endpoints)

---

## MVP Приоритеты

### Must Have (Этап 1)

**Endpoints:**

1. ✅ `POST /api/auth/signup` - регистрация (или через Supabase?)
2. ✅ `POST /api/auth/login` - логин (или через Supabase?)
3. ✅ `GET /api/enterprises` - список предприятий
4. ✅ `POST /api/enterprises` - создание предприятия
5. ✅ `GET /api/enterprises/:id` - детали предприятия
6. ✅ `PATCH /api/enterprises/:id` - обновление настроек
7. ✅ `GET /api/enterprises/:id/members` - список членов
8. ✅ `POST /api/enterprises/:id/members` - добавить admin
9. ✅ `DELETE /api/enterprises/:id/members/:userId` - удалить admin

**RPC Functions (через Supabase, фронтенд):**

- `is_system_admin(user_id)` - проверка superAdmin
- `get_user_enterprise_role(user_id, enterprise_id)` - роль в предприятии
- `get_user_enterprises(user_id)` - список предприятий (или через API?)

### Should Have (Этап 1.5)

10. ✅ `GET /api/enterprises/:id/settings` - расширенные настройки
11. ✅ `GET /api/users/me` - профиль текущего пользователя
12. ✅ `PATCH /api/users/me` - обновление профиля

### Nice to Have (Этап 2)

- Email приглашения
- Кастомные роли
- Subscriptions API
- Notifications API

---

## Финальные решения

### ✅ Auth: Supabase напрямую

**Реализация:**

- Фронтенд: `supabase.auth.signUp()`, `supabase.auth.signInWithPassword()`
- Бэкенд: Только валидация JWT через Supabase public key
- **Не нужны** endpoints: `/api/auth/signup`, `/api/auth/login`

### ✅ Проверка ролей: RPC Functions

**Реализация:**

- Простые проверки: RPC через Supabase (`is_system_admin`, `get_user_enterprise_role`)
- Фронтенд вызывает RPC напрямую для UI логики
- Бэкенд использует те же RPC для авторизации

### ✅ Multi-tenancy: X-Enterprise-ID header

**Реализация:**

```typescript
// Фронтенд автоматически добавляет
headers: {
  'X-Enterprise-ID': getCookie('current_enterprise_id')
}

// Бэкенд извлекает и проверяет
const enterpriseId = request.headers['x-enterprise-id'];
if (enterpriseId) {
  await checkUserAccess(userId, enterpriseId);
}
```

**Почему header, а не URL:**

- Cookie живет все время после выбора в admin
- Автоматически добавляется к каждому запросу
- Не нужно прокидывать через все URL

### ✅ Автовыбор: Фронтенд middleware

**Реализация:**

- Фронтенд middleware проверяет cookie
- Если нет - вызывает RPC `get_user_enterprises`
- Применяет приоритет (owner > admin > first)
- Устанавливает cookie и продолжает
- **Не нужен** endpoint `/api/enterprises/auto-select`

---

## Связанные документы

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Общая архитектура
- [IMPLEMENTATION_PLAN_ETAP1.md](./IMPLEMENTATION_PLAN_ETAP1.md) - План реализации
- [CODE_EXAMPLES.md](./CODE_EXAMPLES.md) - Примеры кода

---

## ❓ FAQ

### В: Почему не Server Actions?

**О:** Server Actions - это Next.js функция для упрощения работы с формами. Но у нас:

- Есть отдельный NestJS бэкенд
- Нужна единая точка валидации
- Нужна возможность использовать API из других клиентов (mobile, etc)

Server Actions усложнят архитектуру и создадут дублирование логики.

### В: Как фронтенд получает user_id?

**О:** Из Supabase session:

```typescript
const {
  data: { user },
} = await supabase.auth.getUser();
const userId = user?.id;
```

Бэкенд получает из JWT (claim `sub`).

### В: Нужен ли refresh token endpoint?

**О:** Нет, Supabase автоматически обновляет токены. Middleware на фронтенде вызывает `supabase.auth.getUser()` который обновляет токен при необходимости.

---

**Статус:** 📋 Требует подтверждения бэкенда  
**Дата:** 14 января 2026  
**Версия:** 1.0 (MVP)
