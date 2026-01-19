# Правила использования модулей и алиасов

## Архитектура монорепозитория

Проект организован как **pnpm workspace** монорепозиторий с следующей структурой:

```
olikflow-frontend/
├── admin/           # Next.js приложение - административная панель
├── site/            # Next.js приложение - публичный сайт
├── workspace/       # Next.js приложение - рабочее пространство
├── platform/        # Next.js приложение - платформа
├── shared/          # Общая библиотека компонентов и утилит
├── tsconfig.base.json
└── pnpm-workspace.yaml
```

## Конфигурация TypeScript

### Базовая конфигурация (tsconfig.base.json)

Базовая конфигурация без алиасов, содержит только общие настройки компилятора.

### Конфигурация приложений (admin, site, workspace, platform)

Каждое приложение наследует `tsconfig.base.json` и определяет **два алиаса**:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],           // Алиас для файлов внутри приложения
      "shared/*": ["../shared/*"] // Алиас для импорта из shared
    }
  }
}
```

### Конфигурация shared (shared/tsconfig.json)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "shared/*": ["./*"]  // Алиас для файлов внутри shared
    }
  }
}
```

## Правила использования импортов

### 1. Внутри приложения (admin, site, workspace, platform)

#### Импорт файлов приложения
Используйте алиас `@/`:

```typescript
// ✅ ПРАВИЛЬНО
import { Component } from '@/components/MyComponent';
import { utils } from '@/lib/utils';
import { config } from '@/config';
```

#### Импорт из shared
Используйте алиас `shared/`:

```typescript
// ✅ ПРАВИЛЬНО
import { Button } from 'shared/components/ui/button';
import { enterprisesSDK } from 'shared/api/sdk';
import type { Enterprise } from 'shared/types/enterprises';
```

```typescript
// ❌ НЕПРАВИЛЬНО
import { Button } from '@/shared/components/ui/button';
import { Button } from '../shared/components/ui/button';
```

### 2. Внутри shared

#### Импорт файлов shared
**ВАЖНО:** Используйте алиас `shared/` (тот же самый, что и в приложениях):

```typescript
// ✅ ПРАВИЛЬНО
import { Badge } from 'shared/components/ui/badge';
import { Button } from 'shared/components/ui/button';
import { cn } from 'shared/lib/utils';
import type { Enterprise } from 'shared/types/enterprises';
```

```typescript
// ❌ НЕПРАВИЛЬНО
import { Badge } from '@/components/ui/badge';
import { Badge } from '../components/ui/badge';
```

#### Относительные импорты
Для близких файлов можно использовать относительные импорты:

```typescript
// ✅ ПРАВИЛЬНО (если файлы рядом)
import { ColumnConfig } from '../../types';
import { DataTableHeader } from './components/DataTableHeader';
```

## Таблица правил

| Контекст | Что импортируем | Как импортируем | Пример |
|----------|-----------------|-----------------|---------|
| **admin/** | Файлы admin | `@/*` | `import X from '@/components/Y'` |
| **admin/** | Файлы shared | `shared/*` | `import X from 'shared/components/Y'` |
| **site/** | Файлы site | `@/*` | `import X from '@/components/Y'` |
| **site/** | Файлы shared | `shared/*` | `import X from 'shared/components/Y'` |
| **workspace/** | Файлы workspace | `@/*` | `import X from '@/components/Y'` |
| **workspace/** | Файлы shared | `shared/*` | `import X from 'shared/components/Y'` |
| **platform/** | Файлы platform | `@/*` | `import X from '@/components/Y'` |
| **platform/** | Файлы shared | `shared/*` | `import X from 'shared/components/Y'` |
| **shared/** | Файлы shared | `shared/*` | `import X from 'shared/components/Y'` |
| **shared/** | Близкие файлы | относительно | `import X from './Y'` |

## Почему такая структура?

### Проблема, которую решаем

В монорепозитории возникает конфликт при компиляции:

1. **TypeScript** проверяет каждый файл используя его локальный tsconfig
2. **Next.js (webpack)** компилирует все файлы используя tsconfig приложения

Если в `shared` использовать алиас `@/*`:
- TypeScript видит `@/*` → `shared/*` (из shared/tsconfig.json) ✓
- Next.js видит `@/*` → `admin/*` (из admin/tsconfig.json при компиляции) ✗

### Решение

Использовать **единый алиас `shared/*` везде**:

- В приложениях (admin, site, etc.): `shared/*` → `"../shared/*"`
- В shared: `shared/*` → `"./*"`

Это гарантирует, что и TypeScript, и Next.js всегда правильно резолвят импорты из shared, независимо от контекста компиляции.

## Миграция существующего кода

Если вы находите неправильные импорты:

### В файлах приложений (admin, site, etc.)

```typescript
// ❌ Было
import { Button } from '@/shared/components/ui/button';

// ✅ Стало
import { Button } from 'shared/components/ui/button';
```

### В файлах shared

```typescript
// ❌ Было (если использовали @/)
import { Button } from '@/components/ui/button';

// ✅ Стало
import { Button } from 'shared/components/ui/button';
```

## Проверка правильности

### TypeScript проверка

```bash
# Проверить конкретное приложение
cd admin && npx tsc --noEmit

# Проверить shared
cd shared && npx tsc --noEmit

# Проверить весь монорепозиторий
pnpm -r run type-check
```

### ESLint проверка

```bash
# В корне проекта
pnpm lint
```

## FAQ

### Q: Почему нельзя использовать `@/shared/...` в приложениях?

**A:** Потому что `@/` в приложениях указывает на папку самого приложения (например, `admin/`), а не на корень монорепозитория. `@/shared` попытается найти `admin/shared`, которого не существует.

### Q: Почему в shared нужно использовать `shared/*`, а не `@/`?

**A:** Потому что Next.js компилирует файлы из shared используя tsconfig приложения (admin, site, etc.), где `@/*` указывает на папку приложения, а не на shared. Использование `shared/*` гарантирует правильный резолвинг и в TypeScript, и в Next.js.

### Q: Можно ли использовать относительные импорты?

**A:** Да, но:
- ✅ Для близких файлов (в той же папке или соседних): `./utils`, `../types`
- ❌ Для далеких файлов: используйте алиасы `@/*`

### Q: Что делать, если Next.js компилируется, но TypeScript/IDE показывает ошибки?

**A:** Это означает, что импорты работают случайно во время рантайма, но не соответствуют правилам TypeScript. Исправьте импорты согласно этому документу.

### Q: Как импортировать JSON конфигурации?

**A:** Следуйте тем же правилам:

```typescript
// В admin
import config from 'shared/config/app.json';

// В shared
import config from '@/config/app.json';
```

## Примеры

### Файл в admin/components/EnterprisesListWrapper.tsx

```typescript
'use client';

import React from 'react';
// Импорт из admin (своя папка)
import { SomeAdminUtil } from '@/lib/admin-utils';

// Импорты из shared
import { UniversalEntityListClient } from 'shared/listsAndForms/universal-list';
import { enterprisesSDK } from 'shared/api/sdk';
import enterprisesConfig from 'shared/listsAndForms/configuration-setup/enterprises.config.json';
import type { Enterprise } from 'shared/types/enterprises';
```

### Файл в shared/listsAndForms/universal-list/UniversalEntityListClient.tsx

```typescript
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

// Импорты из shared (своя папка) через shared/
import { Dialog, DialogContent } from 'shared/components/ui/dialog';
import { Button } from 'shared/components/ui/button';
import type { Enterprise } from 'shared/types/enterprises';
import { cn } from 'shared/lib/utils';

// Относительные импорты для близких файлов
import { UniversalEntityListDataTable } from './UniversalEntityListDataTable';
import { generateColumnsFromConfig } from './utils/table-column-generator';
import type { ListSpec } from '../types';
```

## Заключение

Следуя этим правилам, вы обеспечите:
- ✅ Корректную работу TypeScript
- ✅ Правильное автодополнение в IDE
- ✅ Отсутствие конфликтов импортов
- ✅ Легкую навигацию по коду
- ✅ Стабильную работу всех приложений
