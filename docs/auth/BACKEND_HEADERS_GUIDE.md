# Передача токена и Enterprise ID - Краткая инструкция для бэкенда

**Дата:** 14 января 2026  
**Версия:** 1.0

---

## 🎯 Как фронтенд передает данные

### Каждый HTTP запрос содержит headers:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Enterprise-ID: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
```

---

## 📦 Структура headers

### 1. Authorization (JWT токен)

**Формат:**

```
Authorization: Bearer {token}
```

**Откуда:**

- Фронтенд получает токен от Supabase Auth
- Токен генерируется при логине через `supabase.auth.signInWithPassword()`
- Фронтенд извлекает из session: `session.access_token`

**Содержимое JWT:**

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000", // ← user_id
  "email": "user@example.com",
  "role": "authenticated",
  "exp": 1705234567,
  "iat": 1705230967
}
```

**Обязательность:** ✅ **ВСЕГДА** (на каждом запросе)

---

### 2. X-Enterprise-ID (ID текущего предприятия)

**Формат:**

```
X-Enterprise-ID: 550e8400-e29b-41d4-a716-446655440000
```

**Откуда:**

- Фронтенд берет из cookie `current_enterprise_id`
- Cookie устанавливается когда пользователь выбирает предприятие в `/admin`
- Cookie живет все время, пока пользователь работает с предприятием

**Обязательность:** ⚠️ **ОПЦИОНАЛЬНО** (зависит от endpoint)

**Когда передается:**

- ❌ НЕ передается при `GET /enterprises` (получаем ВСЕ предприятия)
- ❌ НЕ передается при `POST /enterprises` (создаем НОВОЕ)
- ⚠️ ОПЦИОНАЛЬНО для остальных (ID уже в URL: `/enterprises/:id/...`)

---

## 🔧 Что делать на бэкенде

### Шаг 1: Извлечь JWT токен

```typescript
// NestJS Guard
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. Извлечь токен
    const authHeader = request.headers["authorization"];
    // "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException(
        "Missing or invalid Authorization header"
      );
    }

    const token = authHeader.replace("Bearer ", "");
    // "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

    return token;
  }
}
```

---

### Шаг 2: Валидировать JWT через Supabase

```typescript
// Использовать Supabase Admin Client
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // ← Service Role Key!
);

// Валидация
const {
  data: { user },
  error,
} = await supabaseAdmin.auth.getUser(token);

if (error || !user) {
  throw new UnauthorizedException("Invalid or expired token");
}

// Теперь user.id доступен!
const userId = user.id; // "550e8400-e29b-41d4-a716-446655440000"
```

---

### Шаг 3: Извлечь Enterprise ID (если нужно)

```typescript
const enterpriseId = request.headers["x-enterprise-id"];

if (enterpriseId) {
  console.log("Enterprise ID:", enterpriseId);
  // "550e8400-e29b-41d4-a716-446655440000"
} else {
  console.log("No Enterprise ID provided");
}
```

---

### Шаг 4: Проверить доступ к предприятию (если Enterprise ID передан)

```typescript
if (enterpriseId) {
  // Проверить через RPC function
  const { data: role } = await supabaseAdmin.rpc("get_user_enterprise_role", {
    p_user_id: userId,
    p_enterprise_id: enterpriseId,
  });

  if (!role) {
    throw new ForbiddenException("No access to this enterprise");
  }

  // Роль: "owner" или "admin"
  request.userRole = role;
  request.enterpriseId = enterpriseId;
}
```

---

## 📊 Примеры запросов

### Пример 1: Получить список предприятий

```http
GET /api/enterprises HTTP/1.1
Host: api.oblikflow.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Бэкенд:**

1. Извлечь `user_id` из JWT
2. Вернуть все предприятия где:
   - `owner_user_id = user_id` OR
   - Есть `enterprise_membership` с `status='active'`

---

### Пример 2: Получить членов предприятия

```http
GET /api/enterprises/550e8400-e29b-41d4-a716-446655440000/members HTTP/1.1
Host: api.oblikflow.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Enterprise-ID: 550e8400-e29b-41d4-a716-446655440000
```

**Бэкенд:**

1. Извлечь `user_id` из JWT
2. Извлечь `enterprise_id` из URL параметра (`:id`)
3. Опционально: Проверить что `X-Enterprise-ID` совпадает с ID в URL
4. Проверить доступ: пользователь имеет роль `owner` или `admin`?
5. Если да → вернуть список членов
6. Если нет → `403 Forbidden`

---

### Пример 3: Создать предприятие

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

**Бэкенд:**

1. Извлечь `user_id` из JWT
2. Создать `enterprise`:
   ```sql
   INSERT INTO enterprises (name, country_code, default_currency, owner_user_id)
   VALUES (:name, :country_code, :default_currency, :user_id);
   ```
3. Создать роль `admin` для этого предприятия
4. Назначить роли все permissions
5. Вернуть созданное предприятие

---

## 🔐 Важные моменты

### ✅ Что НУЖНО делать:

1. **Всегда валидировать JWT** через `supabaseAdmin.auth.getUser(token)`
2. **Извлекать user_id** из JWT claim `sub`
3. **Проверять доступ к предприятию** если endpoint требует этого
4. **Использовать Service Role Key** для Supabase Admin (не Anon Key!)

### ❌ Что НЕ нужно делать:

1. ❌ НЕ создавать свои auth endpoints (`/api/auth/login`, `/api/auth/signup`)
2. ❌ НЕ читать токен из cookie (токен приходит ТОЛЬКО в Authorization header)
3. ❌ НЕ требовать `X-Enterprise-ID` для всех endpoints (он опциональный)
4. ❌ НЕ доверять `X-Enterprise-ID` без проверки доступа пользователя

---

## 🔑 Environment Variables

Бэкенду нужны:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ ВАЖНО:** Использовать **Service Role Key**, а не Anon Key!

Service Role Key позволяет:

- Валидировать JWT
- Обходить RLS policies (если нужно)
- Выполнять административные операции

---

## 📚 Связанные документы

- [BACKEND_API_SPEC.md](./BACKEND_API_SPEC.md) - Полная спецификация API
- [API_CONTRACT.md](./API_CONTRACT.md) - Контракт фронтенд ↔ бэкенд
- [DATABASE_SCHEMA_ETAP1.md](./DATABASE_SCHEMA_ETAP1.md) - Схема БД и RPC functions

---

**Вопросы?** Смотри полную документацию или свяжись с фронтенд командой.
