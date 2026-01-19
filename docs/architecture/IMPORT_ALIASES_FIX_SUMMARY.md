# Исправление проблем с импортами и алиасами

## Дата: 2026-01-18

## Проблема

Постоянные ошибки TypeScript и компиляции Next.js:
```
Cannot find module 'shared/components/ui/button'
Cannot find module '@/shared/components/...'
Module not found: Can't resolve '@/lib/utils'
```

## Корневая причина

**Конфликт резолвинга алиасов** между TypeScript и Next.js в монорепозитории:

1. **TypeScript** проверяет каждый файл используя локальный `tsconfig.json` пакета
2. **Next.js (webpack)** компилирует все файлы (включая из `shared/`) используя `tsconfig.json` приложения

### Проблемная конфигурация (было):

**shared/tsconfig.json:**
```json
{
  "paths": {
    "@/*": ["../*"]  // ❌ Указывает на корень монорепозитория
  }
}
```

**В файлах shared использовались разные подходы:**
- Иногда `@/components/...` 
- Иногда `shared/components/...`
- Иногда относительные пути

### Что происходило:

1. Файл `shared/components/ui/button.tsx` импортирует `@/lib/utils`
2. TypeScript видит: `@/*` → `../*` → резолвит в корень ✓
3. Next.js из admin видит: `@/*` → `admin/*` → не находит `admin/lib/utils` ✗

## Решение

### 1. Унифицированный алиас `shared/*` везде

**Правило:** Использовать алиас `shared/*` для всех импортов из shared, **включая внутри самого shared**.

#### Конфигурация

**Приложения (admin, site, workspace, platform) - tsconfig.json:**
```json
{
  "paths": {
    "@/*": ["./*"],              // Для своих файлов
    "shared/*": ["../shared/*"]  // Для shared
  }
}
```

**shared/tsconfig.json:**
```json
{
  "paths": {
    "shared/*": ["./*"]  // ✅ Для своих файлов
  }
}
```

### 2. Правила импортов

#### В приложениях (admin, site, workspace, platform):

```typescript
// ✅ Свои файлы
import { X } from '@/components/MyComponent';

// ✅ Из shared
import { Button } from 'shared/components/ui/button';
import { enterprisesSDK } from 'shared/api/sdk';
```

#### В shared:

```typescript
// ✅ Свои файлы
import { Button } from 'shared/components/ui/button';
import { cn } from 'shared/lib/utils';
import type { Enterprise } from 'shared/types/enterprises';

// ✅ Близкие файлы (опционально)
import { types } from '../types';
import { Component } from './Component';
```

## Внесенные изменения

### Конфигурации

1. **shared/tsconfig.json**
   - Изменено: `"@/*": ["../*"]` → `"shared/*": ["./*"]`

### Файлы с исправленными импортами

1. `admin/components/EnterprisesListWrapper.tsx` - импорты из shared
2. `shared/listsAndForms/universal-list/utils/table-column-generator.tsx`
3. `shared/listsAndForms/universal-list/UniversalEntityListClient.tsx`
4. `shared/listsAndForms/universal-list/UniversalEntityListDataTable.tsx`
5. `shared/listsAndForms/universal-list/components/DataTablePagination.tsx`
6. `shared/listsAndForms/universal-list/components/DataTableToolbar.tsx`
7. `shared/listsAndForms/universal-list/components/DataTableHeader.tsx`
8. `shared/components/ui/confirmation-dialog.tsx`

### Документация

Созданы новые документы:

1. **docs/architecture/MODULE_ALIASES.md** - Полное руководство по алиасам
2. **IMPORTS_CHEATSHEET.md** - Быстрая шпаргалка
3. **docs/architecture/IMPORT_ALIASES_FIX_SUMMARY.md** - Этот документ

## Результат

✅ TypeScript проверка проходит без ошибок импортов  
✅ Next.js dev server компилируется успешно  
✅ Приложение работает (GET / 200)  
✅ IDE автодополнение работает корректно  
✅ Единообразие импортов во всем проекте  

## Проверка

### TypeScript

```bash
# Проверить shared
cd shared && npx tsc --noEmit

# Проверить admin
cd admin && npx tsc --noEmit

# Проверить все
pnpm -r run type-check
```

### Linter

```bash
pnpm lint
```

### Dev server

```bash
cd admin && npm run dev
# или
cd site && npm run dev
```

## Памятка для разработчиков

### ❌ НЕ делать:

```typescript
// В admin НЕ использовать @/shared/...
import { X } from '@/shared/components/ui/button';

// В shared НЕ использовать @/...
import { X } from '@/components/ui/button';
```

### ✅ ДЕЛАТЬ:

```typescript
// И в admin, и в shared использовать shared/...
import { X } from 'shared/components/ui/button';
```

## Почему именно такое решение?

### Альтернативы, которые НЕ работают:

1. **Использовать `@/` в shared**
   - ❌ Next.js резолвит `@/` в контексте приложения, не shared
   
2. **Использовать `@shared/` в shared**
   - ❌ Нужно дублировать алиас во всех tsconfig
   - ❌ Сложнее поддерживать

3. **Использовать только относительные пути**
   - ❌ Ломает автодополнение
   - ❌ Сложно рефакторить
   - ❌ Длинные пути типа `../../../components/ui/button`

### Почему `shared/*` - лучшее решение:

✅ Работает и в TypeScript, и в Next.js  
✅ Одинаковый синтаксис везде (предсказуемо)  
✅ Явно показывает, что импортируется из shared  
✅ Легко искать и рефакторить (grep "from 'shared/")  
✅ Минимум конфигурации  

## Применение к новым приложениям

Если добавляете новое приложение в монорепозиторий:

1. **Создайте tsconfig.json:**
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "shared/*": ["../shared/*"]
    }
  }
}
```

2. **Импортируйте правильно:**
```typescript
// Свои файлы → @/
import { X } from '@/components/X';

// Из shared → shared/
import { Y } from 'shared/components/Y';
```

## Контакты и вопросы

При возникновении проблем с импортами:

1. Проверьте [IMPORTS_CHEATSHEET.md](../../IMPORTS_CHEATSHEET.md)
2. Изучите [docs/architecture/MODULE_ALIASES.md](MODULE_ALIASES.md)
3. Убедитесь, что используете правильный алиас для контекста (см. таблицу в документации)

## История изменений

- **2026-01-18:** Полное исправление алиасов и создание документации
