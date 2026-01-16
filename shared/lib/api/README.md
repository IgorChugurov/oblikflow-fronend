# HTTP Client для Backend API

Модульный HTTP клиент для работы с NestJS Backend API. Автоматически обрабатывает авторизацию, refresh токена, retry логику, offline режим и многое другое.

## Содержание

- [Быстрый старт](#быстрый-старт)
- [Архитектура](#архитектура)
- [Базовое использование](#базовое-использование)
- [Обработка ошибок](#обработка-ошибок)
- [Продвинутые фичи](#продвинутые-фичи)
- [Конфигурация](#конфигурация)
- [Примеры](#примеры)

---

## Быстрый старт

### Импорт

```typescript
import { httpClient } from "@/shared/lib/api";
```

### Простой GET запрос

```typescript
const result = await httpClient.get("/api/enterprises");

if (result.error) {
  console.error(result.error.message);
  return;
}

console.log(result.data); // Response data
```

### POST запрос с данными

```typescript
const result = await httpClient.post("/api/enterprises", {
  name: "My Company",
  country_code: "UA",
});

if (result.error) {
  toast.error(result.error.message);
  return;
}

console.log(result.data); // Created enterprise
```

---

## Архитектура

### Структура

```
shared/lib/api/
├── http-client.ts           # Главный фасад
├── core/
│   ├── types.ts             # Типы
│   ├── request-handler.ts   # Обработка fetch + headers
│   ├── error-handler.ts     # Маппинг ошибок
│   ├── auth-handler.ts      # 401, refresh, retry
│   ├── retry-handler.ts     # Retry с exponential backoff
│   └── queue-handler.ts     # Offline queue
├── index.ts                 # Public exports
└── README.md                # Документация
```

### Модули

#### 1. **RequestHandler**

- Формирует headers (Authorization, X-Enterprise-ID)
- Выполняет fetch запросы
- Парсит response

#### 2. **ErrorHandler**

- Маппит HTTP статусы в ApiError
- Извлекает error message из response
- Определяет нужен ли retry

#### 3. **AuthHandler**

- Получает JWT токен из Supabase
- Обрабатывает 401 ошибки
- Refresh токена (с защитой от race condition)
- Автоматический retry после refresh
- Logout при неудачном refresh

#### 4. **RetryHandler**

- Retry логика с exponential backoff
- Jitter для избежания thundering herd
- Configurable retry config

#### 5. **QueueHandler**

- Определяет online/offline статус
- Добавляет запросы в очередь при offline
- Автоматическая обработка очереди при восстановлении connection

---

## Базовое использование

### HTTP Methods

#### GET

```typescript
const result = await httpClient.get("/api/enterprises");
```

#### POST

```typescript
const result = await httpClient.post("/api/enterprises", {
  name: "My Company",
  country_code: "UA",
});
```

#### PATCH

```typescript
const result = await httpClient.patch("/api/enterprises/123", {
  name: "Updated Name",
});
```

#### DELETE

```typescript
const result = await httpClient.delete("/api/enterprises/123");
```

### Включение X-Enterprise-ID header

```typescript
const result = await httpClient.get("/api/enterprises/123/members", {
  includeEnterpriseId: true,
});
```

### Отмена запроса

```typescript
const controller = httpClient.createAbortController();

const result = await httpClient.get("/api/enterprises", {
  signal: controller.signal,
});

// Отменить запрос
controller.abort();
```

---

## Обработка ошибок

### ApiResult тип

Все функции возвращают `ApiResult<T>`:

```typescript
interface ApiResult<T> {
  data?: T;
  error?: ApiError;
  status: number;
}

interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: unknown;
}
```

### Проверка ошибок

```typescript
const result = await httpClient.get("/api/enterprises");

if (result.error) {
  // Обработать ошибку
  console.error(result.error.message);
  toast.error(result.error.message);
  return;
}

// Успех
const enterprises = result.data;
```

### Error Codes

```typescript
import { ErrorCode } from "@/shared/lib/api";

if (result.error?.code === ErrorCode.UNAUTHORIZED) {
  // Пользователь не авторизован
  router.push("/login");
}

if (result.error?.code === ErrorCode.FORBIDDEN) {
  // Нет доступа
  toast.error("Access denied");
}

if (result.error?.code === ErrorCode.NOT_FOUND) {
  // Не найдено
  router.push("/404");
}
```

### Автоматическая обработка 401

Клиент **автоматически** обрабатывает 401 ошибки:

1. Backend возвращает 401
2. Клиент вызывает `supabase.auth.refreshSession()`
3. Если refresh успешен - повторяет оригинальный запрос
4. Если refresh неудачен - logout + redirect на /login

**Вам не нужно ничего делать** - всё происходит автоматически!

---

## Продвинутые фичи

### Interceptors

#### Request Interceptor

Добавить custom headers ко всем запросам:

```typescript
httpClient.addRequestInterceptor((config) => {
  config.headers = {
    ...config.headers,
    "X-Client-Version": "1.0.0",
    "X-App-Context": "admin",
  };
  return config;
});
```

#### Response Interceptor

Обработать специфичные ошибки:

```typescript
httpClient.addResponseInterceptor((result) => {
  if (result.error?.code === "ENTERPRISE_SUSPENDED") {
    showEnterpriseBlockedModal();
  }
  return result;
});
```

### Retry Configuration

Настроить retry для конкретного запроса:

```typescript
const result = await httpClient.get("/api/enterprises", {
  retryConfig: {
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 15000,
    exponential: true,
  },
});
```

### Offline Mode

Клиент автоматически определяет offline режим и добавляет запросы в очередь:

```typescript
// Проверить статус
if (!httpClient.isOnline()) {
  console.log("Client is offline");
}

// Получить размер очереди
const queueSize = httpClient.getQueueSize();

// Очистить очередь
httpClient.clearQueue();
```

### Публичные endpoints (без Authorization)

Для публичных endpoints (которые не требуют авторизации):

```typescript
const result = await httpClient.get("/api/public/data", {
  skipAuth: true,
});
```

---

## Конфигурация

### Создание кастомного клиента

```typescript
import { HttpClient } from "@/shared/lib/api";

const customClient = new HttpClient({
  baseUrl: "https://custom-api.com",
  retryConfig: {
    maxRetries: 5,
    baseDelay: 2000,
  },
  queueEnabled: true,
  queueMaxSize: 100,
});
```

### Environment Variables

Убедитесь что установлены env переменные:

```env
# Backend URL
NEXT_PUBLIC_BACKEND_URL=https://api.oblikflow.com

# Supabase (для auth)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Примеры

### React Component

```typescript
"use client";

import { useState, useEffect } from "react";
import { httpClient } from "@/shared/lib/api";

interface Enterprise {
  id: string;
  name: string;
  owner_user_id: string;
}

export function EnterpriseList() {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEnterprises() {
      const result = await httpClient.get<{ data: Enterprise[] }>(
        "/api/enterprises"
      );

      if (result.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }

      setEnterprises(result.data?.data || []);
      setLoading(false);
    }

    loadEnterprises();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {enterprises.map((enterprise) => (
        <li key={enterprise.id}>{enterprise.name}</li>
      ))}
    </ul>
  );
}
```

### Form Submit

```typescript
"use client";

import { useState } from "react";
import { httpClient } from "@/shared/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function CreateEnterpriseForm() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await httpClient.post("/api/enterprises", {
      name,
      country_code: "UA",
      default_currency: "UAH",
    });

    setLoading(false);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    toast.success("Enterprise created!");
    router.push(`/admin/enterprises/${result.data?.data?.id}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enterprise name"
      />
      <button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create"}
      </button>
    </form>
  );
}
```

### React Query

```typescript
"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { httpClient } from "@/shared/lib/api";

interface Enterprise {
  id: string;
  name: string;
  owner_user_id: string;
}

export function useEnterprises() {
  return useQuery({
    queryKey: ["enterprises"],
    queryFn: async () => {
      const result = await httpClient.get<{ data: Enterprise[] }>(
        "/api/enterprises"
      );
      if (result.error) throw new Error(result.error.message);
      return result.data?.data || [];
    },
  });
}

export function useCreateEnterprise() {
  return useMutation({
    mutationFn: async (data: { name: string; country_code?: string }) => {
      const result = await httpClient.post<{ data: Enterprise }>(
        "/api/enterprises",
        data
      );
      if (result.error) throw new Error(result.error.message);
      return result.data?.data;
    },
  });
}

// Использование
function MyComponent() {
  const { data: enterprises, isLoading } = useEnterprises();
  const createMutation = useCreateEnterprise();

  async function handleCreate() {
    await createMutation.mutateAsync({
      name: "My Company",
      country_code: "UA",
    });
  }

  // ...
}
```

### Server Component (Next.js)

```typescript
import { httpClient } from "@/shared/lib/api";

interface Enterprise {
  id: string;
  name: string;
  owner_user_id: string;
}

export default async function EnterprisesPage() {
  const result = await httpClient.get<{ data: Enterprise[] }>(
    "/api/enterprises"
  );

  if (result.error) {
    return <div>Error: {result.error.message}</div>;
  }

  const enterprises = result.data?.data || [];

  return (
    <ul>
      {enterprises.map((enterprise) => (
        <li key={enterprise.id}>{enterprise.name}</li>
      ))}
    </ul>
  );
}
```

---

## Flow обработки 401

```
1. User делает запрос
   ↓
2. Backend возвращает 401 (токен истек)
   ↓
3. AuthHandler.handle401()
   ↓
4. Проверка: уже идет refresh?
   Да → ждем его завершения
   Нет → запускаем supabase.auth.refreshSession()
   ↓
5. Refresh успешен?
   Да → повторяем оригинальный запрос с новым токеном
   Нет → logout + redirect /login
   ↓
6. Возвращаем результат пользователю
```

**Всё происходит автоматически и прозрачно для пользователя!**

---

## FAQ

### Q: Нужно ли вручную обрабатывать 401?

**A:** Нет! Клиент автоматически обрабатывает 401, делает refresh токена и повторяет запрос.

### Q: Что делать если токен истек во время работы?

**A:** Ничего! Клиент автоматически обновит токен в фоне.

### Q: Как отменить запрос?

**A:** Используйте AbortController:

```typescript
const controller = httpClient.createAbortController();
const result = await httpClient.get("/api/data", {
  signal: controller.signal,
});

// Отменить
controller.abort();
```

### Q: Работает ли в offline режиме?

**A:** Да! GET запросы будут возвращать ошибку, но POST/PATCH/DELETE будут добавлены в очередь и выполнены когда connection восстановится.

### Q: Как добавить custom header для всех запросов?

**A:** Используйте request interceptor:

```typescript
httpClient.addRequestInterceptor((config) => {
  config.headers["X-Custom-Header"] = "value";
  return config;
});
```

---

## Поддержка

Если возникли проблемы или вопросы - обратитесь к команде разработки.

**Дата:** 16 января 2026  
**Версия:** 1.0
