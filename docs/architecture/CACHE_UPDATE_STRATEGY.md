# Стратегия обновления кэша React Query

> **Статус:** ✅ Активно  
> **Последнее обновление:** 2026-01-19

## 📋 Содержание

- [Обзор](#обзор)
- [Концепция Safe Refetch](#концепция-safe-refetch)
- [Архитектура](#архитектура)
- [Руководство по использованию](#руководство-по-использованию)
- [Примеры](#примеры)
- [Troubleshooting](#troubleshooting)

---

## Обзор

### Проблема

После операций мутации (CREATE/UPDATE/DELETE) кэш React Query должен обновляться, чтобы пользователь видел актуальные данные в списках. При этом важно:

1. **Сохранять позицию пользователя** - страница, фильтры, поиск
2. **Показывать точные данные** - с сервера, включая computed поля
3. **Обеспечить простоту** - единообразный подход для всех сущностей

### Решение

Используется стратегия **Safe Refetch**:
- Перезагружаем данные с сервера после мутации
- Сохраняем все параметры запроса (page, filters, search)
- Обновляем только активные (видимые) страницы

---

## Концепция Safe Refetch

### Как это работает

```typescript
// 1. Пользователь на странице 3 списка предприятий с фильтром "active"
//    Query Key: ['list', 'admin', 'enterprises', { page: 3, filters: { status: 'active' } }]

// 2. Переходит на страницу редактирования, меняет название

// 3. Нажимает "Сохранить" - вызывается мутация

// 4. onSuccess мутации:
await updateListCache({
  queryClient,
  projectId: 'admin',
  serviceType: 'enterprises'
});

// 5. Функция находит ВСЕ активные запросы, начинающиеся с:
//    ['list', 'admin', 'enterprises', ...]
//    И перезагружает их с теми же параметрами

// 6. Пользователь возвращается в список:
//    - Всё еще на странице 3 ✅
//    - Фильтр "active" сохранен ✅
//    - Видит обновленное название ✅
```

### Ключевые параметры refetchQueries

```typescript
queryClient.refetchQueries({ 
  queryKey: ['list', projectId, serviceType],
  exact: false,   // ← Обновить ВСЕ вариации ключа (разные params)
  type: 'active'  // ← Только активные (mounted) запросы
});
```

- `exact: false` - ключ `['list', 'admin', 'enterprises']` совпадет с `['list', 'admin', 'enterprises', {...params}]`
- `type: 'active'` - перезагружаются только видимые компоненты, не весь кэш

---

## Архитектура

### Структура файлов

```
shared/
├── lib/
│   └── api/
│       └── core/
│           ├── query-keys.ts        ← Определения ключей кэша
│           └── cache-manager.ts     ← Функции обновления кэша
│
├── api/
│   └── hooks/
│       └── enterprises/
│           ├── useEnterprises.ts    ← Использует listKeys
│           ├── useEnterprise.ts     ← Использует detailKeys
│           ├── useUpdateEnterprise.ts ← Использует updateListCache
│           └── useCreateEnterprise.ts ← Использует updateListCache
│
└── listsAndForms/
    └── universal-list/
        └── hooks/
            └── use-list-query.ts    ← Использует listKeys
```

### 1. Query Keys (query-keys.ts)

Централизованное определение ключей кэша:

```typescript
export const listKeys = {
  // Базовый ключ для инвалидации всех страниц
  all: (projectId: string, serviceType: string) => 
    ['list', projectId, serviceType] as const,
  
  // Ключ конкретной страницы с параметрами
  page: (projectId: string, serviceType: string, params: any) => 
    ['list', projectId, serviceType, params] as const,
};

export const detailKeys = {
  enterprise: (id: string) => ['enterprise', id] as const,
  invoice: (id: string) => ['invoice', id] as const,
  // ... добавляйте по мере необходимости
};
```

### 2. Cache Manager (cache-manager.ts)

Функции для обновления кэша:

```typescript
/**
 * Обновляет списки после мутации
 */
export async function updateListCache(options: {
  queryClient: QueryClient;
  projectId: string;
  serviceType: string;
}): Promise<void>

/**
 * Обновляет детальную view
 */
export function updateDetailCache<T>(options: {
  queryClient: QueryClient;
  detailKey: readonly unknown[];
  data: T;
}): void

/**
 * Инвалидирует детальную view
 */
export async function invalidateDetailCache(options: {
  queryClient: QueryClient;
  detailKey: readonly unknown[];
}): Promise<void>
```

---

## Руководство по использованию

### Шаг 1: Создание SDK метода

```typescript
// shared/api/sdk/counterparties.sdk.ts

export const counterpartiesSDK = {
  async update(id: string, data: UpdateCounterpartyDto) {
    return httpClient.patch<UpdateCounterpartyResponse>(
      `/api/counterparties/${id}`,
      data
    );
  },
  
  // ... другие методы
};
```

### Шаг 2: Создание мутации hook

```typescript
// shared/api/hooks/counterparties/useUpdateCounterparty.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { counterpartiesSDK } from '../../sdk';
import { updateListCache, updateDetailCache } from '../../../lib/api/core/cache-manager';
import { detailKeys } from '../../../lib/api/core/query-keys';

export function useUpdateCounterparty(
  counterpartyId: string, 
  projectId: string
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: UpdateCounterpartyDto) => {
      const result = await counterpartiesSDK.update(counterpartyId, data);
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to update');
      }
      
      return result.data!;
    },
    
    onSuccess: async (response) => {
      // 1. Обновляем детальную view (если открыта)
      updateDetailCache({
        queryClient,
        detailKey: detailKeys.counterparty?.(counterpartyId) || ['counterparty', counterpartyId],
        data: response,
      });
      
      // 2. Обновляем все списки (safe-refetch)
      await updateListCache({
        queryClient,
        projectId,
        serviceType: 'counterparties',
      });
    },
  });
}
```

### Шаг 3: Использование в компоненте

```typescript
// admin/components/CounterpartyFormWrapper.tsx

export function CounterpartyFormWrapper({ mode, counterpartyId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  
  const updateMutation = useUpdateCounterparty(counterpartyId!, 'admin');
  
  const handleSubmit = async (data: UpdateCounterpartyDto) => {
    try {
      await updateMutation.mutateAsync(data);
      
      toast({
        title: 'Контрагента оновлено',
        description: 'Зміни успішно збережено.',
      });
      
      router.back(); // ← Возврат на ту же страницу списка
      
    } catch (error: any) {
      toast({
        title: 'Помилка',
        description: error.message,
        variant: 'destructive',
      });
    }
  };
  
  return (
    <FormRenderer
      onSubmit={handleSubmit}
      isLoading={updateMutation.isPending}
      // ...
    />
  );
}
```

---

## Примеры

### Пример 1: UPDATE операция

```typescript
// shared/api/hooks/products/useUpdateProduct.ts

export function useUpdateProduct(productId: string, projectId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const result = await productsSDK.update(productId, data);
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
    
    onSuccess: async (response) => {
      // Обновляем детали
      updateDetailCache({
        queryClient,
        detailKey: ['product', productId],
        data: response,
      });
      
      // Обновляем списки
      await updateListCache({
        queryClient,
        projectId,
        serviceType: 'products',
      });
    },
  });
}
```

### Пример 2: CREATE операция

```typescript
// shared/api/hooks/products/useCreateProduct.ts

export function useCreateProduct(projectId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const result = await productsSDK.create(data);
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
    
    onSuccess: async () => {
      // При создании обновляем только списки
      // Детали создадутся при навигации на страницу деталей
      await updateListCache({
        queryClient,
        projectId,
        serviceType: 'products',
      });
    },
  });
}
```

### Пример 3: DELETE операция

```typescript
// shared/api/hooks/products/useDeleteProduct.ts

export function useDeleteProduct(projectId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (productId: string) => {
      const result = await productsSDK.delete(productId);
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
    
    onSuccess: async () => {
      // Обновляем списки после удаления
      await updateListCache({
        queryClient,
        projectId,
        serviceType: 'products',
      });
    },
  });
}
```

### Пример 4: Финансовые документы

```typescript
// shared/api/hooks/invoices/useUpdateInvoice.ts

export function useUpdateInvoice(invoiceId: string, projectId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const result = await invoicesSDK.update(invoiceId, data);
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
    
    onSuccess: async (response) => {
      // Обновляем детали (номер документа, суммы, НДС - всё с сервера)
      updateDetailCache({
        queryClient,
        detailKey: ['invoice', invoiceId],
        data: response,
      });
      
      // Та же стратегия safe-refetch
      // Гарантирует точность computed полей
      await updateListCache({
        queryClient,
        projectId,
        serviceType: 'invoices',
      });
    },
  });
}
```

---

## Troubleshooting

### Проблема: Список не обновляется

**Причина:** Несоответствие ключей кэша

**Проверьте:**

1. Хук списка использует `listKeys`:
```typescript
// ✅ Правильно
queryKey: listKeys.page(projectId, serviceType, params)

// ❌ Неправильно
queryKey: ['enterprises', params]
```

2. Мутация использует `updateListCache`:
```typescript
// ✅ Правильно
await updateListCache({ queryClient, projectId, serviceType });

// ❌ Неправильно
queryClient.invalidateQueries({ queryKey: ['enterprises'] });
```

### Проблема: Детали не обновляются

**Причина:** Забыли обновить detailCache

**Решение:**
```typescript
onSuccess: async (response) => {
  // Добавьте это:
  updateDetailCache({
    queryClient,
    detailKey: detailKeys.enterprise(enterpriseId),
    data: response,
  });
  
  await updateListCache({ ... });
}
```

### Проблема: Позиция теряется

**Причина:** Используете `router.push('/')` вместо `router.back()`

**Решение:**
```typescript
// ✅ Правильно - возврат на предыдущую страницу
router.back();

// ❌ Неправильно - переход на главную (страница 1)
router.push('/');
```

### Проблема: Обновляется весь кэш (медленно)

**Причина:** Не используете `type: 'active'`

**Проверьте в cache-manager.ts:**
```typescript
await queryClient.refetchQueries({ 
  queryKey: baseQueryKey,
  exact: false,
  type: 'active'  // ← Должно быть!
});
```

---

## Best Practices

### ✅ DO

1. **Всегда используйте централизованные ключи:**
   ```typescript
   import { listKeys, detailKeys } from 'shared/lib/api/core/query-keys';
   ```

2. **Используйте updateListCache в onSuccess:**
   ```typescript
   onSuccess: async () => {
     await updateListCache({ queryClient, projectId, serviceType });
   }
   ```

3. **Используйте router.back() для возврата:**
   ```typescript
   router.back(); // Сохраняет историю
   ```

4. **Обновляйте детали при UPDATE:**
   ```typescript
   updateDetailCache({ queryClient, detailKey, data: response });
   ```

### ❌ DON'T

1. **Не используйте произвольные ключи:**
   ```typescript
   // ❌ Плохо
   queryKey: ['my-custom-key', params]
   ```

2. **Не инвалидируйте напрямую:**
   ```typescript
   // ❌ Плохо
   queryClient.invalidateQueries({ queryKey: ['enterprises'] });
   ```

3. **Не используйте push для возврата:**
   ```typescript
   // ❌ Плохо - потеря истории
   router.push('/enterprises');
   ```

4. **Не забывайте projectId:**
   ```typescript
   // ❌ Плохо - забыли projectId
   useUpdateEnterprise(id); 
   
   // ✅ Хорошо
   useUpdateEnterprise(id, 'admin');
   ```

---

## См. также

- [ADR-001: Cache Update Strategy](./ADR-001-CACHE_UPDATE_STRATEGY.md)
- [React Query Documentation](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Code: cache-manager.ts](../../shared/lib/api/core/cache-manager.ts)
- [Code: query-keys.ts](../../shared/lib/api/core/query-keys.ts)
