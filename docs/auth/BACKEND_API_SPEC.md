# Backend API Specification

**Для бэкенд разработчика**  
**Дата:** 14 января 2026  
**Версия:** 1.0 (Этап 1 MVP)

---

## 🔑 Как фронтенд передает данные (ВАЖНО!)

### HTTP Headers на каждом запросе:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Enterprise-ID: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
```

### Детали:

| Header            | Значение                | Обязательность     | Откуда                         |
| ----------------- | ----------------------- | ------------------ | ------------------------------ |
| `Authorization`   | `Bearer {supabase_jwt}` | ✅ **Всегда**      | Supabase session               |
| `X-Enterprise-ID` | `uuid`                  | ⚠️ **Опционально** | Cookie `current_enterprise_id` |
| `Content-Type`    | `application/json`      | ✅ POST/PATCH      | Стандарт                       |

---

## 📋 Что делать бэкенду:

### 1. Извлечь JWT из Authorization header

```typescript
const authHeader = request.headers["authorization"];
// "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

const token = authHeader?.replace("Bearer ", "");
// "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 2. Валидировать JWT через Supabase

```typescript
const {
  data: { user },
  error,
} = await supabaseAdmin.auth.getUser(token);

if (error || !user) {
  throw new UnauthorizedException();
}

// user.id = "550e8400-e29b-41d4-a716-446655440000"
// user.email = "user@example.com"
```

### 3. Извлечь Enterprise ID (если есть)

```typescript
const enterpriseId = request.headers["x-enterprise-id"];
// "550e8400-e29b-41d4-a716-446655440000" или undefined

if (enterpriseId) {
  // Проверить доступ пользователя к предприятию
  const hasAccess = await checkUserEnterpriseAccess(user.id, enterpriseId);

  if (!hasAccess) {
    throw new ForbiddenException("No access to this enterprise");
  }
}
```

---

## 🎯 Что нужно реализовать

### Архитектурные решения

✅ **Auth:** Supabase напрямую (НЕТ auth endpoints в NestJS)  
✅ **JWT Validation:** Через Supabase public key  
✅ **Multi-tenancy:** `X-Enterprise-ID` header (из cookie)  
✅ **Проверка ролей:** RPC functions (уже есть в БД)

---

## 🔍 Примеры запросов от фронтенда

### Пример 1: Запрос БЕЗ Enterprise ID

```http
GET /api/enterprises HTTP/1.1
Host: api.oblikflow.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Что делать:**

- Извлечь `user_id` из JWT
- Вернуть список предприятий пользователя
- `X-Enterprise-ID` НЕ проверять (его нет)

---

### Пример 2: Запрос С Enterprise ID

```http
GET /api/enterprises/550e8400-e29b-41d4-a716-446655440000/members HTTP/1.1
Host: api.oblikflow.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Enterprise-ID: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
```

**Что делать:**

1. Извлечь `user_id` из JWT
2. Извлечь `enterprise_id` из `X-Enterprise-ID` header
3. **Проверить доступ:** пользователь имеет доступ к этому предприятию?
4. Если да → вернуть данные
5. Если нет → `403 Forbidden`

---

### Пример 3: POST запрос

```http
POST /api/enterprises HTTP/1.1
Host: api.oblikflow.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "My Company",
  "country_code": "UA",
  "default_currency": "UAH"
}
```

**Что делать:**

- Извлечь `user_id` из JWT
- Создать предприятие с `owner_user_id = user_id`
- Вернуть созданное предприятие

---

## 📊 Когда нужен X-Enterprise-ID?

| Endpoint                                  | Authorization  | X-Enterprise-ID  | Зачем X-Enterprise-ID?                  |
| ----------------------------------------- | -------------- | ---------------- | --------------------------------------- |
| `GET /enterprises`                        | ✅ Обязательно | ❌ Не нужен      | Возвращает ВСЕ предприятия пользователя |
| `POST /enterprises`                       | ✅ Обязательно | ❌ Не нужен      | Создается НОВОЕ предприятие             |
| `GET /enterprises/:id`                    | ✅ Обязательно | ⚠️ Опционально\* | Можно проверить доступ по ID в URL      |
| `PATCH /enterprises/:id`                  | ✅ Обязательно | ⚠️ Опционально\* | Можно проверить доступ по ID в URL      |
| `GET /enterprises/:id/members`            | ✅ Обязательно | ⚠️ Опционально\* | Можно проверить доступ по ID в URL      |
| `POST /enterprises/:id/members`           | ✅ Обязательно | ⚠️ Опционально\* | Можно проверить доступ по ID в URL      |
| `DELETE /enterprises/:id/members/:userId` | ✅ Обязательно | ⚠️ Опционально\* | Можно проверить доступ по ID в URL      |

**\*Опционально:** ID предприятия уже есть в URL. `X-Enterprise-ID` может использоваться как дополнительная валидация:

```typescript
// Опциональная проверка
const enterpriseIdFromUrl = request.params.id;
const enterpriseIdFromHeader = request.headers["x-enterprise-id"];

if (enterpriseIdFromHeader && enterpriseIdFromUrl !== enterpriseIdFromHeader) {
  throw new BadRequestException("Enterprise ID mismatch");
}
```

---

## 📋 API Endpoints (MVP)

### 1. GET /api/enterprises

Список предприятий текущего пользователя

**Headers:**

```
Authorization: Bearer {supabase_jwt}
X-Enterprise-ID: НЕТ (не нужен для этого endpoint)
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
    }
  ],
  "meta": {
    "total": 1
  }
}
```

**Бизнес-логика:**

1. Извлечь `user_id` из JWT (claim `sub`)
2. Получить предприятия через JOIN:
   ```sql
   SELECT 
     e.id, e.name, e.country_code, e.default_currency, e.status,
     r.name as role,
     (e.owner_user_id = :user_id) as is_owner,
     e.created_at
   FROM enterprises e
   JOIN enterprise_memberships em ON e.id = em.enterprise_id
   JOIN roles r ON em.role_id = r.id
   WHERE em.user_id = :user_id 
     AND em.status = 'active'
     AND e.deleted_at IS NULL
     AND e.status = 'active'
   ORDER BY e.name;
   ```
3. Вернуть список

**✅ Преимущество:** Простой JOIN, без UNION запросов.

---

### 2. POST /api/enterprises

Создать новое предприятие

**Headers:**

```
Authorization: Bearer {supabase_jwt}
Content-Type: application/json
```

**Body:**

```json
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

**Бизнес-логика:**

1. Извлечь `user_id` из JWT
2. Создать `enterprise` с `owner_user_id = user_id`, `status = 'active'`
3. Создать две роли для предприятия:
   - Роль `owner`
   - Роль `admin`
4. Назначить ВСЕ permissions обеим ролям:
   ```sql
   INSERT INTO role_permissions (role_id, permission_id)
   SELECT owner_role_id, id FROM permissions;
   
   INSERT INTO role_permissions (role_id, permission_id)
   SELECT admin_role_id, id FROM permissions;
   ```
5. **✅ Добавить owner в enterprise_memberships:**
   ```sql
   INSERT INTO enterprise_memberships 
     (enterprise_id, user_id, role_id, status, created_by)
   VALUES 
     (new_enterprise_id, user_id, owner_role_id, 'active', user_id);
   ```
6. Вернуть созданное предприятие

**⚠️ Важно:** Owner ДОЛЖЕН быть добавлен в `enterprise_memberships` с ролью 'owner'. Это упрощает все запросы и проверки доступа.

**Edge Cases:**

- Невалидные данные → `400 Bad Request`

---

### 3. GET /api/enterprises/:id

Детали предприятия

**Headers:**

```
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
    "created_at": "2026-01-14T10:00:00Z"
  }
}
```

**Бизнес-логика:**

1. Проверить доступ пользователя к предприятию (RPC или прямой запрос)
2. Если нет доступа → `403 Forbidden`
3. Вернуть детали с ролью пользователя

---

### 4. PATCH /api/enterprises/:id

Обновить настройки предприятия

**Headers:**

```
Authorization: Bearer {supabase_jwt}
Content-Type: application/json
```

**Body:**

```json
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

1. Проверить что пользователь - owner или admin
2. Если нет прав → `403 Forbidden`
3. Обновить поля
4. Вернуть обновленное предприятие

---

### 5. GET /api/enterprises/:id/members

Список членов команды

**Headers:**

```
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

1. Проверить доступ к предприятию (owner/admin)
2. Получить всех members (включая owner!) через JOIN:
   ```sql
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
   WHERE em.enterprise_id = :enterprise_id
     AND em.status = 'active'
   ORDER BY is_owner DESC, u.name;
   ```
3. Вернуть список

**✅ Преимущество:** Owner в том же списке, что и admins. Один запрос.

---

### 6. POST /api/enterprises/:id/members

Добавить admin в предприятие

**Headers:**

```
Authorization: Bearer {supabase_jwt}
Content-Type: application/json
```

**Body:**

```json
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

**Бизнес-логика:**

1. Проверить что текущий пользователь - owner или admin
2. Найти пользователя по email в таблице `users`
   - **Если не найден → `404 Not Found`** с сообщением "User not registered"
3. Проверить что пользователь не owner этого предприятия
4. Проверить что нет дубликата в `enterprise_memberships`
5. Получить `role_id` для роли "admin" этого предприятия
6. Создать `enterprise_membership`:
   ```sql
   INSERT INTO enterprise_memberships (
     user_id, enterprise_id, role_id,
     status, created_by
   ) VALUES (
     :new_user_id, :enterprise_id, :admin_role_id,
     'active', :current_user_id
   )
   ```
7. Вернуть данные добавленного пользователя

**Edge Cases:**

- Email не найден → `404 Not Found` ("User must register first")
- Пользователь уже в команде → `409 Conflict`
- Пользователь уже owner → `400 Bad Request`
- Нет прав (не owner/admin) → `403 Forbidden`

---

### 7. DELETE /api/enterprises/:id/members/:userId

Удалить admin из предприятия

**Headers:**

```
Authorization: Bearer {supabase_jwt}
```

**Response 204:** No Content

**Бизнес-логика:**

1. Проверить что текущий пользователь - owner или admin
2. **Проверить что удаляемый пользователь НЕ owner** (нельзя удалить owner!)
3. Удалить `enterprise_membership`
4. Вернуть 204

**Edge Cases:**

- Попытка удалить owner → `400 Bad Request` ("Cannot remove owner")
- Пользователь не найден → `404 Not Found`
- Нет прав → `403 Forbidden`

---

## 🔐 JWT Validation

### Supabase JWT Structure

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

### NestJS Guard (псевдокод)

```typescript
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

    return true;
  }
}
```

---

## 🏢 Multi-tenancy: X-Enterprise-ID

### Проверка доступа к предприятию

```typescript
@Injectable()
export class EnterpriseAccessGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // От SupabaseAuthGuard
    const enterpriseId = request.headers["x-enterprise-id"];

    if (!enterpriseId) {
      // Опционально, зависит от endpoint
      return true;
    }

    // Проверить доступ через RPC или прямой запрос
    const hasAccess = await this.checkUserAccess(user.id, enterpriseId);

    if (!hasAccess) {
      throw new ForbiddenException("No access to this enterprise");
    }

    // Прикрепить к request для использования в контроллере
    request.enterpriseId = enterpriseId;

    return true;
  }

  private async checkUserAccess(
    userId: string,
    enterpriseId: string
  ): Promise<boolean> {
    // Вариант 1: Через RPC
    const { data } = await this.supabase.rpc("get_user_enterprise_role", {
      p_user_id: userId,
      p_enterprise_id: enterpriseId,
    });
    return !!data; // Если роль есть - есть доступ

    // Вариант 2: Прямой запрос
    // const isOwner = await this.checkIsOwner(userId, enterpriseId);
    // const isMember = await this.checkIsMember(userId, enterpriseId);
    // return isOwner || isMember;
  }
}
```

---

## 📦 TypeScript Types

```typescript
// DTOs
export interface CreateEnterpriseDto {
  name: string;
  country_code: string;
  default_currency: string;
}

export interface UpdateEnterpriseDto {
  name?: string;
  default_currency?: string;
}

export interface AddMemberDto {
  email: string;
}

// Entities
export interface Enterprise {
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

// Response wrappers
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
```

---

## 🗄️ Database Tables

### enterprises

```sql
CREATE TABLE enterprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  default_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  owner_user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'active',
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NULL
);
```

**⚠️ Важно:** `owner_user_id` используется для:
- Быстрой проверки владельца (без JOIN)
- Запрета удаления owner через constraints
- Передачи владения (transfer ownership)

**НО:** Owner ТАКЖЕ должен быть в `enterprise_memberships` с ролью 'owner'!

---

### roles

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enterprise_id, name)
);
```

**Системные роли (создаются автоматически для каждого предприятия):**
- `owner` - владелец предприятия
- `admin` - администратор предприятия

---

### enterprise_memberships

```sql
CREATE TABLE enterprise_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NULL REFERENCES roles(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by UUID NULL,
  updated_at timestamptz NULL,
  UNIQUE (enterprise_id, user_id)
);
```

**⚠️ Важно:** Owner ДОЛЖЕН быть в этой таблице с ролью 'owner'. Это упрощает:
- Получение списка всех пользователей предприятия (один запрос)
- Проверку доступа (единообразная логика)
- RLS policies (простые правила)

### permissions

```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  description TEXT
);
```

### role_permissions

```sql
CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
```

---

## 🔧 RPC Functions (уже в БД)

### is_system_admin

```sql
CREATE OR REPLACE FUNCTION is_system_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_system_admin, FALSE)
  FROM users
  WHERE id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER;
```

### get_user_enterprise_role

```sql
CREATE OR REPLACE FUNCTION get_user_enterprise_role(
  p_user_id UUID,
  p_enterprise_id UUID
)
RETURNS TEXT AS $$
  -- Упрощенный запрос: owner тоже в memberships
  SELECT r.name
  FROM enterprise_memberships em
  JOIN roles r ON em.role_id = r.id
  WHERE em.user_id = p_user_id
    AND em.enterprise_id = p_enterprise_id
    AND em.status = 'active'
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;
```

**✅ Преимущество:** Простой запрос без UNION, работает для owner и admin одинаково.

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
  -- Упрощенный запрос: owner тоже в memberships
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

**✅ Преимущества:**
- Простой JOIN вместо UNION
- is_owner вычисляется через сравнение с owner_user_id
- Единообразная логика для всех ролей

---

## ✅ Чеклист реализации

### Инфраструктура

- [ ] Настроить Supabase connection (admin client)
- [ ] Создать SupabaseAuthGuard
- [ ] Создать EnterpriseAccessGuard (опционально)
- [ ] Настроить CORS для фронтенда

### Endpoints

- [ ] `GET /api/enterprises`
- [ ] `POST /api/enterprises`
- [ ] `GET /api/enterprises/:id`
- [ ] `PATCH /api/enterprises/:id`
- [ ] `GET /api/enterprises/:id/members`
- [ ] `POST /api/enterprises/:id/members`
- [ ] `DELETE /api/enterprises/:id/members/:userId`

### Тестирование

- [ ] Unit тесты для каждого endpoint
- [ ] E2E тесты основных flows
- [ ] Тестирование JWT validation
- [ ] Тестирование RLS policies

### Документация

- [ ] OpenAPI/Swagger spec
- [ ] Postman collection
- [ ] README с примерами curl

---

## 📞 Контакты и вопросы

Все детали в полной документации: `API_CONTRACT.md`

**Дата:** 14 января 2026  
**Версия:** 1.0 (MVP)
