/**
 * Session Cache - кеширование auth сессий
 *
 * Кеширует результаты проверки JWT токенов чтобы избежать
 * повторных вызовов getSession() для одного и того же токена.
 *
 * TTL: 30 секунд (по требованию)
 */

import type { User } from "../types";

interface CachedSession {
  user: User | null;
  expiresAt: number;
  timestamp: number;
}

class SessionCache {
  private cache = new Map<string, CachedSession>();
  private readonly ttl = 30_000; // 30 секунд

  /**
   * Получить пользователя из кеша
   * @returns User | null если есть в кеше и не истек, undefined если нет в кеше
   */
  get(cacheKey: string): User | null | undefined {
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return undefined; // нет в кеше
    }

    // Проверяем истек ли
    if (cached.expiresAt < Date.now()) {
      this.cache.delete(cacheKey);
      return undefined; // истек
    }

    return cached.user;
  }

  /**
   * Сохранить пользователя в кеш
   */
  set(cacheKey: string, user: User | null): void {
    const now = Date.now();
    this.cache.set(cacheKey, {
      user,
      expiresAt: now + this.ttl,
      timestamp: now,
    });
  }

  /**
   * Очистить весь кеш
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Получить размер кеша
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Периодическая очистка истекших записей
   * Вызывается автоматически через 5 минут
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt < now) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[SessionCache] Cleaned up ${removed} expired entries`);
    }
  }

  /**
   * Получить метрики кеша
   */
  getMetrics() {
    return {
      size: this.cache.size,
      ttl: this.ttl,
    };
  }
}

// Singleton instance
export const sessionCache = new SessionCache();

// Запускаем периодическую очистку каждые 5 минут
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    sessionCache.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * Генерация cache key на основе session токенов
 * Использует первые части auth токенов из cookies
 */
export function generateSessionCacheKey(cookies: Map<string, string>): string {
  // Supabase хранит токен в 2 частях (для больших JWT)
  const token0 = cookies.get("sb-jzbrzmtniyjpzmpsctmh-auth-token.0") || "";
  const token1 = cookies.get("sb-jzbrzmtniyjpzmpsctmh-auth-token.1") || "";

  // Создаем короткий hash из токенов
  const combined = token0 + token1;

  if (!combined) {
    return "anonymous";
  }

  // Берем первые 16 символов как cache key
  return combined.substring(0, 16);
}
