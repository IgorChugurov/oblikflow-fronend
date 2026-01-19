# Technical Specification: Middleware Resilience & Performance

> ⚠️ **ДОКУМЕНТ НЕ АКТУАЛЕН**  
> Эта спецификация описывала сложное решение (700+ строк кода):
>
> - Circuit breakers
> - Request deduplication
> - Retry logic
> - Таймауты
>
> **Реальная проблема оказалась намного проще:**  
> Использование `getUser()` (network запрос) вместо `getSession()` (локальное чтение JWT).
>
> **Реализованное простое решение:** [MIDDLEWARE_FIX_SIMPLE.md](./MIDDLEWARE_FIX_SIMPLE.md)
>
> - 3 изменения
> - 30 минут
> - 0 network запросов

---

**Связанный документ:** [MIDDLEWARE_TIMEOUT_ANALYSIS.md](./MIDDLEWARE_TIMEOUT_ANALYSIS.md)  
**Дата:** 2026-01-18  
**~~Статус: 📋 SPECIFICATION~~**  
**Статус:** ⚠️ НЕ АКТУАЛЕН (см. MIDDLEWARE_FIX_SIMPLE.md)

---

## 🎯 Цель

Создать отказоустойчивую (resilient) архитектуру middleware с:

- ⚡ Таймаутами для всех внешних запросов
- 🔄 Graceful degradation при сбоях
- 📊 Кешированием для оптимизации
- 🎯 Observability для мониторинга

---

## 📦 Новые модули

### 1. `shared/auth-sdk/server/middleware-resilience.ts`

Центральный модуль для управления отказоустойчивостью middleware.

```typescript
/**
 * Middleware Resilience - отказоустойчивость для middleware
 *
 * Функциональность:
 * - Таймауты для fetch запросов
 * - Кеширование auth проверок
 * - Circuit breaker pattern
 * - Request deduplication
 * - Error handling с fallback
 */

import { User } from "../types";
import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface ResilienceConfig {
  // Таймауты
  authCheckTimeout: number; // default: 3000ms (3 сек)
  backendApiTimeout: number; // default: 5000ms (5 сек)

  // Кеширование
  cacheTTL: number; // default: 30000ms (30 сек)
  cacheEnabled: boolean; // default: true

  // Circuit Breaker
  circuitBreakerEnabled: boolean; // default: true
  failureThreshold: number; // default: 5
  recoveryTimeout: number; // default: 60000ms (1 мин)

  // Fallback
  allowFallbackOnTimeout: boolean; // default: true
  allowFallbackOnError: boolean; // default: false

  // Deduplication
  deduplicationEnabled: boolean; // default: true
}

export const DEFAULT_RESILIENCE_CONFIG: ResilienceConfig = {
  authCheckTimeout: 3000,
  backendApiTimeout: 5000,
  cacheTTL: 30000,
  cacheEnabled: true,
  circuitBreakerEnabled: true,
  failureThreshold: 5,
  recoveryTimeout: 60000,
  allowFallbackOnTimeout: true,
  allowFallbackOnError: false,
  deduplicationEnabled: true,
};

// ============================================================================
// AUTH CACHE
// ============================================================================

interface CachedAuthResult {
  user: User | null;
  expiresAt: number;
  timestamp: number;
}

class AuthCache {
  private cache = new Map<string, CachedAuthResult>();
  private ttl: number;

  constructor(ttl: number) {
    this.ttl = ttl;
  }

  get(key: string): User | null | undefined {
    const cached = this.cache.get(key);

    if (!cached) {
      return undefined; // не в кеше
    }

    if (cached.expiresAt < Date.now()) {
      this.cache.delete(key);
      return undefined; // истек
    }

    return cached.user;
  }

  set(key: string, user: User | null): void {
    this.cache.set(key, {
      user,
      expiresAt: Date.now() + this.ttl,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Периодическая очистка истекших записей
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }
}

// ============================================================================
// REQUEST DEDUPLICATION
// ============================================================================

class RequestDeduplicator {
  private pending = new Map<string, Promise<User | null>>();

  async deduplicate(
    key: string,
    fn: () => Promise<User | null>
  ): Promise<User | null> {
    // Если запрос уже выполняется - ждем его
    if (this.pending.has(key)) {
      return await this.pending.get(key)!;
    }

    // Запускаем новый запрос
    const promise = fn();
    this.pending.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.pending.delete(key);
    }
  }

  size(): number {
    return this.pending.size;
  }
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures = 0;
  private lastFailureTime = 0;
  private threshold: number;
  private timeout: number;

  constructor(threshold: number, timeout: number) {
    this.threshold = threshold;
    this.timeout = timeout;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Проверяем можно ли выполнять запрос
    this.checkState();

    if (this.state === "OPEN") {
      throw new CircuitBreakerOpenError("Circuit breaker is OPEN");
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

  private checkState(): void {
    if (this.state === "OPEN") {
      // Проверяем можно ли перейти в HALF_OPEN
      if (Date.now() - this.lastFailureTime >= this.timeout) {
        console.log("[CircuitBreaker] Transitioning to HALF_OPEN");
        this.state = "HALF_OPEN";
        this.failures = 0;
      }
    }
  }

  private onSuccess(): void {
    if (this.state === "HALF_OPEN") {
      console.log("[CircuitBreaker] Success in HALF_OPEN, closing circuit");
      this.state = "CLOSED";
    }
    this.failures = 0;
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      console.error(
        `[CircuitBreaker] Failure threshold (${this.threshold}) reached, opening circuit`
      );
      this.state = "OPEN";
    }
  }

  getState(): CircuitState {
    this.checkState();
    return this.state;
  }

  getMetrics() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset(): void {
    this.state = "CLOSED";
    this.failures = 0;
    this.lastFailureTime = 0;
  }
}

class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircuitBreakerOpenError";
  }
}

// ============================================================================
// RESILIENT AUTH CLIENT
// ============================================================================

export class ResilientAuthClient {
  private config: ResilienceConfig;
  private cache: AuthCache;
  private deduplicator: RequestDeduplicator;
  private circuitBreaker: CircuitBreaker;

  constructor(config: Partial<ResilienceConfig> = {}) {
    this.config = { ...DEFAULT_RESILIENCE_CONFIG, ...config };
    this.cache = new AuthCache(this.config.cacheTTL);
    this.deduplicator = new RequestDeduplicator();
    this.circuitBreaker = new CircuitBreaker(
      this.config.failureThreshold,
      this.config.recoveryTimeout
    );

    // Запускаем периодическую очистку кеша
    this.startCleanupTimer();
  }

  /**
   * Получить пользователя с отказоустойчивостью
   */
  async getUser(
    supabase: SupabaseClient,
    cacheKey: string
  ): Promise<{ user: User | null; fromCache: boolean; error?: Error }> {
    const startTime = Date.now();

    try {
      // 1. Проверяем кеш
      if (this.config.cacheEnabled) {
        const cached = this.cache.get(cacheKey);
        if (cached !== undefined) {
          console.log(`[ResilientAuth] Cache HIT for ${cacheKey}`);
          return { user: cached, fromCache: true };
        }
      }

      // 2. Выполняем запрос с deduplication
      const user = await this.fetchUserWithResilience(supabase, cacheKey);

      // 3. Сохраняем в кеш
      if (this.config.cacheEnabled) {
        this.cache.set(cacheKey, user);
      }

      const duration = Date.now() - startTime;
      console.log(
        `[ResilientAuth] User fetched in ${duration}ms (user: ${
          user?.id || "null"
        })`
      );

      return { user, fromCache: false };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[ResilientAuth] Error after ${duration}ms:`,
        error instanceof Error ? error.message : error
      );

      // Fallback логика
      return this.handleError(error as Error, cacheKey);
    }
  }

  /**
   * Fetch с отказоустойчивостью
   */
  private async fetchUserWithResilience(
    supabase: SupabaseClient,
    cacheKey: string
  ): Promise<User | null> {
    // Request deduplication
    if (this.config.deduplicationEnabled) {
      return await this.deduplicator.deduplicate(cacheKey, () =>
        this.fetchUserWithCircuitBreaker(supabase)
      );
    }

    return await this.fetchUserWithCircuitBreaker(supabase);
  }

  /**
   * Fetch через circuit breaker
   */
  private async fetchUserWithCircuitBreaker(
    supabase: SupabaseClient
  ): Promise<User | null> {
    if (!this.config.circuitBreakerEnabled) {
      return await this.fetchUserWithTimeout(supabase);
    }

    try {
      return await this.circuitBreaker.execute(() =>
        this.fetchUserWithTimeout(supabase)
      );
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        console.warn("[ResilientAuth] Circuit breaker is OPEN, using fallback");

        // При открытом circuit breaker - fallback
        if (this.config.allowFallbackOnError) {
          return null; // Пропускаем без проверки
        }
      }
      throw error;
    }
  }

  /**
   * Fetch с таймаутом
   */
  private async fetchUserWithTimeout(
    supabase: SupabaseClient
  ): Promise<User | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.authCheckTimeout);

    try {
      // Используем undici fetch с signal
      const {
        data: { user },
      } = await supabase.auth.getUser();

      clearTimeout(timeoutId);
      return user ? transformSupabaseUser(user) : null;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new TimeoutError(
          `Auth check timeout after ${this.config.authCheckTimeout}ms`
        );
      }

      throw error;
    }
  }

  /**
   * Обработка ошибок с fallback
   */
  private handleError(
    error: Error,
    cacheKey: string
  ): { user: User | null; fromCache: boolean; error: Error } {
    const isTimeout = error instanceof TimeoutError;
    const allowFallback =
      (isTimeout && this.config.allowFallbackOnTimeout) ||
      this.config.allowFallbackOnError;

    if (allowFallback) {
      console.warn(
        `[ResilientAuth] Fallback: allowing request despite error (${error.message})`
      );

      // Пытаемся вернуть из кеша если есть (даже если истек)
      const cached = this.cache.get(cacheKey);
      if (cached !== undefined) {
        console.warn("[ResilientAuth] Using expired cache as fallback");
        return { user: cached, fromCache: true, error };
      }

      // Возвращаем null но не редиректим
      return { user: null, fromCache: false, error };
    }

    // Не используем fallback - пробрасываем ошибку
    throw error;
  }

  /**
   * Получить метрики
   */
  getMetrics() {
    return {
      cache: {
        size: this.cache.size(),
        ttl: this.config.cacheTTL,
      },
      deduplicator: {
        pending: this.deduplicator.size(),
      },
      circuitBreaker: this.circuitBreaker.getMetrics(),
      config: this.config,
    };
  }

  /**
   * Очистить кеш
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Сбросить circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Запуск периодической очистки кеша
   */
  private startCleanupTimer(): void {
    // Очищаем кеш каждые 5 минут
    setInterval(() => {
      this.cache.cleanup();
    }, 5 * 60 * 1000);
  }
}

// ============================================================================
// UTILITY CLASSES
// ============================================================================

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function transformSupabaseUser(supabaseUser: any): User | null {
  if (!supabaseUser) return null;

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || "",
    email_verified: supabaseUser.email_confirmed_at !== null,
    created_at: supabaseUser.created_at,
  };
}

/**
 * Создать AbortSignal с таймаутом
 * (для Node.js < 18 нужна полифил)
 */
export function createTimeoutSignal(timeoutMs: number): AbortSignal {
  if ("timeout" in AbortSignal) {
    // Node.js >= 18
    return AbortSignal.timeout(timeoutMs);
  }

  // Fallback для старых версий
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

/**
 * Fetch с таймаутом
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 5000
): Promise<Response> {
  const signal = createTimeoutSignal(timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new TimeoutError(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

// Singleton для использования в middleware
export const resilientAuthClient = new ResilientAuthClient();

// Экспорт типов
export { TimeoutError, CircuitBreakerOpenError };
```

---

## 🔄 Интеграция в существующий middleware

### 2. Обновить `shared/auth-sdk/server/middleware.ts`

```typescript
/**
 * Middleware с отказоустойчивостью
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "../types";
import { resilientAuthClient } from "./middleware-resilience";

export function createBaseMiddleware(config: BaseMiddlewareConfig) {
  return async (request: NextRequest): Promise<BaseMiddlewareResult> {
    const response = NextResponse.next({ request });

    const supabase = createServerClient(
      config.supabaseUrl,
      config.supabaseAnonKey,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            const cookieDomain =
              process.env.NODE_ENV === "production"
                ? process.env.NEXT_PUBLIC_COOKIE_DOMAIN || ".oblikflow.com"
                : undefined;

            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, {
                ...options,
                domain: cookieDomain,
              });
            });
          },
        },
      }
    );

    // ✅ НОВОЕ: Используем resilient client
    const cacheKey = generateCacheKey(request);
    const { user, fromCache, error } = await resilientAuthClient.getUser(
      supabase,
      cacheKey
    );

    // Логирование
    if (error) {
      console.warn(
        `[middleware] Auth check failed: ${error.message}, user: ${user?.id || 'null'}, fromCache: ${fromCache}`
      );
    } else {
      console.log(
        `[middleware] User: ${user?.id || 'null'} (fromCache: ${fromCache})`
      );
    }

    // Locale handling (без изменений)
    const locale = handleLocale(request, response, config);

    // Headers
    response.headers.set("x-next-intl-locale", locale);
    response.headers.set("x-pathname", request.nextUrl.pathname);
    if (user?.id) {
      response.headers.set("x-user-id", user.id);
    }

    return { response, user, supabaseUser: null, locale, supabase };
  };
}

/**
 * Генерация cache key на основе auth токенов
 */
function generateCacheKey(request: NextRequest): string {
  // Используем auth токены как ключ кеша
  const authToken0 = request.cookies.get('sb-jzbrzmtniyjpzmpsctmh-auth-token.0')?.value || '';
  const authToken1 = request.cookies.get('sb-jzbrzmtniyjpzmpsctmh-auth-token.1')?.value || '';

  // Создаем hash из токенов (первые 16 символов для краткости)
  const combined = authToken0 + authToken1;
  return combined.substring(0, 16) || 'anonymous';
}
```

---

## 🔧 Обновление backend API проверок

### 3. Обновить `shared/auth-sdk/server/backend-api-service.ts`

```typescript
import { fetchWithTimeout } from "./middleware-resilience";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const BACKEND_API_TIMEOUT = 5000; // 5 секунд

export async function checkSuperAdmin(token: string): Promise<boolean> {
  if (!BACKEND_URL) {
    console.error("[Backend API] NEXT_PUBLIC_BACKEND_URL not configured");
    return false;
  }

  try {
    // ✅ НОВОЕ: используем fetchWithTimeout
    const response = await fetchWithTimeout(
      `${BACKEND_URL}/api/auth/check-superadmin`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
      BACKEND_API_TIMEOUT
    );

    return response.ok;
  } catch (error) {
    // ✅ НОВОЕ: различаем типы ошибок
    if (error instanceof TimeoutError) {
      console.error("[Backend API] Timeout checking superAdmin");
    } else {
      console.error("[Backend API] Error checking superAdmin:", error);
    }

    // fail-safe: при ошибке запрещаем доступ
    return false;
  }
}

export async function checkEnterpriseAccess(
  token: string,
  enterpriseId: string
): Promise<boolean> {
  if (!BACKEND_URL) {
    console.error("[Backend API] NEXT_PUBLIC_BACKEND_URL not configured");
    return false;
  }

  if (!enterpriseId) {
    console.warn(
      "[Backend API] enterpriseId is required for checkEnterpriseAccess"
    );
    return false;
  }

  try {
    // ✅ НОВОЕ: используем fetchWithTimeout
    const response = await fetchWithTimeout(
      `${BACKEND_URL}/api/auth/check-enterprise-access?enterpriseId=${enterpriseId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
      BACKEND_API_TIMEOUT
    );

    return response.ok;
  } catch (error) {
    // ✅ НОВОЕ: различаем типы ошибок
    if (error instanceof TimeoutError) {
      console.error("[Backend API] Timeout checking enterprise access");
    } else {
      console.error("[Backend API] Error checking enterprise access:", error);
    }

    // fail-safe: при ошибке запрещаем доступ
    return false;
  }
}
```

---

## 📊 Monitoring endpoint

### 4. Добавить `admin/app/api/monitoring/middleware/route.ts`

```typescript
/**
 * API endpoint для мониторинга middleware
 * GET /api/monitoring/middleware
 */

import { NextResponse } from "next/server";
import { resilientAuthClient } from "shared/auth-sdk/server/middleware-resilience";

export async function GET() {
  const metrics = resilientAuthClient.getMetrics();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    metrics,
    health: determineHealth(metrics),
  });
}

function determineHealth(metrics: any): string {
  const cbState = metrics.circuitBreaker.state;

  if (cbState === "OPEN") {
    return "DEGRADED";
  }

  if (cbState === "HALF_OPEN") {
    return "RECOVERING";
  }

  return "HEALTHY";
}
```

---

## ✅ Чек-лист реализации

### **Этап 1: Базовая отказоустойчивость**

- [ ] Создать `middleware-resilience.ts`
- [ ] Реализовать `AuthCache`
- [ ] Реализовать `RequestDeduplicator`
- [ ] Реализовать `CircuitBreaker`
- [ ] Реализовать `ResilientAuthClient`
- [ ] Добавить `fetchWithTimeout` utility
- [ ] Unit тесты для всех классов

### **Этап 2: Интеграция**

- [ ] Обновить `shared/auth-sdk/server/middleware.ts`
- [ ] Обновить `shared/auth-sdk/server/backend-api-service.ts`
- [ ] Добавить генерацию cache keys
- [ ] Обновить все proxy файлы (admin, platform, workspace, site)
- [ ] Integration тесты

### **Этап 3: Monitoring**

- [ ] Добавить monitoring endpoint
- [ ] Добавить structured logging
- [ ] Добавить metrics collection
- [ ] Dashboard для отображения метрик

### **Этап 4: Configuration**

- [ ] Создать `.env.local` templates
- [ ] Документация по настройке
- [ ] Environment-specific конфигурация
- [ ] Feature flags для включения/отключения

### **Этап 5: Testing**

- [ ] Unit тесты (coverage > 80%)
- [ ] Integration тесты
- [ ] Load тесты (timeout scenarios)
- [ ] Chaos engineering тесты

---

## 🔍 Тестирование

### Unit тесты примеры:

```typescript
describe("AuthCache", () => {
  it("should cache user for TTL period", async () => {
    const cache = new AuthCache(1000); // 1 sec TTL
    const user = { id: "123", email: "test@test.com" };

    cache.set("key1", user);
    expect(cache.get("key1")).toEqual(user);

    await sleep(1100); // Wait for expiry
    expect(cache.get("key1")).toBeUndefined();
  });
});

describe("CircuitBreaker", () => {
  it("should open circuit after threshold failures", async () => {
    const cb = new CircuitBreaker(3, 60000);

    // 3 failures
    for (let i = 0; i < 3; i++) {
      await expect(
        cb.execute(() => Promise.reject(new Error("fail")))
      ).rejects.toThrow();
    }

    expect(cb.getState()).toBe("OPEN");
  });
});
```

---

## 📈 Метрики успеха

### Performance:

- ✅ Auth check latency < 50ms (с кешем)
- ✅ Auth check latency < 300ms (без кеша)
- ✅ 0 таймаутов при нормальной работе Supabase
- ✅ < 1% failed requests

### Resilience:

- ✅ Graceful degradation при Supabase недоступен
- ✅ No user session loss при временных сбоях
- ✅ Circuit breaker срабатывает при проблемах
- ✅ Recovery в течение 60 секунд

### Resource usage:

- ✅ Memory footprint < 50MB для кеша
- ✅ Cache hit rate > 70%
- ✅ Request deduplication efficiency > 50%

---

_Документ составлен: 2026-01-18_  
_Автор: AI Assistant_  
_Версия: 1.0_
