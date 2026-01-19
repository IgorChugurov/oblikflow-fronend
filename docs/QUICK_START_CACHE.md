# Quick Start: Cache Update Strategy

> Краткое руководство по использованию стратегии обновления кэша

## 🚀 Для нового hook (5 минут)

### 1. Создайте UPDATE hook

```typescript
// shared/api/hooks/YOUR_ENTITY/useUpdateYourEntity.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { yourEntitySDK } from '../../sdk';
import { updateListCache, updateDetailCache } from '../../../lib/api/core/cache-manager';
import { detailKeys } from '../../../lib/api/core/query-keys';

export function useUpdateYourEntity(entityId: string, projectId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const result = await yourEntitySDK.update(entityId, data);
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
    
    onSuccess: async (response) => {
      // Обновляем детали
      updateDetailCache({
        queryClient,
        detailKey: ['your-entity', entityId], // или detailKeys.yourEntity(entityId)
        data: response,
      });
      
      // Обновляем списки (safe-refetch)
      await updateListCache({
        queryClient,
        projectId,
        serviceType: 'your-entities', // ← имя сервиса
      });
    },
  });
}
```

### 2. Используйте в компоненте

```typescript
export function YourEntityFormWrapper({ mode, entityId }: Props) {
  const router = useRouter();
  
  const updateMutation = useUpdateYourEntity(entityId!, 'admin'); // ← projectId
  
  const handleSubmit = async (data) => {
    try {
      await updateMutation.mutateAsync(data);
      router.back(); // ← Возврат с сохранением позиции
    } catch (error) {
      // handle error
    }
  };
  
  return <FormRenderer onSubmit={handleSubmit} />;
}
```

### 3. Готово! ✅

- Список обновится с сервера
- Позиция сохранена (страница, фильтры, поиск)
- Точные данные (все server-computed поля)

---

## 📖 Полная документация

- [ADR-001](./architecture/ADR-001-CACHE_UPDATE_STRATEGY.md) - Архитектурное решение
- [CACHE_UPDATE_STRATEGY.md](./architecture/CACHE_UPDATE_STRATEGY.md) - Детальная документация
- [Code: cache-manager.ts](../shared/lib/api/core/cache-manager.ts) - Реализация
- [Code: query-keys.ts](../shared/lib/api/core/query-keys.ts) - Ключи кэша

---

## ⚠️ Важно помнить

1. **Используйте `router.back()`** вместо `router.push('/')`
2. **Передавайте `projectId`** в hooks
3. **Добавьте `detailKey`** в `detailKeys` если нужно
4. **Используйте `updateListCache`** вместо `invalidateQueries`
