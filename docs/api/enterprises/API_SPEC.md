# Enterprises API - Полная спецификация

**Дата:** 2026-01-17  
**Версия:** 1.0.0  
**Base URL:** `https://api.oblikflow.com` (production) | `http://localhost:3054` (development)

---

## Содержание

1. [Авторизация](#авторизация)
2. [Общие Headers](#общие-headers)
3. [Коды ошибок](#коды-ошибок)
4. [CRUD Endpoints](#crud-endpoints)
   - [GET /api/enterprises](#1-get-apienterprises)
   - [POST /api/enterprises](#2-post-apienterprises)
   - [GET /api/enterprises/:id](#3-get-apienterprisesid)
   - [PATCH /api/enterprises/:id](#4-patch-apienterprisesid)
   - [GET /api/enterprises/:id/members](#5-get-apienterprises-id-members)
   - [POST /api/enterprises/:id/members](#6-post-apienterprises-id-members)
   - [DELETE /api/enterprises/:id/members/:userId](#7-delete-apienterprises-id-members-userid)

---

## Авторизация

Все endpoints требуют JWT токен от Supabase Auth.

### Получение токена

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// После логина
const { data: { session } } = await supabase.auth.getSession();
const jwt = session?.access_token;
```

### Отправка токена

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Общие Headers

### Request Headers

```http
Authorization: Bearer {jwt_token}
Content-Type: application/json
X-Enterprise-ID: {enterprise_uuid}  # Опционально, из cookie
```

### Response Headers

```http
Content-Type: application/json
X-Request-ID: req-123-456-789
X-Response-Time: 45ms
```

---

## Коды ошибок

### HTTP Status Codes

| Code | Описание | Когда возвращается |
|------|----------|-------------------|
| 200 | OK | Успешное получение/обновление |
| 201 | Created | Успешное создание |
| 204 | No Content | Успешное удаление |
| 400 | Bad Request | Невалидные данные запроса |
| 401 | Unauthorized | JWT токен отсутствует или невалиден |
| 403 | Forbidden | Нет прав доступа к ресурсу |
| 404 | Not Found | Ресурс не найден |
| 409 | Conflict | Конфликт данных (дубликат) |
| 422 | Unprocessable Entity | Ошибка валидации полей |
| 500 | Internal Server Error | Внутренняя ошибка сервера |

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "field": "name",
      "reason": "Name is required"
    }
  },
  "meta": {
    "timestamp": "2026-01-17T10:00:00Z",
    "request_id": "req-123"
  }
}
```

### Типичные Error Codes

- `UNAUTHORIZED` - Не авторизован
- `FORBIDDEN` - Нет прав доступа
- `VALIDATION_ERROR` - Ошибка валидации
- `NOT_FOUND` - Ресурс не найден
- `CONFLICT` - Конфликт данных
- `CANNOT_REMOVE_OWNER` - Нельзя удалить владельца
- `USER_NOT_REGISTERED` - Пользователь не зарегистрирован
- `USER_ALREADY_MEMBER` - Пользователь уже участник
- `INTERNAL_ERROR` - Внутренняя ошибка

---

## CRUD Endpoints

## 1. GET /api/enterprises

**Получить список предприятий текущего пользователя**

### Request

```http
GET /api/enterprises HTTP/1.1
Host: api.oblikflow.com
Authorization: Bearer {jwt_token}
```

### Query Parameters

Нет обязательных параметров.

### Response 200 OK

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "My Company",
      "country_code": "UA",
      "default_currency": "UAH",
      "default_locale": "uk",
      "status": "active",
      "owner_user_id": "user-uuid-123",
      "role": "owner",
      "is_owner": true,
      "created_at": "2026-01-14T10:00:00Z",
      "updated_at": "2026-01-15T12:30:00Z"
    },
    {
      "id": "660f9511-f3a-52e5-b827-557766551111",
      "name": "Another Company",
      "country_code": "PL",
      "default_currency": "PLN",
      "default_locale": "pl",
      "status": "active",
      "owner_user_id": "user-uuid-456",
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

### Response 401 Unauthorized

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "JWT token is missing or invalid"
  }
}
```

### Response 200 OK (Empty List)

```json
{
  "data": [],
  "meta": {
    "total": 0
  }
}
```

### TypeScript Example

```typescript
import type { EnterpriseListResponse } from '@/shared/types/enterprises';

async function getEnterprises(): Promise<EnterpriseListResponse> {
  const response = await fetch(`${API_URL}/api/enterprises`, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch enterprises');
  }
  
  return response.json();
}
```

---

## 2. POST /api/enterprises

**Создать новое предприятие**

### Request

```http
POST /api/enterprises HTTP/1.1
Host: api.oblikflow.com
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "name": "New Company",
  "country_code": "UA",
  "default_currency": "UAH",
  "default_locale": "uk"
}
```

### Body Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ Yes | Название предприятия (мин. 1 символ) |
| `country_code` | string | ✅ Yes | Код страны (ISO 3166-1 alpha-2) |
| `default_currency` | string | ✅ Yes | Валюта учета (ISO 4217) |
| `default_locale` | string | ❌ No | Язык интерфейса (ISO 639-1) |

### Response 201 Created

```json
{
  "data": {
    "id": "770fa622-g4b-63f6-c938-668877662222",
    "name": "New Company",
    "country_code": "UA",
    "default_currency": "UAH",
    "default_locale": "uk",
    "status": "active",
    "owner_user_id": "user-uuid-123",
    "role": "owner",
    "is_owner": true,
    "created_at": "2026-01-17T12:00:00Z"
  }
}
```

### Response 400 Bad Request

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "field": "name",
      "reason": "Name is required"
    }
  }
}
```

### Response 422 Unprocessable Entity

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid country code",
    "details": {
      "field": "country_code",
      "value": "XX",
      "reason": "Country code must be valid ISO 3166-1 alpha-2"
    }
  }
}
```

### TypeScript Example

```typescript
import type { CreateEnterpriseDto, CreateEnterpriseResponse } from '@/shared/types/enterprises';

async function createEnterprise(data: CreateEnterpriseDto): Promise<CreateEnterpriseResponse> {
  const response = await fetch(`${API_URL}/api/enterprises`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return response.json();
}
```

### Бизнес-логика (что делает backend)

1. Извлечь `user_id` из JWT
2. Создать `enterprise` с `owner_user_id = user_id`, `status = 'active'`
3. Создать две роли для предприятия: `owner` и `admin`
4. Назначить ВСЕ permissions обеим ролям
5. **Добавить owner в `enterprise_memberships` с ролью 'owner'**
6. Вернуть созданное предприятие

---

## 3. GET /api/enterprises/:id

**Получить детали предприятия**

### Request

```http
GET /api/enterprises/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: api.oblikflow.com
Authorization: Bearer {jwt_token}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | ID предприятия |

### Response 200 OK

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Company",
    "country_code": "UA",
    "default_currency": "UAH",
    "default_locale": "uk",
    "status": "active",
    "owner_user_id": "user-uuid-123",
    "role": "admin",
    "is_owner": false,
    "created_at": "2026-01-14T10:00:00Z",
    "updated_at": "2026-01-15T12:30:00Z",
    "settings_json": {
      "timezone": "Europe/Kiev"
    }
  }
}
```

### Response 403 Forbidden

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You don't have access to this enterprise"
  }
}
```

### Response 404 Not Found

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Enterprise not found"
  }
}
```

### TypeScript Example

```typescript
import type { EnterpriseDetailsResponse } from '@/shared/types/enterprises';

async function getEnterprise(id: string): Promise<EnterpriseDetailsResponse> {
  const response = await fetch(`${API_URL}/api/enterprises/${id}`, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Enterprise not found');
    }
    if (response.status === 403) {
      throw new Error('Access denied');
    }
    throw new Error('Failed to fetch enterprise');
  }
  
  return response.json();
}
```

---

## 4. PATCH /api/enterprises/:id

**Обновить настройки предприятия**

### Request

```http
PATCH /api/enterprises/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: api.oblikflow.com
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "name": "Updated Company Name",
  "default_currency": "PLN"
}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | ID предприятия |

### Body Parameters (все опциональны)

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Новое название предприятия |
| `default_currency` | string | Новая валюта учета (ISO 4217) |
| `default_locale` | string | Новый язык интерфейса (ISO 639-1) |

### Response 200 OK

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Updated Company Name",
    "country_code": "UA",
    "default_currency": "PLN",
    "default_locale": "uk",
    "status": "active",
    "owner_user_id": "user-uuid-123",
    "updated_at": "2026-01-17T14:30:00Z"
  }
}
```

### Response 403 Forbidden

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only owner or admin can update enterprise settings"
  }
}
```

### Response 400 Bad Request

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Cannot change owner_user_id",
    "details": {
      "field": "owner_user_id",
      "reason": "Owner cannot be changed via this endpoint"
    }
  }
}
```

### TypeScript Example

```typescript
import type { UpdateEnterpriseDto, UpdateEnterpriseResponse } from '@/shared/types/enterprises';

async function updateEnterprise(
  id: string, 
  data: UpdateEnterpriseDto
): Promise<UpdateEnterpriseResponse> {
  const response = await fetch(`${API_URL}/api/enterprises/${id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return response.json();
}
```

### Edge Cases

- ❌ Попытка изменить `owner_user_id` → `400 Bad Request` (или поле игнорируется)
- ❌ Попытка изменить `status` → игнорируется (только через отдельный endpoint на Этапе 2)
- ❌ Попытка обновить чужое предприятие → `403 Forbidden`

---

## 5. GET /api/enterprises/:id/members

**Получить список участников предприятия**

### Request

```http
GET /api/enterprises/550e8400-e29b-41d4-a716-446655440000/members HTTP/1.1
Host: api.oblikflow.com
Authorization: Bearer {jwt_token}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | ID предприятия |

### Response 200 OK

```json
{
  "data": [
    {
      "user_id": "user-uuid-123",
      "email": "owner@example.com",
      "name": "Owner Name",
      "role": "owner",
      "is_owner": true,
      "status": "active",
      "joined_at": "2026-01-01T00:00:00Z"
    },
    {
      "user_id": "user-uuid-456",
      "email": "admin@example.com",
      "name": "Admin Name",
      "role": "admin",
      "is_owner": false,
      "status": "active",
      "joined_at": "2026-01-05T10:00:00Z",
      "invited_by": "user-uuid-123"
    }
  ],
  "meta": {
    "total": 2
  }
}
```

### Response 403 Forbidden

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only owner or admin can view members"
  }
}
```

### TypeScript Example

```typescript
import type { MemberListResponse } from '@/shared/types/enterprises';

async function getMembers(enterpriseId: string): Promise<MemberListResponse> {
  const response = await fetch(`${API_URL}/api/enterprises/${enterpriseId}/members`, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch members');
  }
  
  return response.json();
}
```

---

## 6. POST /api/enterprises/:id/members

**Добавить admin в предприятие**

### Request

```http
POST /api/enterprises/550e8400-e29b-41d4-a716-446655440000/members HTTP/1.1
Host: api.oblikflow.com
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "email": "newadmin@example.com"
}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | ID предприятия |

### Body Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ Yes | Email пользователя (должен быть зарегистрирован) |

### Response 201 Created

```json
{
  "data": {
    "user_id": "user-uuid-789",
    "email": "newadmin@example.com",
    "name": "New Admin Name",
    "role": "admin",
    "is_owner": false,
    "status": "active",
    "joined_at": "2026-01-17T13:00:00Z",
    "invited_by": "user-uuid-123"
  }
}
```

### Response 404 Not Found

```json
{
  "error": {
    "code": "USER_NOT_REGISTERED",
    "message": "User with this email is not registered. They need to sign up first.",
    "details": {
      "email": "newadmin@example.com"
    }
  }
}
```

### Response 409 Conflict

```json
{
  "error": {
    "code": "USER_ALREADY_MEMBER",
    "message": "User is already a member of this enterprise"
  }
}
```

### Response 403 Forbidden

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only owner or admin can add members"
  }
}
```

### Response 400 Bad Request

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Cannot add owner as admin",
    "details": {
      "reason": "User is already the owner of this enterprise"
    }
  }
}
```

### TypeScript Example

```typescript
import type { AddMemberDto, AddMemberResponse } from '@/shared/types/enterprises';

async function addMember(
  enterpriseId: string, 
  data: AddMemberDto
): Promise<AddMemberResponse> {
  const response = await fetch(`${API_URL}/api/enterprises/${enterpriseId}/members`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    
    if (response.status === 404) {
      throw new Error('User not found. They need to register first.');
    }
    if (response.status === 409) {
      throw new Error('User is already a member.');
    }
    
    throw new Error(error.error.message);
  }
  
  return response.json();
}
```

### Edge Cases

- ❌ Email не найден → `404 NOT_FOUND` с сообщением "User must register first"
- ❌ Пользователь уже в команде → `409 CONFLICT`
- ❌ Пользователь уже owner → `400 BAD_REQUEST`
- ❌ Нет прав (не owner/admin) → `403 FORBIDDEN`

---

## 7. DELETE /api/enterprises/:id/members/:userId

**Удалить admin из предприятия**

### Request

```http
DELETE /api/enterprises/550e8400-e29b-41d4-a716-446655440000/members/user-uuid-456 HTTP/1.1
Host: api.oblikflow.com
Authorization: Bearer {jwt_token}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | ID предприятия |
| `userId` | UUID | ID пользователя для удаления |

### Response 204 No Content

Успешное удаление (без тела ответа).

### Response 400 Bad Request

```json
{
  "error": {
    "code": "CANNOT_REMOVE_OWNER",
    "message": "Cannot remove owner from enterprise"
  }
}
```

### Response 404 Not Found

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User is not a member of this enterprise"
  }
}
```

### Response 403 Forbidden

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only owner or admin can remove members"
  }
}
```

### TypeScript Example

```typescript
async function removeMember(enterpriseId: string, userId: string): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/enterprises/${enterpriseId}/members/${userId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${jwt}`,
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    
    if (response.status === 400) {
      throw new Error('Cannot remove owner');
    }
    if (response.status === 404) {
      throw new Error('User not found');
    }
    
    throw new Error(error.error.message);
  }
}
```

### Edge Cases

- ❌ Попытка удалить owner → `400 BAD_REQUEST` ("Cannot remove owner")
- ❌ Пользователь не найден → `404 NOT_FOUND`
- ❌ Нет прав → `403 FORBIDDEN`

---

## Общие Edge Cases

### 1. JWT Token истек во время работы

**Frontend должен:**
```typescript
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
      // Попробовать обновить токен
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
      
      // Redirect на login
      window.location.href = '/login';
    }
    
    return response;
  },
};
```

### 2. Пользователь удален из предприятия во время работы

**Frontend должен:**
```typescript
if (response.status === 403) {
  toast.error('Your access to this enterprise has been removed');
  document.cookie = 'current_enterprise_id=; Max-Age=0';
  router.push('/admin');
}
```

### 3. Валидация на клиенте

**Использовать Zod schemas:**
```typescript
import { z } from 'zod';

const createEnterpriseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  country_code: z.string().length(2, 'Must be ISO 3166-1 alpha-2'),
  default_currency: z.string().length(3, 'Must be ISO 4217'),
  default_locale: z.string().length(2).optional(),
});
```

---

## Rate Limiting

### Лимиты (планируется в Этапе 2)

- 1000 запросов в минуту для обычных операций
- Response headers будут включать:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1640995200
```

---

## Версионирование

- **API Version:** v1 (текущая)
- **Schema Version:** 1.0.0
- Версия включена в URL: `/api/...` (префикс `/api/` = v1)

---

**Обновлено:** 2026-01-17  
**Версия:** 1.0.0
