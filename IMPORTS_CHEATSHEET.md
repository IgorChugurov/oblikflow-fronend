# 🚀 Шпаргалка по импортам

> **Полная документация:** [docs/architecture/MODULE_ALIASES.md](docs/architecture/MODULE_ALIASES.md)

## Быстрые правила

### В приложениях (admin, site, workspace, platform)

```typescript
// Свои файлы → @/
import { X } from '@/components/MyComponent';
import { Y } from '@/lib/utils';

// Файлы из shared → shared/
import { Button } from 'shared/components/ui/button';
import { enterprisesSDK } from 'shared/api/sdk';
import type { Enterprise } from 'shared/types/enterprises';
```

### В shared

```typescript
// Свои файлы → shared/
import { Button } from 'shared/components/ui/button';
import { cn } from 'shared/lib/utils';
import type { Enterprise } from 'shared/types/enterprises';

// Близкие файлы → относительно
import { SomeComponent } from './SomeComponent';
import { types } from '../types';
```

## ❌ Частые ошибки

```typescript
// ❌ В admin НЕ использовать @/shared/...
import { Button } from '@/shared/components/ui/button';

// ✅ Правильно
import { Button } from 'shared/components/ui/button';

// ❌ В shared НЕ использовать @/...
import { Button } from '@/components/ui/button';

// ✅ Правильно
import { Button } from 'shared/components/ui/button';
```

## 🔍 Проверка

```bash
# TypeScript
cd admin && npx tsc --noEmit
cd shared && npx tsc --noEmit

# Lint
pnpm lint
```

## 📋 Шпаргалка-таблица

| Где пишем | Что импортируем | Как | Пример |
|-----------|-----------------|-----|--------|
| admin | admin файлы | `@/*` | `@/components/X` |
| admin | shared файлы | `shared/*` | `shared/components/X` |
| site | site файлы | `@/*` | `@/components/X` |
| site | shared файлы | `shared/*` | `shared/components/X` |
| shared | shared файлы | `shared/*` | `shared/components/X` |
