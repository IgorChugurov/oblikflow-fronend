# Известные проблемы и решения

**Последнее обновление:** 14 января 2026

---

## 🐛 Известные проблемы

### 1. Cookie не работают на localhost между портами

**Проблема:**
Cross-subdomain cookies не работают на localhost с разными портами (3000, 3001, 3002, 3003).

**Причина:**
Браузеры не позволяют устанавливать cookies с `domain: localhost` для безопасности.

**Решение:**
Использовать localStorage в development, cookies в production.

```typescript
// Development: localStorage
if (process.env.NODE_ENV === 'development') {
  localStorage.setItem('current_enterprise_id', id)
} else {
  // Production: cookie
  document.cookie = `current_enterprise_id=${id}; domain=${COOKIE_DOMAIN}; path=/`
}
```

**Альтернатива (для тестирования cross-domain):**
Настроить локальные домены в `/etc/hosts`:
```
127.0.0.1 site.local
127.0.0.1 admin.local
127.0.0.1 workspace.local
127.0.0.1 platform.local
```

Тогда можно использовать `domain: .local` для cookies.

**Статус:** ✅ Решено через localStorage в dev

---

### 2. Email verification требует настройки redirect URL

**Проблема:**
После клика на ссылку в email Supabase редиректит на неправильный URL.

**Причина:**
Redirect URL не настроен в Supabase или в коде.

**Решение:**
1. Настроить в Supabase Dashboard:
   - Authentication → Email Templates → Confirm signup
   - Redirect URL: `https://site.oblikflow.com/verify-email?confirmed=true`

2. Добавить redirect в код:
```typescript
await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/verify-email?confirmed=true`,
  },
})
```

**Статус:** ✅ Документировано в инструкциях

---

### 3. Google OAuth требует настройки credentials

**Проблема:**
Google OAuth не работает без настройки в Google Cloud Console.

**Причина:**
OAuth credentials не созданы или не настроены redirect URIs.

**Решение:**
1. Создать проект в Google Cloud Console
2. Настроить OAuth consent screen
3. Создать OAuth 2.0 Client ID
4. Добавить Authorized redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
5. Скопировать Client ID и Secret в Supabase

**Статус:** ✅ Документировано в инструкциях

---

### 4. Middleware не может читать localStorage

**Проблема:**
Middleware в Next.js работает на сервере и не имеет доступа к localStorage.

**Причина:**
Middleware выполняется на Edge Runtime (серверная среда).

**Решение для development:**
Использовать обычный cookie (без domain) для middleware в dev:

```typescript
// В middleware
const cookieName = process.env.NODE_ENV === 'production' 
  ? 'current_enterprise_id' 
  : 'dev_current_enterprise_id'

const enterpriseId = request.cookies.get(cookieName)?.value
```

В EnterpriseProvider устанавливать оба: localStorage + cookie.

**Статус:** ✅ Реализовано в коде

---

### 5. Owner не отображается в списке members

**Проблема:**
Owner не виден в списке членов предприятия.

**Причина:**
Фронтенд запрашивает только `enterprise_memberships`, но owner также хранится в `enterprises.owner_user_id`.

**Решение:**
Бэкенд должен возвращать owner в массиве members:

```typescript
// GET /api/enterprises/:id/members
[
  {
    user_id: "...",
    email: "owner@example.com",
    role: "owner",
    is_owner: true
  },
  {
    user_id: "...",
    email: "admin@example.com",
    role: "admin",
    is_owner: false
  }
]
```

**Статус:** ⚠️ Требует реализации на бэкенде

---

### 6. Автовыбор предприятия происходит каждый раз

**Проблема:**
Если cookie не установлен, middleware каждый раз выбирает предприятие заново.

**Причина:**
Cookie не установлен или истек.

**Решение:**
Убедиться что cookie/localStorage устанавливается правильно:
- Production: cookie с правильным domain
- Development: localStorage + dev cookie

**Статус:** ⚠️ Нужно протестировать

---

### 7. CORS ошибки при запросах к backend

**Проблема:**
Браузер блокирует запросы к backend API из-за CORS.

**Причина:**
Backend не настроен для приема запросов с frontend доменов.

**Решение на бэкенде (NestJS):**

```typescript
// main.ts
app.enableCors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'https://site.oblikflow.com',
    'https://admin.oblikflow.com',
    'https://workspace.oblikflow.com',
    'https://platform.oblikflow.com',
  ],
  credentials: true,
})
```

**Статус:** ⚠️ Требует настройки на бэкенде

---

### 8. JWT токен истекает слишком быстро

**Проблема:**
Пользователь вылетает из системы через 1 час (default Supabase).

**Причина:**
JWT токен истекает, refresh token не обновляется автоматически.

**Решение:**
Middleware уже обновляет токены автоматически через `supabase.auth.getUser()`.

Дополнительно можно настроить время жизни токена в Supabase:
- Authentication → Settings → JWT expiry: 3600s (default)

**Статус:** ✅ Middleware обновляет токены

---

### 9. Пользователь может создать предприятие с пустым названием

**Проблема:**
Валидация на фронте есть, но можно обойти через API.

**Причина:**
Бэкенд не валидирует данные.

**Решение на бэкенде:**
Добавить валидацию в DTO:

```typescript
// create-enterprise.dto.ts
export class CreateEnterpriseDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string
}
```

**Статус:** ⚠️ Требует реализации на бэкенде

---

### 10. Admin может удалить себя из предприятия

**Проблема:**
Admin может удалить себя, потеряв доступ.

**Причина:**
Нет проверки на фронте и бэке.

**Решение:**
На фронте скрыть кнопку удаления для себя:

```typescript
{member.user_id !== user?.id && (
  <Button onClick={() => handleDelete(member.user_id)}>
    Удалить
  </Button>
)}
```

На бэке добавить проверку:
```typescript
if (userId === currentUser.id) {
  throw new BadRequestException('Cannot remove yourself')
}
```

**Статус:** ⚠️ Нужно добавить проверку

---

## 🔄 Workarounds

### Тестирование cross-domain в development

**Проблема:** Нужно протестировать cookies в development.

**Workaround:**
1. Настроить локальные домены в `/etc/hosts`:
```
127.0.0.1 site.local
127.0.0.1 admin.local
127.0.0.1 workspace.local
127.0.0.1 platform.local
```

2. Обновить `.env.local`:
```env
NEXT_PUBLIC_SITE_URL=http://site.local:3000
NEXT_PUBLIC_ADMIN_URL=http://admin.local:3001
NEXT_PUBLIC_WORKSPACE_URL=http://workspace.local:3002
NEXT_PUBLIC_PLATFORM_URL=http://platform.local:3003
NEXT_PUBLIC_COOKIE_DOMAIN=.local
```

3. Запустить приложения на этих доменах
4. Cookies будут работать как в production

---

### Mock API для тестирования без бэкенда

**Проблема:** Бэкенд еще не готов, нужно тестировать фронт.

**Workaround:**
Создать mock API с помощью MSW (Mock Service Worker):

```bash
pnpm add -D msw
```

```typescript
// shared/lib/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/enterprises', () => {
    return HttpResponse.json([
      { id: '1', name: 'Test Enterprise', role: 'owner', is_owner: true }
    ])
  }),
  // ... другие endpoints
]
```

Включать только в development.

---

## 📝 TODO для улучшения

### Приоритет: Высокий

- [ ] Добавить rate limiting для API запросов
- [ ] Добавить CSRF защиту
- [ ] Добавить captcha на signup/login
- [ ] Настроить email provider (SendGrid, AWS SES)
- [ ] Добавить logging и monitoring

### Приоритет: Средний

- [ ] Добавить password strength indicator
- [ ] Добавить remember me на login
- [ ] Добавить session management (просмотр активных сессий)
- [ ] Добавить 2FA (в Этапе 2)
- [ ] Добавить magic link login

### Приоритет: Низкий

- [ ] Добавить dark mode
- [ ] Добавить i18n (многоязычность)
- [ ] Добавить analytics
- [ ] Добавить feedback widget
- [ ] Добавить changelog

---

## 🔗 Полезные ссылки

### Документация

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js Middleware Docs](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [shadcn/ui Docs](https://ui.shadcn.com/)

### Инструменты

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Google Cloud Console](https://console.cloud.google.com/)
- [JWT Debugger](https://jwt.io/)

### Тестирование

- [Mailtrap](https://mailtrap.io/) - тестирование email в dev
- [ngrok](https://ngrok.com/) - тестирование webhooks локально
- [BrowserStack](https://www.browserstack.com/) - тестирование на разных браузерах

---

**Добавляй сюда новые проблемы по мере их обнаружения!** 📝
