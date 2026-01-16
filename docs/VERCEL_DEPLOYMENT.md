# 🚀 Vercel Deployment Guide для pnpm Monorepo

**Дата:** 2026-01-16  
**Версия:** 1.0.0

---

## 📋 Обзор проблемы

### Структура проекта:
```
oblikflow-frontend/
├── site/          → Vercel App #1 (oblikflow.com)
├── admin/         → Vercel App #2 (admin.oblikflow.com)
├── workspace/     → Vercel App #3 (workspace.oblikflow.com)
├── platform/      → Vercel App #4 (platform.oblikflow.com)
├── shared/        → Internal workspace package
├── pnpm-workspace.yaml
└── package.json
```

### Корневые причины проблем с зависимостями:

#### 1. **Дублирование зависимостей**

**Проблема:**
- `shared/package.json` содержит: `next-intl`, `react-hook-form`, `zod`, `@supabase/*`
- Каждое приложение также имеет эти зависимости в своем `package.json`
- При установке возникают конфликты версий

**Решение:**
- ✅ Общие зависимости должны быть ТОЛЬКО в `shared/package.json`
- ✅ Приложения должны иметь только уникальные зависимости
- ✅ Все приложения получают общие зависимости через `workspace:*`

#### 2. **Неправильная конфигурация pnpm для Vercel**

**Проблема:**
- Нет `.npmrc` файла с настройками workspace
- Vercel не знает как правильно устанавливать pnpm workspace
- Symlinks могут не работать корректно

**Решение:**
- ✅ Создан `.npmrc` с правильными настройками
- ✅ Настроен `hoist=false` для изоляции зависимостей
- ✅ Включен `auto-install-peers=true` для автоматической установки peer dependencies

#### 3. **Отсутствие Vercel конфигурации**

**Проблема:**
- Нет `vercel.json` в каждом приложении
- Vercel использует дефолтные команды, которые не понимают monorepo структуру
- Root Directory указывается на подпапку, но зависимости в корне

**Решение:**
- ✅ Создан `vercel.json` для каждого приложения
- ✅ Custom `installCommand` устанавливает зависимости из корня
- ✅ Custom `buildCommand` билдит конкретное приложение через pnpm filter

---

## 🔧 Конфигурация файлов

### `.npmrc` (корень проекта)

```ini
# pnpm workspace configuration
hoist=false
shamefully-hoist=false
strict-peer-dependencies=false
auto-install-peers=true
```

**Что делает:**
- `hoist=false` - каждый пакет имеет свои `node_modules` (изоляция)
- `shamefully-hoist=false` - не поднимать зависимости в корень workspace
- `strict-peer-dependencies=false` - не ломать сборку на peer dependencies warnings
- `auto-install-peers=true` - автоматически устанавливать peer dependencies

---

### `site/vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "cd .. && pnpm install && pnpm --filter site build",
  "installCommand": "cd .. && pnpm install --frozen-lockfile=false",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

**Что делает:**
- `installCommand` - переходит в корень и устанавливает ВСЕ зависимости workspace
- `buildCommand` - билдит только `site` через pnpm filter
- `--frozen-lockfile=false` - позволяет обновлять lockfile если нужно

**То же самое для:** `admin/vercel.json`, `workspace/vercel.json`, `platform/vercel.json`

---

## 📦 Правильная структура зависимостей

### `shared/package.json` (общие зависимости)

```json
{
  "name": "shared",
  "dependencies": {
    "@hookform/resolvers": "^5.2.2",
    "@radix-ui/*": "...",
    "@supabase/ssr": "^0.8.0",
    "@supabase/supabase-js": "^2.90.1",
    "next-intl": "^4.7.0",
    "next-themes": "^0.4.6",
    "react-hook-form": "^7.71.1",
    "zod": "^4.3.5"
  },
  "peerDependencies": {
    "next": ">=16.0.0",
    "react": ">=19.0.0",
    "react-dom": ">=19.0.0"
  }
}
```

### `site/package.json` (минимальные зависимости)

```json
{
  "name": "site",
  "dependencies": {
    "next": "16.1.1",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "shared": "workspace:*"
  }
}
```

**Важно:**
- ❌ НЕ дублировать зависимости из `shared`
- ✅ Только уникальные для приложения зависимости
- ✅ `shared: "workspace:*"` подтянет все нужное

---

## 🎯 Настройка Vercel Dashboard

Для каждого приложения в Vercel Dashboard:

### General Settings

```
Framework Preset: Next.js
Root Directory: site (или admin/workspace/platform)
Build & Output Settings: Override (используется vercel.json)
```

### Environment Variables

```bash
# Общие для всех приложений
NEXT_PUBLIC_BACKEND_URL=https://api.oblikflow.com
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_COOKIE_DOMAIN=.oblikflow.com

# Уникальные для каждого
NEXT_PUBLIC_SITE_URL=https://oblikflow.com
NEXT_PUBLIC_ADMIN_URL=https://admin.oblikflow.com
NEXT_PUBLIC_WORKSPACE_URL=https://workspace.oblikflow.com
NEXT_PUBLIC_PLATFORM_URL=https://platform.oblikflow.com
```

---

## 🐛 Troubleshooting

### Проблема: "Module not found" при деплое

**Причина:** Зависимость есть в `shared`, но не установлена

**Решение:**
```bash
# Добавить зависимость в shared/package.json
cd shared
pnpm add <package-name>

# Обновить lockfile
cd ..
pnpm install
```

### Проблема: "Cannot find module 'shared'"

**Причина:** Vercel не установил workspace dependencies

**Решение:**
1. Проверить `vercel.json` - должен быть `cd ..` в командах
2. Проверить `Root Directory` в Vercel Dashboard
3. Убедиться что `pnpm-workspace.yaml` в корне

### Проблема: Разные версии зависимостей

**Причина:** Дублирование в `shared` и приложениях

**Решение:**
```bash
# Удалить из приложения
cd site
pnpm remove next-intl

# Убедиться что есть в shared
cd ../shared
pnpm list next-intl
```

### Проблема: "frozen-lockfile" ошибка

**Причина:** `pnpm-lock.yaml` не синхронизирован с `package.json`

**Решение:**
```bash
# Пересоздать lockfile
rm pnpm-lock.yaml
pnpm install

# Или использовать --frozen-lockfile=false в vercel.json (уже настроено)
```

---

## ✅ Чеклист перед деплоем

### Локальная проверка:

- [ ] `pnpm install` в корне без ошибок
- [ ] `pnpm build:all` успешно билдит все приложения
- [ ] Нет дублирования зависимостей между `shared` и приложениями
- [ ] `pnpm-lock.yaml` закоммичен

### Vercel конфигурация:

- [ ] `.npmrc` в корне проекта
- [ ] `vercel.json` в каждом приложении (site/admin/workspace/platform)
- [ ] Root Directory правильно указан для каждого Vercel App
- [ ] Environment Variables настроены

### После деплоя:

- [ ] Проверить логи сборки в Vercel Dashboard
- [ ] Убедиться что все страницы загружаются
- [ ] Проверить переключение языков
- [ ] Проверить авторизацию

---

## 🚀 Deploy команды

### Локальная проверка:

```bash
# Установить зависимости
pnpm install

# Проверить все приложения
pnpm build:all

# Запустить локально
pnpm dev:site      # http://localhost:3000
pnpm dev:admin     # http://localhost:3001
pnpm dev:workspace # http://localhost:3002
pnpm dev:platform  # http://localhost:3003
```

### Vercel Deploy:

```bash
# Deploy конкретного приложения (из его папки)
cd site
vercel --prod

# Или через Vercel Dashboard (рекомендуется)
# Git push → automatic deploy
```

---

## 📚 Полезные ссылки

- [Vercel Monorepo Guide](https://vercel.com/docs/monorepos)
- [pnpm Workspace](https://pnpm.io/workspaces)
- [Next.js Monorepo](https://nextjs.org/docs/advanced-features/multi-zones)

---

**Версия:** 1.0.0  
**Дата:** 2026-01-16  
**Статус:** ✅ Configured
