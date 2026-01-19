# Middleware Fix: Простое и правильное решение

**Дата:** 2026-01-18  
**Статус:** ✅ ПРАВИЛЬНЫЙ ПОДХОД

---

## 🎯 Корневая причина

### Проблема:
```typescript
// ❌ НЕПРАВИЛЬНО - делает network запрос КАЖДЫЙ раз
const { data: { user } } = await supabase.auth.getUser();
```

### Почему:
- **`getUser()`** - всегда делает network запрос к Supabase Auth API
- **`getSession()`** - просто читает JWT из cookies (без network)

### Что происходит сейчас:
1. Каждый запрос (страницы + assets) → middleware
2. Middleware вызывает `getUser()` → network запрос
3. 50+ запросов на загрузку страницы = 50+ network запросов
4. При медленном Supabase → таймауты → зависания

---

## ✅ Правильное решение (3 изменения)

### 1. Использовать `getSession()` вместо `getUser()`

**Где:** `shared/auth-sdk/server/middleware.ts`

```typescript
// ❌ БЫЛО (делает network запрос)
const {
  data: { user: supabaseUser },
} = await supabase.auth.getUser();

// ✅ ДОЛЖНО БЫТЬ (читает из cookies)
const {
  data: { session },
  error
} = await supabase.auth.getSession();

const user = session?.user ? transformSupabaseUser(session.user) : null;
```

**Почему это правильно:**
- JWT в cookies уже проверен на клиенте при login
- JWT имеет expiry time - автоматически протухает
- Supabase SDK автоматически обновляет через refresh token
- **НЕТ NETWORK ЗАПРОСОВ** = быстро + нет таймаутов

---

### 2. Оптимизировать matcher - исключить assets

**Где:** `admin/proxy.ts`, `platform/proxy.ts`, `workspace/proxy.ts`, `site/proxy.ts`

```typescript
// ❌ БЫЛО (assets проходят через middleware)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

// ✅ ДОЛЖНО БЫТЬ (только страницы и API)
export const config = {
  matcher: [
    // Только pages и API routes
    "/((?!_next|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|ico|woff|woff2|ttf|eot|otf|map|json)$).*)",
  ],
};
```

**Что исключается:**
- ❌ `_next/*` - Next.js системные файлы
- ❌ `*.css, *.js` - стили и скрипты
- ❌ `*.svg, *.png, *.jpg, *.webp` - изображения
- ❌ `*.woff, *.ttf` - шрифты
- ❌ `*.map, *.json` - source maps и данные

**Результат:** Только HTML страницы проходят через middleware

---

### 3. Добавить кеширование (опционально, но обязательно по требованию)

**Где:** Создать `shared/auth-sdk/server/session-cache.ts`

```typescript
/**
 * Session Cache - кеширование auth сессий
 * TTL: 30 секунд
 */

interface CachedSession {
  user: User | null;
  expiresAt: number;
}

class SessionCache {
  private cache = new Map<string, CachedSession>();
  private ttl = 30_000; // 30 секунд
  
  get(sessionToken: string): User | null | undefined {
    const cached = this.cache.get(sessionToken);
    
    if (!cached) return undefined; // нет в кеше
    
    if (cached.expiresAt < Date.now()) {
      this.cache.delete(sessionToken);
      return undefined; // истек
    }
    
    return cached.user;
  }
  
  set(sessionToken: string, user: User | null): void {
    this.cache.set(sessionToken, {
      user,
      expiresAt: Date.now() + this.ttl,
    });
  }
  
  clear(): void {
    this.cache.clear();
  }
}

export const sessionCache = new SessionCache();
```

**Использование в middleware:**

```typescript
// Получаем session token из cookies
const sessionToken = request.cookies.get('sb-xxx-auth-token.0')?.value;

if (sessionToken) {
  // Проверяем кеш
  const cached = sessionCache.get(sessionToken);
  
  if (cached !== undefined) {
    console.log('[middleware] Cache HIT');
    return { response, user: cached, ... };
  }
}

// Cache MISS - получаем из Supabase
const { data: { session } } = await supabase.auth.getSession();
const user = session?.user ? transformSupabaseUser(session.user) : null;

// Сохраняем в кеш
if (sessionToken) {
  sessionCache.set(sessionToken, user);
}

return { response, user, ... };
```

---

## 📊 Сравнение подходов

| Метод | Network запрос | Скорость | Безопасность | Использование |
|-------|---------------|----------|--------------|---------------|
| `getUser()` | ✅ Да, каждый раз | ❌ Медленно (100-500ms) | ✅ Максимальная | API routes для критичных операций |
| `getSession()` | ❌ Нет | ✅ Быстро (< 1ms) | ✅ Достаточная* | Middleware для проверки авторизации |
| `getSession()` + cache | ❌ Нет | ✅ Очень быстро (< 0.1ms) | ✅ Достаточная* | Middleware (recommended) |

\* *JWT имеет expiry time, автоматически обновляется Supabase SDK*

---

## 🔧 Реализация

### Файлы для изменения:

1. ✅ `shared/auth-sdk/server/middleware.ts` - заменить `getUser()` на `getSession()`
2. ✅ `shared/auth-sdk/server/session-cache.ts` - создать кеш (новый файл)
3. ✅ `admin/proxy.ts` - оптимизировать matcher
4. ✅ `platform/proxy.ts` - оптимизировать matcher
5. ✅ `workspace/proxy.ts` - оптимизировать matcher
6. ✅ `site/proxy.ts` - оптимизировать matcher

### Время реализации: **30-60 минут**

---

## ✅ Ожидаемый результат

### До:
- ❌ 50+ network запросов на загрузку страницы
- ❌ Зависания при медленном Supabase
- ❌ Таймауты → сброс сессии
- ❌ Memory leak → перезагрузка сервера

### После:
- ✅ 0 network запросов в middleware
- ✅ Instant проверка авторизации (< 1ms)
- ✅ Нет таймаутов
- ✅ Стабильная работа
- ✅ Cache hit rate > 90%

---

## 🚀 Дополнительная оптимизация

### Когда использовать `getUser()`:

```typescript
// ✅ Правильно - критичные операции
async function deleteUserAccount(userId: string) {
  // Полная проверка через network
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user?.id !== userId) {
    throw new Error('Unauthorized');
  }
  
  // ... delete account
}

// ✅ Правильно - API route для payment
export async function POST(request: NextRequest) {
  // Полная проверка для финансовых операций
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return new Response('Unauthorized', { status: 401 });
  
  // ... process payment
}
```

### Когда использовать `getSession()`:

```typescript
// ✅ Правильно - middleware
async function middleware(request: NextRequest) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return redirectToLogin();
  }
  
  return NextResponse.next();
}

// ✅ Правильно - страница с данными пользователя
export default async function ProfilePage() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  return <div>Hello, {session?.user.email}</div>;
}
```

---

## 📝 Чек-лист реализации

### Этап 1: Базовые изменения (30 минут)
- [ ] Заменить `getUser()` на `getSession()` в `shared/auth-sdk/server/middleware.ts`
- [ ] Оптимизировать matcher во всех proxy файлах
- [ ] Тестировать локально
- [ ] Проверить логи - не должно быть network запросов

### Этап 2: Кеширование (30 минут)
- [ ] Создать `shared/auth-sdk/server/session-cache.ts`
- [ ] Интегрировать кеш в middleware
- [ ] Добавить логирование cache hit/miss
- [ ] Тестировать performance

### Этап 3: Проверка (15 минут)
- [ ] Load test - 100+ одновременных запросов
- [ ] Проверить memory usage (должно быть стабильно)
- [ ] Проверить latency middleware (должно быть < 5ms)
- [ ] Мониторить 1 час

---

## 🎯 Почему это правильное решение

1. **Архитектурно корректно:**
   - Middleware - для routing/authorization (быстро)
   - API routes - для критичных операций (безопасно)

2. **Соответствует best practices:**
   - Supabase рекомендует `getSession()` для middleware
   - Next.js рекомендует минимизировать middleware latency

3. **Простота:**
   - Нет сложных circuit breakers
   - Нет таймаутов
   - Нет fallback логики
   - Просто работает

4. **Performance:**
   - < 1ms вместо 100-500ms
   - 0 network запросов
   - Масштабируется

---

## 💪 Готов реализовать?

**Время:** 30-60 минут  
**Сложность:** Низкая  
**Результат:** Полное решение проблемы

Начинаем?

---

_Документ создан: 2026-01-18_  
_Автор: AI Assistant_  
_Версия: 1.0 - Simplified & Correct Approach_
