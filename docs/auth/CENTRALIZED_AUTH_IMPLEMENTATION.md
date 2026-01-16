# Централизованная авторизация - Реализация

**Дата:** 16 января 2026  
**Статус:** ✅ Реализовано

---

## 🎯 Что сделано

Реализована централизованная система авторизации, где:
- **site** (oblikflow.com) - единая точка входа для login/signup
- **admin, workspace, platform** - редиректят на site для авторизации
- **Supabase cookies** настроены для работы между всеми поддоменами

---

## 📝 Изменения

### 1. Supabase Browser Client - Cookies Domain

**Файл:** `shared/auth-sdk/client/supabase-client.ts`

**Что изменено:**
- Добавлена настройка cookies с `domain: .oblikflow.com`
- Cookies теперь доступны на всех поддоменах (site, admin, workspace, platform)

**Важно:**
```typescript
// Production: domain=.oblikflow.com (доступно на всех поддоменах)
// Development: domain не устанавливается (работает только на localhost)
```

---

### 2. Admin Proxy - Редирект на Site

**Файл:** `admin/proxy.ts`

**Изменения:**
```typescript
// Было:
const loginUrl = new URL("/login", request.url);

// Стало:
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://oblikflow.com';
const loginUrl = new URL("/login", siteUrl);
loginUrl.searchParams.set("redirect", request.url); // полный URL для возврата
```

**Поведение:**
1. Неавторизованный пользователь → `https://oblikflow.com/login?redirect=https://admin.oblikflow.com/`
2. После успешной авторизации → возврат на `https://admin.oblikflow.com/`

---

### 3. Workspace Proxy - Редирект на Site и Admin

**Файл:** `workspace/proxy.ts`

**Изменения:**
1. Нет JWT → редирект на **site/login**
2. Нет `current_enterprise_id` → редирект на **admin**
3. Нет доступа к предприятию → редирект на **admin** (+ очистка cookie)

**Важно:**
```typescript
// Редирект на admin использует NEXT_PUBLIC_ADMIN_URL
const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.oblikflow.com';
return NextResponse.redirect(new URL("/", adminUrl));
```

---

### 4. Platform Proxy - Редирект на Site и Admin

**Файл:** `platform/proxy.ts`

**Изменения:**
1. Нет JWT → редирект на **site/login**
2. Не superAdmin → редирект на **admin**

---

## 🔄 Флоу авторизации

### Сценарий 1: Первый вход на admin

```
1. Пользователь открывает admin.oblikflow.com
   ↓
2. admin/proxy.ts проверяет JWT → не найден
   ↓
3. Редирект на oblikflow.com/login?redirect=https://admin.oblikflow.com/
   ↓
4. Пользователь вводит email/пароль
   ↓
5. Supabase устанавливает cookies с domain=.oblikflow.com
   ↓
6. site/login редиректит на redirect параметр
   ↓
7. Пользователь попадает на admin.oblikflow.com (уже авторизован)
```

### Сценарий 2: Переход между приложениями

```
1. Пользователь авторизован на oblikflow.com
   ↓
2. Открывает admin.oblikflow.com
   ↓
3. admin/proxy.ts проверяет JWT → найден (cookies работают)
   ↓
4. Доступ разрешен ✅
```

### Сценарий 3: Workspace без выбора предприятия

```
1. Пользователь открывает workspace.oblikflow.com
   ↓
2. workspace/proxy.ts проверяет JWT → найден ✅
   ↓
3. Проверяет cookie current_enterprise_id → не найден
   ↓
4. Редирект на admin.oblikflow.com для выбора предприятия
```

---

## 🌐 Environment Variables

**Все переменные находятся в файле `env` (корень проекта):**

```bash
NEXT_PUBLIC_BASE_DOMAIN=oblikflow.com
NEXT_PUBLIC_SITE_URL=https://oblikflow.com
NEXT_PUBLIC_ADMIN_URL=https://admin.oblikflow.com
NEXT_PUBLIC_WORKSPACE_URL=https://workspace.oblikflow.com
NEXT_PUBLIC_PLATFORM_URL=https://platform.oblikflow.com
NEXT_PUBLIC_COOKIE_DOMAIN=.oblikflow.com
```

**Для development (local):**
```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
NEXT_PUBLIC_WORKSPACE_URL=http://localhost:3002
NEXT_PUBLIC_PLATFORM_URL=http://localhost:3003
# NEXT_PUBLIC_COOKIE_DOMAIN не устанавливается в dev
```

---

## 🧪 Тестирование

### Test 1: Cookies между поддоменами (Production)

1. Авторизуйтесь на `oblikflow.com`
2. Откройте DevTools → Application → Cookies
3. Проверьте что Supabase cookies имеют `Domain: .oblikflow.com`
4. Откройте `admin.oblikflow.com`
5. Проверьте DevTools → Cookies - должны быть те же cookies
6. Вы должны попасть на admin БЕЗ редиректа на login

### Test 2: Редирект неавторизованных (Production)

1. Откройте `admin.oblikflow.com` в режиме инкогнито
2. Должен произойти редирект на `oblikflow.com/login?redirect=https://admin.oblikflow.com/`
3. После авторизации должен вернуться на `admin.oblikflow.com`

### Test 3: Workspace без предприятия

1. Авторизуйтесь на `oblikflow.com`
2. Откройте `workspace.oblikflow.com` (без cookie `current_enterprise_id`)
3. Должен произойти редирект на `admin.oblikflow.com`

### Test 4: Platform без superAdmin

1. Авторизуйтесь как обычный пользователь
2. Откройте `platform.oblikflow.com`
3. Должен произойти редирект на `admin.oblikflow.com`

---

## 🚀 Деплой на Vercel

### Шаг 1: Проверить Environment Variables на Vercel

Для КАЖДОГО проекта (site, admin, workspace, platform) добавить:

```
NEXT_PUBLIC_SITE_URL=https://oblikflow.com
NEXT_PUBLIC_ADMIN_URL=https://admin.oblikflow.com
NEXT_PUBLIC_WORKSPACE_URL=https://workspace.oblikflow.com
NEXT_PUBLIC_PLATFORM_URL=https://platform.oblikflow.com
NEXT_PUBLIC_COOKIE_DOMAIN=.oblikflow.com
```

### Шаг 2: Деплой в правильном порядке

```bash
# 1. Деплой shared (базовые изменения в cookies)
git add shared/auth-sdk/client/supabase-client.ts
git commit -m "fix: configure Supabase cookies domain for subdomains"
git push

# 2. Деплой site (должен деплоиться первым)
# Vercel автоматически задеплоит site

# 3. Деплой admin
# Vercel автоматически задеплоит admin

# 4. Деплой workspace
# Vercel автоматически задеплоит workspace

# 5. Деплой platform
# Vercel автоматически задеплоит platform
```

### Шаг 3: Проверить после деплоя

1. Очистить все cookies в браузере
2. Открыть `admin.oblikflow.com`
3. Должен редиректить на `oblikflow.com/login`
4. Авторизоваться
5. Должен вернуться на `admin.oblikflow.com`
6. Открыть `workspace.oblikflow.com` - должен работать без повторной авторизации

---

## 🐛 Troubleshooting

### Проблема: Бесконечный редирект на admin

**Симптомы:**
```
admin.oblikflow.com → admin.oblikflow.com/login → ERR_TOO_MANY_REDIRECTS
```

**Причина:** Cookies не работают между поддоменами

**Решение:**
1. Проверить что `NEXT_PUBLIC_COOKIE_DOMAIN=.oblikflow.com` установлен на Vercel
2. Очистить cookies в браузере
3. Проверить в DevTools что Supabase cookies имеют `Domain: .oblikflow.com`

---

### Проблема: После авторизации не возвращает на admin

**Симптомы:**
```
После login на site остаюсь на oblikflow.com вместо admin.oblikflow.com
```

**Причина:** Не обрабатывается redirect параметр

**Решение:**
Проверить что в `site/app/login/page.tsx` есть обработка redirect:
```typescript
const redirect = searchParams.get("redirect");
window.location.href = redirect || "/";
```

---

### Проблема: Не работает в development (localhost)

**Симптомы:**
```
Cookies не видны между localhost:3000 и localhost:3001
```

**Причина:** Localhost не поддерживает shared cookies между портами

**Решение (для локальной разработки):**

**Вариант 1: Использовать локальные домены**
```bash
# /etc/hosts
127.0.0.1 local.oblikflow.com
127.0.0.1 admin.local.oblikflow.com
127.0.0.1 workspace.local.oblikflow.com
127.0.0.1 platform.local.oblikflow.com
```

Затем:
```bash
NEXT_PUBLIC_COOKIE_DOMAIN=.local.oblikflow.com
```

**Вариант 2: Тестировать каждое приложение отдельно**
- Для site: тестируйте auth на `localhost:3000`
- Для admin: временно отключите проверку JWT в development

---

## 📚 Связанные документы

- [Middleware Implementation Guide](./MIDDLEWARE_IMPLEMENTATION_GUIDE.md)
- [Backend API Specification](./BACKEND_API_SPEC.md)
- [Vercel Deployment](../VERCEL_DEPLOYMENT.md)

---

## ✅ Checklist для QA

- [ ] Авторизация на site устанавливает cookies с domain=.oblikflow.com
- [ ] Неавторизованный доступ к admin редиректит на site/login
- [ ] После авторизации возвращает на admin
- [ ] Cookies работают на всех поддоменах (site, admin, workspace, platform)
- [ ] Workspace без current_enterprise_id редиректит на admin
- [ ] Platform без superAdmin редиректит на admin
- [ ] Logout на одном домене очищает cookies на всех доменах

---

**Статус:** ✅ Готово к деплою  
**Автор:** AI Assistant  
**Дата:** 16 января 2026
