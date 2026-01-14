# Отслеживание прогресса - Этап 1

**Последнее обновление:** 14 января 2026

---

## 📊 Общий прогресс

- [ ] **Этап 1:** Инфраструктура и Shared (0/15)
- [ ] **Этап 2:** Site - Авторизация (0/12)
- [ ] **Этап 3:** Admin - Управление предприятиями (0/16)
- [ ] **Этап 4:** Workspace - Контекст предприятия (0/8)
- [ ] **Этап 5:** Platform - SuperAdmin (0/5)
- [ ] **Этап 6:** Тестирование и полировка (0/10)

**Общий прогресс: 0/66 задач выполнено (0%)**

---

## 🎯 Этап 1: Инфраструктура и Shared

### 1.1 Настройка Supabase
- [ ] Создать проект в Supabase Dashboard
- [ ] Настроить Email Authentication
- [ ] Настроить Google OAuth Provider
- [ ] Настроить Redirect URLs для всех приложений
- [ ] Настроить Email Templates (verification, password reset)

### 1.2 Supabase клиенты (shared/lib/supabase/)
- [ ] `client.ts` - браузерный клиент
- [ ] `server.ts` - серверный клиент с cookies
- [ ] `middleware.ts` - хелперы для middleware
- [ ] `types.ts` - TypeScript типы из Supabase

### 1.3 API клиент для NestJS (shared/lib/api/)
- [ ] `client.ts` - fetch wrapper с headers
- [ ] `types.ts` - API request/response типы

### 1.4 TypeScript типы (shared/types/)
- [ ] `auth.ts` - User, Session, AuthState
- [ ] `enterprise.ts` - Enterprise, Member, Role
- [ ] `api.ts` - API типы

### 1.5 Environment variables
- [ ] `.env.local` для site
- [ ] `.env.local` для admin
- [ ] `.env.local` для workspace
- [ ] `.env.local` для platform

**Прогресс: 0/15 (0%)**

---

## 🔐 Этап 2: Site - Авторизация

### 2.1 Auth компоненты (shared/components/auth/)
- [ ] `LoginForm.tsx` - форма входа
- [ ] `SignupForm.tsx` - форма регистрации
- [ ] `PasswordResetForm.tsx` - форма сброса пароля
- [ ] `GoogleOAuthButton.tsx` - кнопка Google OAuth

### 2.2 Страницы в site (site/app/)
- [ ] `/login/page.tsx`
- [ ] `/signup/page.tsx`
- [ ] `/reset-password/page.tsx`
- [ ] `/verify-email/page.tsx`

### 2.3 Middleware (site/)
- [ ] `middleware.ts` - обновление токена и редиректы

### 2.4 UI компоненты (shared/components/ui/)
- [ ] Настроить shadcn/ui (components.json)
- [ ] Установить базовые компоненты (Button, Input, Label, Card)
- [ ] Настроить toast notifications

**Прогресс: 0/12 (0%)**

---

## 🏢 Этап 3: Admin - Управление предприятиями

### 3.1 Middleware (admin/)
- [ ] `middleware.ts` - проверка авторизации и email verification

### 3.2 React hooks (shared/lib/hooks/)
- [ ] `useUser.ts` - текущий пользователь
- [ ] `useEnterprises.ts` - список предприятий
- [ ] `useRole.ts` - роль в предприятии

### 3.3 Страницы (admin/app/)
- [ ] `/page.tsx` - список предприятий
- [ ] `/enterprises/new/page.tsx` - создание предприятия
- [ ] `/enterprises/[id]/settings/page.tsx` - настройки
- [ ] `/enterprises/[id]/members/page.tsx` - управление админами

### 3.4 Компоненты
- [ ] `EnterpriseList.tsx` - список карточек предприятий
- [ ] `CreateEnterpriseForm.tsx` - форма создания
- [ ] `EnterpriseSettings.tsx` - форма настроек
- [ ] `MembersList.tsx` - список членов
- [ ] `AddMemberForm.tsx` - добавление админа

### 3.5 API интеграция
- [ ] GET /api/enterprises - список
- [ ] POST /api/enterprises - создание
- [ ] GET /api/enterprises/:id - детали
- [ ] PATCH /api/enterprises/:id - обновление
- [ ] GET /api/enterprises/:id/members - список членов
- [ ] POST /api/enterprises/:id/members - добавить админа
- [ ] DELETE /api/enterprises/:id/members/:userId - удалить админа

**Прогресс: 0/16 (0%)**

---

## 🖥️ Этап 4: Workspace - Контекст предприятия

### 4.1 Middleware (workspace/)
- [ ] `middleware.ts` - авторизация + автовыбор предприятия

### 4.2 Логика автовыбора
- [ ] Проверка `current_enterprise_id` cookie/localStorage
- [ ] Запрос списка через RPC `get_user_enterprises`
- [ ] Логика выбора: 1 предприятие → выбрать; иначе owner > admin > first
- [ ] Установка cookie (production) / localStorage (dev)
- [ ] Redirect на `/admin` если нет предприятий

### 4.3 EnterpriseProvider
- [ ] `workspace/components/EnterpriseProvider.tsx` - React Context
- [ ] `useEnterprise()` hook

### 4.4 Layout
- [ ] `workspace/app/layout.tsx` - обернуть в EnterpriseProvider

### 4.5 Placeholder страницы
- [ ] `workspace/app/page.tsx` - вывод выбранного предприятия

**Прогресс: 0/8 (0%)**

---

## 🛡️ Этап 5: Platform - SuperAdmin

### 5.1 Middleware (platform/)
- [ ] `middleware.ts` - авторизация + проверка `is_system_admin`

### 5.2 RPC проверка
- [ ] Использовать `is_system_admin` RPC function
- [ ] Redirect на `/admin` если не superAdmin

### 5.3 Placeholder страницы
- [ ] `platform/app/page.tsx` - приветствие для superAdmin

### 5.4 UI
- [ ] Layout для platform
- [ ] Навигация (sidebar)

**Прогресс: 0/5 (0%)**

---

## ✅ Этап 6: Тестирование и полировка

### 6.1 User flows
- [ ] Регистрация → Email verification → Login
- [ ] Password reset флоу
- [ ] Google OAuth флоу
- [ ] Создание предприятия → Просмотр в списке
- [ ] Добавление админа → Проверка списка членов
- [ ] Автовыбор в workspace → Проверка cookie
- [ ] SuperAdmin доступ к platform

### 6.2 Error handling
- [ ] Toast notifications для ошибок
- [ ] Валидация форм (zod + react-hook-form)
- [ ] Error boundaries

### 6.3 UI/UX
- [ ] Loading states (skeleton, spinner)
- [ ] Empty states (нет предприятий)
- [ ] Responsive design
- [ ] Dark mode (если в дизайн-системе)

**Прогресс: 0/10 (0%)**

---

## 📝 Примечания

### Текущие блокеры
_Список блокеров будет добавляться по мере реализации_

### Вопросы к обсуждению
_Список вопросов будет добавляться по мере реализации_

---

**Обновляй этот файл по мере выполнения задач!** 📈
