# Анализ проблемы: Таймауты и зависания в Middleware

> ⚠️ **ИСТОРИЧЕСКИЙ ДОКУМЕНТ**  
> Этот анализ был сделан до обнаружения корневой причины.  
> Описывал сложное решение, но реальная проблема оказалась проще.
>
> **Корневая причина:** `getUser()` всегда делает network запрос (50+ на страницу)  
> **Решение:** Заменить на `getSession()` (читает из cookies, 0 network запросов)
>
> **Актуальное решение:** [MIDDLEWARE_FIX_SIMPLE.md](./MIDDLEWARE_FIX_SIMPLE.md)

---

**Дата:** 2026-01-18  
**~~Статус: 🔴 КРИТИЧЕСКАЯ ПРОБЛЕМА~~**  
**Статус:** ✅ РЕШЕНО (см. MIDDLEWARE_FIX_SIMPLE.md)

---

## 📊 Симптомы проблемы

### Что происходит:

1. ✅ Пользователь авторизован и заходит на страницу
2. ⚠️ Через несколько секунд происходит `TypeError: fetch failed` с `ConnectTimeoutError`
3. ❌ User становится `null` в middleware
4. 🔄 Происходит редирект на `/login`
5. 💔 Приложение зависает на несколько минут
6. ⚡ Server перезагружается из-за превышения лимита памяти

### Логи из терминала:

```
[middleware] User: b8ee4472-4242-4962-bee4-2f72b92dd1ce
TypeError: fetch failed
  [cause]: Error [ConnectTimeoutError]: Connect Timeout Error
    code: 'UND_ERR_CONNECT_TIMEOUT'
[middleware] User: null
[admin/proxy] No user found! Redirecting to site login
⚠ Server is approaching the used memory threshold, restarting...
```

---

## 🔍 Root Cause Analysis

### 1. **Где происходит ошибка:**

Ошибка происходит в `shared/auth-sdk/server/middleware.ts` при вызове:

```typescript
const {
  data: { user: supabaseUser },
} = await supabase.auth.getUser(); // ❌ Здесь таймаут
```

### 2. **Почему происходит таймаут:**

#### a) **Нет таймаута для fetch запросов**

- Supabase клиент использует `fetch()` для запросов к Supabase Auth API
- По умолчанию `fetch()` в Node.js **НЕ имеет таймаута**
- Если Supabase API не отвечает → fetch висит **до 5+ минут**
- После таймаута → ошибка → User = null → редирект

#### b) **Middleware выполняется при каждом запросе**

```typescript
// admin/proxy.ts - выполняется ПРИ КАЖДОМ запросе
export async function middleware(request: NextRequest) {
  // Каждый раз делаем fetch к Supabase Auth API
  const { response, user } = await baseMiddleware(request);
  // ...
}
```

**Проблема:** Нет кеширования → каждый asset, каждая страница → новый fetch к Supabase.

#### c) **Проблемы с памятью сервера**

```
⚠ Server is approaching the used memory threshold, restarting...
```

Накапливаются незавершенные fetch запросы → memory leak → перезагрузка сервера.

---

## 🏗️ Архитектурные проблемы

### ❌ **Проблема #1: Отсутствие таймаутов**

**Где:** Все fetch запросы в приложении

#### В Middleware (Supabase Auth):

```typescript
// shared/auth-sdk/server/middleware.ts
const supabase = createServerClient(url, key, {
  cookies: {
    /* ... */
  },
  // ❌ НЕТ настройки таймаута
});

await supabase.auth.getUser(); // ❌ Может висеть минутами
```

#### В Backend API проверках:

```typescript
// shared/auth-sdk/server/backend-api-service.ts
const response = await fetch(`${BACKEND_URL}/api/auth/check-superadmin`, {
  method: "GET",
  headers: { Authorization: `Bearer ${token}` },
  cache: "no-store",
  // ❌ НЕТ signal: AbortSignal.timeout()
});
```

#### В HTTP Client:

```typescript
// shared/lib/api/core/request-handler.ts
const response = await fetch(url, {
  method: config.method,
  headers,
  body,
  signal: config.signal, // ⚠️ signal передается, но не создается автоматически
});
```

---

### ❌ **Проблема #2: Отсутствие fallback логики**

**Что происходит сейчас:**

```typescript
// admin/proxy.ts
const { response, user } = await baseMiddleware(request);

if (!user) {
  // ❌ Любая ошибка (таймаут, сеть) → редирект на login
  return NextResponse.redirect(loginUrl);
}
```

**Проблема:**

- Network timeout → User = null → редирект
- Supabase API недоступен → User = null → редирект
- Временная проблема → пользователь теряет сессию

**Правильно:** Разделять реальные проблемы авторизации от временных сетевых проблем.

---

### ❌ **Проблема #3: Нет кеширования проверок**

**Текущая архитектура:**

```
Request 1 → Middleware → fetch Supabase API
Request 2 → Middleware → fetch Supabase API
Request 3 → Middleware → fetch Supabase API
...
Request 50 → Middleware → fetch Supabase API
```

**Проблема:**

- 1 загрузка страницы = **50+ запросов** (HTML, CSS, JS, images, API)
- Каждый запрос = новый fetch к Supabase Auth API
- При медленном API = 50+ зависших запросов = memory leak

---

### ❌ **Проблема #4: Отсутствие circuit breaker**

Нет механизма для **временного отключения проверок** при проблемах с backend/Supabase.

**Что должно быть:**

```
1. Первые 3 запроса падают с таймаутом
2. Circuit breaker открывается
3. Следующие N запросов пропускаются без проверки
4. Через T секунд - пробуем снова
```

---

### ❌ **Проблема #5: Отсутствие monitoring**

Нет метрик:

- Сколько времени занимают middleware проверки
- Какой процент запросов падает с таймаутом
- Какие endpoint'ы проблемные

---

## 📋 Отсутствующие environment variables

**В файле `env`:**

```env
# ✅ Есть
NEXT_PUBLIC_BASE_DOMAIN=oblikflow.com
NEXT_PUBLIC_SITE_URL=https://oblikflow.com
...

# ❌ ОТСУТСТВУЮТ - КРИТИЧНО
NEXT_PUBLIC_BACKEND_URL=???          # Backend API URL
NEXT_PUBLIC_SUPABASE_URL=???         # Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=???    # Supabase Anon Key
```

**Последствия:**

- Backend API запросы идут на `http://localhost:3054` (fallback)
- Возможно, backend не запущен или недоступен

---

## 💡 Предлагаемое решение

### 🎯 **Цели:**

1. ✅ Устранить зависания и таймауты
2. ✅ Сохранять сессию при временных сетевых проблемах
3. ✅ Минимизировать количество запросов к external API
4. ✅ Graceful degradation при проблемах с backend
5. ✅ Monitoring и observability

---

## 🛠️ Архитектурное решение (3 уровня)

### **Уровень 1: СРОЧНЫЕ ИСПРАВЛЕНИЯ** ⚡ (1-2 часа)

#### 1.1. Добавить таймауты для всех fetch запросов

**Приоритет:** 🔴 КРИТИЧНО

**Где:**

1. Middleware Supabase Auth проверки
2. Backend API проверки (checkSuperAdmin, checkEnterpriseAccess)
3. HTTP Client по умолчанию

**Решение:**

```typescript
// Глобальная константа
const MIDDLEWARE_TIMEOUT = 3000; // 3 секунды
const BACKEND_API_TIMEOUT = 5000; // 5 секунд

// Middleware
const response = await fetch(url, {
  signal: AbortSignal.timeout(MIDDLEWARE_TIMEOUT),
  // ...
});
```

#### 1.2. Добавить fallback логику при ошибках

**Решение:**

```typescript
// При ошибке таймаута - НЕ сбрасывать сессию
try {
  const { user } = await supabase.auth.getUser();
  // ...
} catch (error) {
  if (isTimeoutError(error)) {
    // ⚠️ Временная проблема - пропустить с предупреждением
    console.warn("[middleware] Auth check timeout - allowing request");
    return NextResponse.next();
  }
  // ❌ Реальная проблема авторизации
  return redirectToLogin();
}
```

#### 1.3. Настроить environment variables

**Создать `.env.local` файлы:**

```env
# Backend
NEXT_PUBLIC_BACKEND_URL=http://localhost:3054

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

### **Уровень 2: КЕШИРОВАНИЕ И ОПТИМИЗАЦИЯ** 🚀 (2-4 часа)

#### 2.1. In-Memory кеш для JWT проверок

**Решение:**

```typescript
// shared/auth-sdk/server/middleware-cache.ts
const authCache = new Map<
  string,
  {
    user: User | null;
    expiresAt: number;
  }
>();

const CACHE_TTL = 30_000; // 30 секунд

function getCachedUser(token: string): User | null {
  const cached = authCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }
  return null;
}
```

#### 2.2. Request deduplication

**Проблема:** 50 одновременных запросов = 50 fetch к Supabase

**Решение:** Объединять одновременные запросы

```typescript
const pendingRequests = new Map<string, Promise<User>>();

async function getUserWithDedup(token: string) {
  if (pendingRequests.has(token)) {
    return await pendingRequests.get(token);
  }

  const promise = fetchUser(token);
  pendingRequests.set(token, promise);

  try {
    const user = await promise;
    return user;
  } finally {
    pendingRequests.delete(token);
  }
}
```

#### 2.3. Оптимизация matcher в middleware

**Текущий matcher:**

```typescript
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Проблема:** Assets все равно проходят через middleware

**Решение:** Более агрессивный exclude

```typescript
export const config = {
  matcher: [
    // API routes
    "/api/:path*",
    // Pages только
    "/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|ico|woff|woff2|ttf)$).*)",
  ],
};
```

---

### **Уровень 3: PRODUCTION-READY РЕШЕНИЕ** 🏆 (1-2 дня)

#### 3.1. Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private failures = 0;
  private threshold = 5;
  private timeout = 60_000; // 1 минута

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      throw new Error("Circuit breaker is OPEN");
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  // ...
}
```

#### 3.2. Observability (Monitoring)

```typescript
// Metrics collection
const metrics = {
  middlewareLatency: new Histogram(),
  authCheckFailures: new Counter(),
  timeouts: new Counter(),
};

// Логирование
console.log({
  event: "middleware_auth_check",
  duration: endTime - startTime,
  success: user !== null,
  cached: fromCache,
});
```

#### 3.3. Graceful degradation levels

```typescript
enum AuthCheckMode {
  STRICT, // Все проверки (production default)
  RELAXED, // Skip при timeout (fallback)
  DISABLED, // Только JWT локально (emergency)
}

// Автоматическое переключение при проблемах
if (circuitBreaker.isOpen()) {
  authMode = AuthCheckMode.RELAXED;
}
```

---

## 📊 Приоритизация

### 🔴 **КРИТИЧНЫЙ ПРИОРИТЕТ** (делать сейчас):

1. ✅ Добавить таймауты (3-5 секунд) для всех fetch
2. ✅ Добавить fallback при timeout (не сбрасывать сессию)
3. ✅ Настроить .env.local с правильными URL
4. ✅ Проверить работоспособность backend API

### 🟡 **ВЫСОКИЙ ПРИОРИТЕТ** (после критичных):

5. ✅ Кеширование auth проверок (30 сек TTL)
6. ✅ Request deduplication
7. ✅ Оптимизация middleware matcher

### 🟢 **СРЕДНИЙ ПРИОРИТЕТ** (для production):

8. ✅ Circuit breaker
9. ✅ Metrics и monitoring
10. ✅ Graceful degradation levels

---

## 🎬 План действий

### ✅ **Шаг 1: Быстрое исправление (30 мин)**

- [ ] Создать `.env.local` файлы с правильными credentials
- [ ] Проверить доступность backend API
- [ ] Добавить базовые таймауты

### ✅ **Шаг 2: Стабилизация (1-2 часа)**

- [ ] Реализовать fallback логику
- [ ] Добавить error handling для всех fetch
- [ ] Тестирование на локальном окружении

### ✅ **Шаг 3: Оптимизация (2-4 часа)**

- [ ] Кеширование auth проверок
- [ ] Request deduplication
- [ ] Оптимизация matcher

### ✅ **Шаг 4: Production-ready (1-2 дня)**

- [ ] Circuit breaker
- [ ] Monitoring
- [ ] Load testing
- [ ] Документация

---

## 📝 Требования к реализации

### **Принципы:**

1. **Zero-downtime:** Изменения не должны ломать существующую функциональность
2. **Backward compatible:** Старый код должен продолжать работать
3. **Observability:** Все изменения должны логироваться
4. **Testing:** Unit + Integration тесты для критичных частей
5. **Documentation:** Обновить документацию по middleware

### **Метрики успеха:**

- ✅ 0 таймаутов в middleware
- ✅ < 100ms latency для auth проверок (с кешем)
- ✅ 99.9% uptime middleware
- ✅ Graceful degradation при проблемах с backend

---

## 🤝 Следующие шаги

**Вопросы для обсуждения:**

1. Какой уровень решения хотите реализовать? (1, 2, или 3)
2. Есть ли доступ к backend API? Он запущен?
3. Есть ли Supabase credentials для .env.local?
4. Нужны ли дополнительные инструменты для monitoring?

**Готов приступить к реализации после утверждения плана.**

---

_Документ составлен: 2026-01-18_  
_Автор: AI Assistant_  
_Версия: 1.0_
