# TypeScript Types - Enterprises API

**Дата:** 2026-01-17  
**Версия:** 1.0.0  
**Файл:** `/shared/types/enterprises.ts`

---

## Содержание

1. [Core Types](#core-types)
2. [Enterprise Entity](#enterprise-entity)
3. [Member Entity](#member-entity)
4. [DTOs](#dtos-data-transfer-objects)
5. [Response Wrappers](#response-wrappers)
6. [Error Types](#error-types)
7. [Reference Data Types](#reference-data-types)
8. [Type Guards](#type-guards)
9. [Helper Types](#helper-types)

---

## Core Types

### EnterpriseStatus

```typescript
type EnterpriseStatus = 'active' | 'inactive' | 'suspended';
```

**Значения:**
- `active` - предприятие активно
- `inactive` - предприятие неактивно (временно)
- `suspended` - предприятие заблокировано (админом платформы)

### UserRole

```typescript
type UserRole = 'owner' | 'admin';
```

**Значения:**
- `owner` - владелец предприятия (создатель)
- `admin` - администратор (приглашенный owner'ом)

### MemberStatus

```typescript
type MemberStatus = 'active' | 'inactive';
```

**Значения:**
- `active` - участник активен
- `inactive` - участник неактивен (удален или приостановлен)

---

## Enterprise Entity

### Interface: Enterprise

Основная сущность предприятия.

```typescript
interface Enterprise {
  id: string;
  name: string;
  country_code: string;
  default_currency: string;
  default_locale?: string | null;
  status: EnterpriseStatus;
  owner_user_id: string;
  role?: UserRole;
  is_owner?: boolean;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  deleted_at?: string | null;
  settings_json?: Record<string, any>;
}
```

### Поля

| Поле | Тип | Nullable | Описание |
|------|-----|----------|----------|
| `id` | `string` | ❌ | UUID предприятия |
| `name` | `string` | ❌ | Название предприятия |
| `country_code` | `string` | ❌ | Код страны регистрации (ISO 3166-1 alpha-2) |
| `default_currency` | `string` | ❌ | Валюта учета (ISO 4217) |
| `default_locale` | `string \| null` | ✅ | Язык интерфейса (ISO 639-1), `null` = использовать DEFAULT_LOCALE из .env |
| `status` | `EnterpriseStatus` | ❌ | Статус предприятия |
| `owner_user_id` | `string` | ❌ | UUID владельца предприятия |
| `role` | `UserRole` | ✅ | Роль текущего пользователя (заполняется API) |
| `is_owner` | `boolean` | ✅ | Является ли текущий пользователь владельцем (заполняется API) |
| `created_at` | `string` | ❌ | Дата создания (ISO 8601) |
| `updated_at` | `string` | ✅ | Дата обновления (ISO 8601) |
| `created_by` | `string` | ✅ | UUID создателя |
| `deleted_at` | `string \| null` | ✅ | Дата мягкого удаления (ISO 8601) |
| `settings_json` | `Record<string, any>` | ✅ | Дополнительные настройки (JSON) |

### Примеры

#### Owner предприятия
```typescript
const enterprise: Enterprise = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "My Company",
  country_code: "UA",
  default_currency: "UAH",
  default_locale: "uk",
  status: "active",
  owner_user_id: "user-uuid-123",
  role: "owner",
  is_owner: true,
  created_at: "2026-01-14T10:00:00Z",
  updated_at: "2026-01-15T12:30:00Z",
};
```

#### Admin предприятия
```typescript
const enterprise: Enterprise = {
  id: "660f9511-f3a-52e5-b827-557766551111",
  name: "Another Company",
  country_code: "PL",
  default_currency: "PLN",
  status: "active",
  owner_user_id: "user-uuid-456",
  role: "admin",
  is_owner: false,
  created_at: "2026-01-10T15:30:00Z",
};
```

---

## Member Entity

### Interface: Member

Участник предприятия (owner или admin).

```typescript
interface Member {
  user_id: string;
  email: string;
  name: string;
  role: UserRole;
  is_owner: boolean;
  status: MemberStatus;
  joined_at: string;
  invited_by?: string;
}
```

### Поля

| Поле | Тип | Nullable | Описание |
|------|-----|----------|----------|
| `user_id` | `string` | ❌ | UUID пользователя |
| `email` | `string` | ❌ | Email пользователя |
| `name` | `string` | ❌ | Имя пользователя |
| `role` | `UserRole` | ❌ | Роль в предприятии |
| `is_owner` | `boolean` | ❌ | Является ли владельцем |
| `status` | `MemberStatus` | ❌ | Статус участника |
| `joined_at` | `string` | ❌ | Дата присоединения (ISO 8601) |
| `invited_by` | `string` | ✅ | UUID пригласившего пользователя |

### Примеры

#### Owner
```typescript
const member: Member = {
  user_id: "user-uuid-123",
  email: "owner@example.com",
  name: "Owner Name",
  role: "owner",
  is_owner: true,
  status: "active",
  joined_at: "2026-01-01T00:00:00Z",
};
```

#### Admin (приглашенный)
```typescript
const member: Member = {
  user_id: "user-uuid-456",
  email: "admin@example.com",
  name: "Admin Name",
  role: "admin",
  is_owner: false,
  status: "active",
  joined_at: "2026-01-05T10:00:00Z",
  invited_by: "user-uuid-123",
};
```

---

## DTOs (Data Transfer Objects)

### Interface: CreateEnterpriseDto

DTO для создания нового предприятия.

```typescript
interface CreateEnterpriseDto {
  name: string;
  country_code: string;
  default_currency: string;
  default_locale?: string;
}
```

**Validation:**
- `name`: обязательно, мин. 1 символ
- `country_code`: обязательно, ISO 3166-1 alpha-2 (2 символа)
- `default_currency`: обязательно, ISO 4217 (3 символа)
- `default_locale`: опционально, ISO 639-1 (2 символа)

**Пример:**
```typescript
const data: CreateEnterpriseDto = {
  name: "New Company",
  country_code: "UA",
  default_currency: "UAH",
  default_locale: "uk",
};
```

### Interface: UpdateEnterpriseDto

DTO для обновления существующего предприятия.

```typescript
interface UpdateEnterpriseDto {
  name?: string;
  default_currency?: string;
  default_locale?: string;
}
```

**Все поля опциональны** - обновляются только переданные.

**Пример:**
```typescript
const data: UpdateEnterpriseDto = {
  name: "Updated Company Name",
  default_currency: "PLN",
};
```

### Interface: AddMemberDto

DTO для добавления нового участника (admin).

```typescript
interface AddMemberDto {
  email: string;
}
```

**Validation:**
- `email`: обязательно, валидный email
- Пользователь с этим email должен быть зарегистрирован

**Пример:**
```typescript
const data: AddMemberDto = {
  email: "newadmin@example.com",
};
```

---

## Response Wrappers

### Interface: ApiResponse<T>

Обертка успешного ответа API.

```typescript
interface ApiResponse<T> {
  data: T;
  meta?: ApiMeta;
}
```

**Пример:**
```typescript
const response: ApiResponse<Enterprise> = {
  data: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "My Company",
    // ... other fields
  },
  meta: {
    total: 1,
    timestamp: "2026-01-17T10:00:00Z",
  },
};
```

### Interface: ApiMeta

Метаданные ответа API.

```typescript
interface ApiMeta {
  total?: number;
  page?: number;
  limit?: number;
  timestamp?: string;
  request_id?: string;
}
```

### Type: ApiResult<T>

Результат API запроса (успех или ошибка).

```typescript
type ApiResult<T> = ApiResponse<T> | ApiError;
```

---

## Error Types

### Interface: ApiError

Обертка ошибки API.

```typescript
interface ApiError {
  error: ApiErrorDetails;
  meta?: ApiMeta;
}
```

### Interface: ApiErrorDetails

Детали ошибки.

```typescript
interface ApiErrorDetails {
  code: string;
  message: string;
  details?: Record<string, any>;
  field?: string;
}
```

**Пример:**
```typescript
const error: ApiError = {
  error: {
    code: "VALIDATION_ERROR",
    message: "Validation failed",
    details: {
      field: "name",
      reason: "Name is required",
    },
  },
  meta: {
    timestamp: "2026-01-17T10:00:00Z",
    request_id: "req-123",
  },
};
```

### Enum: ApiErrorCode

Типичные коды ошибок API.

```typescript
enum ApiErrorCode {
  // Авторизация
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Валидация
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  
  // Ресурсы
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  
  // Бизнес-логика
  CANNOT_REMOVE_OWNER = 'CANNOT_REMOVE_OWNER',
  USER_NOT_REGISTERED = 'USER_NOT_REGISTERED',
  USER_ALREADY_MEMBER = 'USER_ALREADY_MEMBER',
  PERIOD_CLOSED = 'PERIOD_CLOSED',
  
  // Сервер
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
```

---

## Reference Data Types

### Interface: Locale

Язык интерфейса.

```typescript
interface Locale {
  code: string;
  name_native: string;
  name_en: string;
  is_active: boolean;
}
```

**Пример:**
```typescript
const locale: Locale = {
  code: "uk",
  name_native: "Українська",
  name_en: "Ukrainian",
  is_active: true,
};
```

### Interface: Currency

Валюта.

```typescript
interface Currency {
  code: string;
  symbol: string;
  name_en: string;
  name_native?: string;
  decimal_places: number;
  is_active: boolean;
}
```

**Пример:**
```typescript
const currency: Currency = {
  code: "UAH",
  symbol: "₴",
  name_en: "Ukrainian Hryvnia",
  name_native: "Гривня",
  decimal_places: 2,
  is_active: true,
};
```

### Interface: Country

Страна.

```typescript
interface Country {
  code: string;
  code_alpha3?: string;
  name_en: string;
  name_native?: string;
  default_currency?: string;
  phone_code?: string;
  is_active: boolean;
}
```

**Пример:**
```typescript
const country: Country = {
  code: "UA",
  code_alpha3: "UKR",
  name_en: "Ukraine",
  name_native: "Україна",
  default_currency: "UAH",
  phone_code: "+380",
  is_active: true,
};
```

---

## Type Guards

### isApiError()

Проверка, является ли ответ ошибкой.

```typescript
function isApiError(response: ApiResult<any>): response is ApiError {
  return 'error' in response;
}
```

**Использование:**
```typescript
const response = await fetchEnterprise(id);

if (isApiError(response)) {
  console.error(response.error.message);
} else {
  console.log(response.data);
}
```

### isApiSuccess()

Проверка, является ли ответ успешным.

```typescript
function isApiSuccess<T>(response: ApiResult<T>): response is ApiResponse<T> {
  return 'data' in response && !('error' in response);
}
```

**Использование:**
```typescript
const response = await fetchEnterprise(id);

if (isApiSuccess(response)) {
  console.log(response.data.name);
}
```

---

## Helper Types

### GetEnterprisesOptions

Опции для запроса списка предприятий.

```typescript
interface GetEnterprisesOptions {
  include_inactive?: boolean;
  sort?: 'name' | 'created_at' | '-name' | '-created_at';
}
```

### GetMembersOptions

Опции для запроса списка участников.

```typescript
interface GetMembersOptions {
  include_inactive?: boolean;
  sort?: 'name' | 'joined_at' | '-name' | '-joined_at';
}
```

---

## Specific Response Types

### Type Aliases

```typescript
// Ответ на запрос списка предприятий
type EnterpriseListResponse = ApiResponse<Enterprise[]>;

// Ответ на запрос деталей предприятия
type EnterpriseDetailsResponse = ApiResponse<Enterprise>;

// Ответ на запрос создания предприятия
type CreateEnterpriseResponse = ApiResponse<Enterprise>;

// Ответ на запрос обновления предприятия
type UpdateEnterpriseResponse = ApiResponse<Enterprise>;

// Ответ на запрос списка участников
type MemberListResponse = ApiResponse<Member[]>;

// Ответ на запрос добавления участника
type AddMemberResponse = ApiResponse<Member>;

// Ответ на запрос списка локалей
type LocaleListResponse = ApiResponse<Locale[]>;

// Ответ на запрос списка валют
type CurrencyListResponse = ApiResponse<Currency[]>;

// Ответ на запрос списка стран
type CountryListResponse = ApiResponse<Country[]>;
```

---

## Использование

### Импорт типов

```typescript
import type {
  Enterprise,
  Member,
  CreateEnterpriseDto,
  UpdateEnterpriseDto,
  AddMemberDto,
  EnterpriseListResponse,
  ApiError,
  isApiError,
} from '@/shared/types/enterprises';
```

### Пример с React Query

```typescript
import { useQuery } from '@tanstack/react-query';
import type { EnterpriseListResponse } from '@/shared/types/enterprises';

function useEnterprises() {
  return useQuery<EnterpriseListResponse>({
    queryKey: ['enterprises'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/enterprises`, {
        headers: {
          'Authorization': `Bearer ${jwt}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch enterprises');
      }
      
      return response.json();
    },
  });
}
```

### Пример с Zod валидацией

```typescript
import { z } from 'zod';
import type { CreateEnterpriseDto } from '@/shared/types/enterprises';

const createEnterpriseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  country_code: z.string().length(2, 'Must be ISO 3166-1 alpha-2'),
  default_currency: z.string().length(3, 'Must be ISO 4217'),
  default_locale: z.string().length(2).optional(),
}) satisfies z.ZodType<CreateEnterpriseDto>;
```

---

**Обновлено:** 2026-01-17  
**Версия:** 1.0.0
