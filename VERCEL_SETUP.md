# 🚀 Быстрая настройка Vercel Deployment

## ⚠️ КРИТИЧЕСКИ ВАЖНО: Переустановите зависимости!

После изменения `package.json` файлов TypeScript использует устаревший кеш типов.

### Вариант 1: Автоматический скрипт (рекомендуется)

```bash
./reset-deps.sh
```

### Вариант 2: Вручную

```bash
# 1. Удалите все node_modules и кеш
rm -rf node_modules */node_modules pnpm-lock.yaml
rm -rf .next */.next

# 2. Переустановите зависимости
pnpm install

# 3. Перезапустите TypeScript сервер
# VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"
# Или просто перезапустите VS Code
```

### ⚠️ Если видите ошибку TypeScript с ThemeProvider:

```
Property 'children' does not exist on type ThemeProviderProps
```

**Это нормально!** Это устаревший кеш TypeScript. Следуйте шагам выше.

---

## 📋 Что было исправлено:

### 1. ✅ Создан `.npmrc` (корень)

- Настроена изоляция зависимостей для pnpm workspace
- Включена автоматическая установка peer dependencies

### 2. ✅ Создан `vercel.json` для каждого приложения

- `site/vercel.json`
- `admin/vercel.json`
- `workspace/vercel.json`
- `platform/vercel.json`

### 3. ✅ Правильная структура зависимостей

**Важно:** Зависимости разделены на 3 типа:

#### Build-time зависимости (в КАЖДОМ приложении + shared)
```json
// site/package.json, admin/package.json, workspace/package.json, platform/package.json
"dependencies": {
  "next": "16.1.1",
  "next-intl": "^4.7.0",  // ← Нужно для next.config.ts
  "react": "19.2.3",
  "react-dom": "19.2.3",
  "shared": "workspace:*"
}
```

#### Runtime зависимости (ТОЛЬКО в shared)
```json
// shared/package.json
"dependencies": {
  "@supabase/supabase-js": "^2.90.1",
  "react-hook-form": "^7.71.1",
  "zod": "^4.3.5",
  "lucide-react": "^0.562.0",
  "clsx": "^2.1.1"
  // И все остальные общие библиотеки
}
```

**Почему `next-intl` дублируется?**
- Используется в `next.config.ts` (выполняется ДО загрузки workspace)
- С `hoist=false` требуется локальная копия в каждом приложении
- pnpm автоматически создаст symlink на одну версию (deduplicate)

---

## 🎯 Настройка каждого Vercel проекта:

### Шаг 1: General Settings

```
Framework Preset: Next.js
Root Directory: site (для site проекта)
               admin (для admin проекта)
               workspace (для workspace проекта)
               platform (для platform проекта)
Node.js Version: 20.x
```

### Шаг 2: Build & Development Settings

**✅ НЕ ТРОГАЙТЕ!** Настройки читаются из `vercel.json`

### Шаг 3: Environment Variables

Добавьте для каждого проекта:

```bash
# Backend
NEXT_PUBLIC_BACKEND_URL=https://api.oblikflow.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Domains
NEXT_PUBLIC_COOKIE_DOMAIN=.oblikflow.com
NEXT_PUBLIC_SITE_URL=https://oblikflow.com
NEXT_PUBLIC_ADMIN_URL=https://admin.oblikflow.com
NEXT_PUBLIC_WORKSPACE_URL=https://workspace.oblikflow.com
NEXT_PUBLIC_PLATFORM_URL=https://platform.oblikflow.com
```

---

## 🧪 Локальная проверка перед деплоем:

```bash
# 1. Установите зависимости
pnpm install

# 2. Проверьте что все билдится
pnpm build:site
pnpm build:admin
pnpm build:workspace
pnpm build:platform

# 3. Если все OK - коммитьте
git add .
git commit -m "fix: configure Vercel deployment for monorepo"
git push
```

---

## 🔍 Корень проблем (анализ):

### Проблема #1: Неправильное распределение зависимостей

**Было (НЕВЕРНО):**
```
shared/package.json:      next-intl: ^4.7.0
site/package.json:        next-intl: ❌ ОТСУТСТВУЕТ
admin/package.json:       next-intl: ❌ ОТСУТСТВУЕТ
workspace/package.json:   next-intl: ❌ ОТСУТСТВУЕТ
platform/package.json:    next-intl: ❌ ОТСУТСТВУЕТ
```

**Результат:** `next.config.ts` не может найти `next-intl/plugin` при сборке

**Стало (ВЕРНО):**
```
shared/package.json:      next-intl: ^4.7.0  ✅
site/package.json:        next-intl: ^4.7.0  ✅ (build-time)
admin/package.json:       next-intl: ^4.7.0  ✅ (build-time)
workspace/package.json:   next-intl: ^4.7.0  ✅ (build-time)
platform/package.json:    next-intl: ^4.7.0  ✅ (build-time)
```

**Результат:** pnpm deduplicate создает symlink, одна версия для всех

### Проблема #2: Отсутствие .npmrc

- Vercel не знал как правильно работать с pnpm workspace
- Не были настроены правила hoisting
- Peer dependencies не устанавливались автоматически

### Проблема #3: Нет vercel.json

- Vercel использовал дефолтные команды
- Не понимал что нужно идти в корень для установки зависимостей
- Билдил только текущую папку без shared

---

## ✅ Решение:

1. **Build-time зависимости в КАЖДОМ приложении**

   - `next-intl` (используется в next.config.ts)
   - Любые другие пакеты, импортируемые в конфигах

2. **Runtime зависимости ТОЛЬКО в shared**

   - react-hook-form
   - zod
   - @radix-ui/\*
   - @supabase/\*
   - lucide-react, clsx, tailwind-merge
   - И все остальные общие библиотеки

3. **Framework зависимости в КАЖДОМ приложении**

   - next, react, react-dom
   - shared: workspace:\*

4. **Правильные команды в vercel.json**
   ```bash
   installCommand: cd .. && pnpm install --frozen-lockfile=false
   buildCommand: cd .. && pnpm --filter <app> build
   ```

5. **Базовый TypeScript конфиг**
   - `tsconfig.base.json` в корне
   - Каждое приложение наследует через `extends`
   - Единый источник истины для настроек

---

## 📚 Дополнительная документация

- **[docs/MONOREPO_GUIDE.md](./docs/MONOREPO_GUIDE.md)** - Полное руководство по управлению монорепозиторием
  - Классификация зависимостей (Build-time vs Runtime)
  - Добавление новых зависимостей
  - Типичные ошибки и решения
  - Чек-лист перед коммитом

- **[docs/VERCEL_DEPLOYMENT.md](./docs/VERCEL_DEPLOYMENT.md)** - Детальное руководство по деплою

## 📞 Support

Если проблемы остались:

1. Проверьте логи Vercel Build
2. Убедитесь что Root Directory правильный
3. Проверьте что `.npmrc` и `vercel.json` закоммичены
4. Проверьте что `next-intl` есть во ВСЕХ приложениях: `grep -r "next-intl" */package.json`
5. См. **[docs/MONOREPO_GUIDE.md](./docs/MONOREPO_GUIDE.md)** для решения типичных проблем

---

**Дата:** 2026-01-16  
**Статус:** ✅ Ready for Vercel
