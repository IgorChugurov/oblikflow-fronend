# React Query Guide - Enterprises API

**Дата:** 2026-01-17  
**Версия:** 1.0.0  
**React Query:** v5.x

---

## Содержание

1. [Основы React Query](#основы-react-query)
2. [Queries (GET запросы)](#queries-get-запросы)
3. [Mutations (POST/PATCH/DELETE)](#mutations-postpatchdelete)
4. [Инвалидация кеша](#инвалидация-кеша)
5. [Оптимистичные обновления](#оптимистичные-обновления)
6. [Полный пример](#полный-пример)

---

## Основы React Query

### Установка

```bash
pnpm add @tanstack/react-query
```

### Setup Provider

```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 минута
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

```typescript
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## Queries (GET запросы)

Queries используются для **получения данных** (GET запросы).

### Базовая структура

```typescript
import { useQuery } from '@tanstack/react-query';

const { 
  data,           // данные ответа
  isLoading,      // первая загрузка
  isFetching,     // любая загрузка (включая background refetch)
  isError,        // ошибка
  error,          // объект ошибки
  refetch,        // ручной refetch
} = useQuery({
  queryKey: ['key'],          // уникальный ключ
  queryFn: async () => {      // функция загрузки
    const response = await fetch(...);
    return response.json();
  },
});
```

### 1. useEnterprises - Список предприятий

```typescript
// hooks/useEnterprises.ts
import { useQuery } from '@tanstack/react-query';
import type { EnterpriseListResponse } from '@/shared/types/enterprises';
import { apiClient } from '@/lib/api-client';

export function useEnterprises() {
  return useQuery<EnterpriseListResponse>({
    queryKey: ['enterprises'],
    queryFn: () => apiClient.get<EnterpriseListResponse>('/api/enterprises'),
  });
}
```

**Использование в компоненте:**

```typescript
'use client';

import { useEnterprises } from '@/hooks/useEnterprises';

function EnterprisesPage() {
  const { data, isLoading, isError, error } = useEnterprises();
  
  if (isLoading) {
    return <Spinner />;
  }
  
  if (isError) {
    return <ErrorMessage error={error} />;
  }
  
  if (!data?.data.length) {
    return <EmptyState title="No enterprises" />;
  }
  
  return (
    <div className="grid gap-4">
      {data.data.map(enterprise => (
        <EnterpriseCard key={enterprise.id} enterprise={enterprise} />
      ))}
    </div>
  );
}
```

### 2. useEnterprise - Одно предприятие

```typescript
// hooks/useEnterprise.ts
import { useQuery } from '@tanstack/react-query';
import type { EnterpriseDetailsResponse } from '@/shared/types/enterprises';
import { apiClient } from '@/lib/api-client';

export function useEnterprise(id: string) {
  return useQuery<EnterpriseDetailsResponse>({
    queryKey: ['enterprise', id],
    queryFn: () => apiClient.get<EnterpriseDetailsResponse>(`/api/enterprises/${id}`),
    enabled: !!id, // запрос выполнится только если id есть
  });
}
```

**Использование:**

```typescript
function EnterpriseDetails({ id }: { id: string }) {
  const { data, isLoading } = useEnterprise(id);
  
  if (isLoading) return <Spinner />;
  
  const enterprise = data?.data;
  
  return (
    <div>
      <h1>{enterprise?.name}</h1>
      <p>Currency: {enterprise?.default_currency}</p>
      <p>Role: {enterprise?.role}</p>
    </div>
  );
}
```

### 3. useMembers - Список участников

```typescript
// hooks/useMembers.ts
import { useQuery } from '@tanstack/react-query';
import type { MemberListResponse } from '@/shared/types/enterprises';
import { apiClient } from '@/lib/api-client';

export function useMembers(enterpriseId: string) {
  return useQuery<MemberListResponse>({
    queryKey: ['members', enterpriseId],
    queryFn: () => apiClient.get<MemberListResponse>(
      `/api/enterprises/${enterpriseId}/members`
    ),
    enabled: !!enterpriseId,
  });
}
```

### 4. useReferenceData - Справочники

```typescript
// hooks/useReferenceData.ts
import { useQuery } from '@tanstack/react-query';
import type { 
  LocaleListResponse,
  CurrencyListResponse,
  CountryListResponse,
} from '@/shared/types/enterprises';

export function useLocales() {
  return useQuery<LocaleListResponse>({
    queryKey: ['locales'],
    queryFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/locales`);
      return response.json();
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 часа - редко меняются
    cacheTime: 1000 * 60 * 60 * 24 * 7, // 7 дней
  });
}

export function useCurrencies() {
  return useQuery<CurrencyListResponse>({
    queryKey: ['currencies'],
    queryFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/currencies`);
      return response.json();
    },
    staleTime: 1000 * 60 * 60 * 24,
    cacheTime: 1000 * 60 * 60 * 24 * 7,
  });
}

export function useCountries() {
  return useQuery<CountryListResponse>({
    queryKey: ['countries'],
    queryFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/countries`);
      return response.json();
    },
    staleTime: 1000 * 60 * 60 * 24,
    cacheTime: 1000 * 60 * 60 * 24 * 7,
  });
}
```

---

## Mutations (POST/PATCH/DELETE)

Mutations используются для **изменения данных** (POST, PATCH, DELETE).

### Базовая структура

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: async (data) => {
    const response = await fetch(...);
    return response.json();
  },
  onSuccess: () => {
    // Инвалидировать кеш после успеха
    queryClient.invalidateQueries({ queryKey: ['key'] });
  },
});

// Использование
mutation.mutate(data);          // fire and forget
await mutation.mutateAsync(data); // with await
```

### 1. useCreateEnterprise - Создание

```typescript
// hooks/useCreateEnterprise.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { 
  CreateEnterpriseDto,
  CreateEnterpriseResponse,
} from '@/shared/types/enterprises';
import { apiClient } from '@/lib/api-client';

export function useCreateEnterprise() {
  const queryClient = useQueryClient();
  
  return useMutation<CreateEnterpriseResponse, Error, CreateEnterpriseDto>({
    mutationFn: (data) => 
      apiClient.post<CreateEnterpriseResponse>('/api/enterprises', data),
    
    onSuccess: () => {
      // Инвалидировать список enterprises
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
    },
  });
}
```

**Использование с async/await:**

```typescript
function CreateEnterpriseForm() {
  const router = useRouter();
  const createMutation = useCreateEnterprise();
  
  const handleSubmit = async (data: CreateEnterpriseDto) => {
    try {
      const result = await createMutation.mutateAsync(data);
      
      toast.success('Enterprise created!');
      router.push(`/enterprises/${result.data.id}`);
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  return (
    <Form onSubmit={handleSubmit}>
      {/* поля формы */}
      <Button 
        type="submit" 
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? 'Creating...' : 'Create'}
      </Button>
    </Form>
  );
}
```

**Использование с callbacks:**

```typescript
function CreateEnterpriseForm() {
  const router = useRouter();
  const createMutation = useCreateEnterprise();
  
  const handleSubmit = (data: CreateEnterpriseDto) => {
    createMutation.mutate(data, {
      onSuccess: (result) => {
        toast.success('Enterprise created!');
        router.push(`/enterprises/${result.data.id}`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };
  
  return <Form onSubmit={handleSubmit} />;
}
```

### 2. useUpdateEnterprise - Обновление

```typescript
// hooks/useUpdateEnterprise.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { 
  UpdateEnterpriseDto,
  UpdateEnterpriseResponse,
} from '@/shared/types/enterprises';
import { apiClient } from '@/lib/api-client';

export function useUpdateEnterprise(enterpriseId: string) {
  const queryClient = useQueryClient();
  
  return useMutation<UpdateEnterpriseResponse, Error, UpdateEnterpriseDto>({
    mutationFn: (data) => 
      apiClient.patch<UpdateEnterpriseResponse>(
        `/api/enterprises/${enterpriseId}`, 
        data
      ),
    
    onSuccess: () => {
      // Инвалидировать список И конкретное предприятие
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      queryClient.invalidateQueries({ queryKey: ['enterprise', enterpriseId] });
    },
  });
}
```

**Использование:**

```typescript
function EditEnterpriseForm({ id }: { id: string }) {
  const { data: enterpriseData } = useEnterprise(id);
  const updateMutation = useUpdateEnterprise(id);
  
  const handleSubmit = async (updates: UpdateEnterpriseDto) => {
    try {
      await updateMutation.mutateAsync(updates);
      toast.success('Enterprise updated!');
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  const enterprise = enterpriseData?.data;
  
  return (
    <Form
      defaultValues={{
        name: enterprise?.name,
        default_currency: enterprise?.default_currency,
      }}
      onSubmit={handleSubmit}
    />
  );
}
```

### 3. useAddMember - Добавление участника

```typescript
// hooks/useAddMember.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { 
  AddMemberDto,
  AddMemberResponse,
} from '@/shared/types/enterprises';
import { apiClient } from '@/lib/api-client';

export function useAddMember(enterpriseId: string) {
  const queryClient = useQueryClient();
  
  return useMutation<AddMemberResponse, Error, AddMemberDto>({
    mutationFn: (data) => 
      apiClient.post<AddMemberResponse>(
        `/api/enterprises/${enterpriseId}/members`, 
        data
      ),
    
    onSuccess: () => {
      // Инвалидировать список участников
      queryClient.invalidateQueries({ queryKey: ['members', enterpriseId] });
    },
  });
}
```

**Использование:**

```typescript
function InviteMemberDialog({ enterpriseId }: { enterpriseId: string }) {
  const [email, setEmail] = useState('');
  const addMutation = useAddMember(enterpriseId);
  
  const handleInvite = async () => {
    try {
      const result = await addMutation.mutateAsync({ email });
      
      toast.success(`${result.data.name} has been added!`);
      setEmail('');
      onClose();
    } catch (error) {
      if (error.message.includes('not found')) {
        toast.error('User not registered. They need to sign up first.');
      } else {
        toast.error(error.message);
      }
    }
  };
  
  return (
    <Dialog>
      <Input 
        value={email}
        onChange={e => setEmail(e.target.value)}
        disabled={addMutation.isPending}
      />
      <Button 
        onClick={handleInvite} 
        disabled={addMutation.isPending}
      >
        {addMutation.isPending ? 'Inviting...' : 'Invite'}
      </Button>
    </Dialog>
  );
}
```

### 4. useRemoveMember - Удаление участника

```typescript
// hooks/useRemoveMember.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useRemoveMember(enterpriseId: string) {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: (userId) => 
      apiClient.delete(`/api/enterprises/${enterpriseId}/members/${userId}`),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', enterpriseId] });
    },
  });
}
```

**Использование:**

```typescript
function MembersList({ enterpriseId }: { enterpriseId: string }) {
  const { data: membersData } = useMembers(enterpriseId);
  const removeMutation = useRemoveMember(enterpriseId);
  
  const handleRemove = async (userId: string, userName: string) => {
    const confirmed = window.confirm(`Remove ${userName}?`);
    
    if (!confirmed) return;
    
    try {
      await removeMutation.mutateAsync(userId);
      toast.success('Member removed');
    } catch (error) {
      if (error.message.includes('owner')) {
        toast.error('Cannot remove owner');
      } else {
        toast.error(error.message);
      }
    }
  };
  
  return (
    <div>
      {membersData?.data.map(member => (
        <div key={member.user_id}>
          <span>{member.name}</span>
          <Button 
            onClick={() => handleRemove(member.user_id, member.name)}
            disabled={member.is_owner || removeMutation.isPending}
          >
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}
```

---

## Инвалидация кеша

После успешной мутации нужно **обновить кеш**, чтобы UI показывал актуальные данные.

### Способы инвалидации

#### 1. invalidateQueries - Пометить данные как устаревшие

```typescript
const queryClient = useQueryClient();

// Инвалидировать конкретный ключ
queryClient.invalidateQueries({ queryKey: ['enterprises'] });

// Инвалидировать все queries с префиксом
queryClient.invalidateQueries({ queryKey: ['enterprise'] }); // все enterprise queries

// Инвалидировать с exact match
queryClient.invalidateQueries({ 
  queryKey: ['enterprise', id],
  exact: true 
});
```

**Что происходит:**
- Данные помечаются как `stale`
- Если компонент активен → автоматически refetch
- Если компонент неактивен → refetch при следующем mount

#### 2. setQueryData - Обновить данные напрямую

```typescript
// После создания - добавить в список
queryClient.setQueryData<EnterpriseListResponse>(
  ['enterprises'], 
  (old) => {
    if (!old) return old;
    
    return {
      ...old,
      data: [...old.data, newEnterprise],
      meta: {
        ...old.meta,
        total: (old.meta?.total || 0) + 1,
      },
    };
  }
);
```

#### 3. refetch - Принудительная перезагрузка

```typescript
const { refetch } = useEnterprises();

// В любом месте компонента
await refetch();
```

### Примеры инвалидации для каждой мутации

```typescript
// CREATE - инвалидировать список
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['enterprises'] });
}

// UPDATE - инвалидировать список И деталь
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['enterprises'] });
  queryClient.invalidateQueries({ queryKey: ['enterprise', id] });
}

// DELETE - инвалидировать список
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['enterprises'] });
}

// ADD MEMBER - инвалидировать список членов
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['members', enterpriseId] });
}

// REMOVE MEMBER - инвалидировать список членов
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['members', enterpriseId] });
}
```

---

## Оптимистичные обновления

Для лучшего UX можно обновлять UI **до получения ответа** от сервера.

### Пример: Оптимистичное обновление имени

```typescript
export function useUpdateEnterprise(enterpriseId: string) {
  const queryClient = useQueryClient();
  
  return useMutation<UpdateEnterpriseResponse, Error, UpdateEnterpriseDto>({
    mutationFn: (data) => 
      apiClient.patch(`/api/enterprises/${enterpriseId}`, data),
    
    // Перед отправкой запроса
    onMutate: async (updates) => {
      // Отменить текущие queries
      await queryClient.cancelQueries({ queryKey: ['enterprise', enterpriseId] });
      
      // Сохранить предыдущие данные (для rollback)
      const previousData = queryClient.getQueryData<EnterpriseDetailsResponse>(
        ['enterprise', enterpriseId]
      );
      
      // Оптимистично обновить UI
      queryClient.setQueryData<EnterpriseDetailsResponse>(
        ['enterprise', enterpriseId],
        (old) => {
          if (!old) return old;
          
          return {
            ...old,
            data: {
              ...old.data,
              ...updates,
            },
          };
        }
      );
      
      // Вернуть context для rollback
      return { previousData };
    },
    
    // В случае ошибки - откатить
    onError: (error, updates, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['enterprise', enterpriseId],
          context.previousData
        );
      }
      
      toast.error('Failed to update');
    },
    
    // После завершения (успех или ошибка)
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise', enterpriseId] });
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
    },
  });
}
```

### Пример: Оптимистичное удаление участника

```typescript
export function useRemoveMember(enterpriseId: string) {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: (userId) => 
      apiClient.delete(`/api/enterprises/${enterpriseId}/members/${userId}`),
    
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ['members', enterpriseId] });
      
      const previousMembers = queryClient.getQueryData<MemberListResponse>(
        ['members', enterpriseId]
      );
      
      // Оптимистично удалить из списка
      queryClient.setQueryData<MemberListResponse>(
        ['members', enterpriseId],
        (old) => {
          if (!old) return old;
          
          return {
            ...old,
            data: old.data.filter(m => m.user_id !== userId),
            meta: {
              ...old.meta,
              total: (old.meta?.total || 0) - 1,
            },
          };
        }
      );
      
      return { previousMembers };
    },
    
    onError: (error, userId, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(
          ['members', enterpriseId],
          context.previousMembers
        );
      }
    },
    
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['members', enterpriseId] });
    },
  });
}
```

---

## Полный пример

### Компонент со всеми операциями

```typescript
'use client';

import { useState } from 'react';
import { useEnterprises } from '@/hooks/useEnterprises';
import { useCreateEnterprise } from '@/hooks/useCreateEnterprise';
import { useUpdateEnterprise } from '@/hooks/useUpdateEnterprise';

function EnterprisesManager() {
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Query для списка
  const { 
    data: enterprisesData, 
    isLoading,
    isError,
    error,
  } = useEnterprises();
  
  // Mutation для создания
  const createMutation = useCreateEnterprise();
  
  // Mutation для обновления (используется для editingId)
  const updateMutation = useUpdateEnterprise(editingId || '');
  
  const handleCreate = async (data: CreateEnterpriseDto) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Created!');
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  const handleUpdate = async (data: UpdateEnterpriseDto) => {
    if (!editingId) return;
    
    try {
      await updateMutation.mutateAsync(data);
      toast.success('Updated!');
      setEditingId(null);
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  if (isLoading) {
    return <Spinner />;
  }
  
  if (isError) {
    return (
      <ErrorMessage 
        title="Failed to load enterprises"
        message={error.message}
      />
    );
  }
  
  return (
    <div>
      {/* Форма создания */}
      <CreateForm 
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
      />
      
      {/* Список */}
      <div className="mt-8">
        {enterprisesData?.data.map(enterprise => (
          <div key={enterprise.id}>
            {editingId === enterprise.id ? (
              <EditForm
                defaultValues={{
                  name: enterprise.name,
                  default_currency: enterprise.default_currency,
                }}
                onSubmit={handleUpdate}
                onCancel={() => setEditingId(null)}
                isSubmitting={updateMutation.isPending}
              />
            ) : (
              <EnterpriseCard
                enterprise={enterprise}
                onEdit={() => setEditingId(enterprise.id)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Полный набор hooks

```typescript
// hooks/index.ts
export { useEnterprises } from './useEnterprises';
export { useEnterprise } from './useEnterprise';
export { useCreateEnterprise } from './useCreateEnterprise';
export { useUpdateEnterprise } from './useUpdateEnterprise';
export { useMembers } from './useMembers';
export { useAddMember } from './useAddMember';
export { useRemoveMember } from './useRemoveMember';
export { useLocales, useCurrencies, useCountries } from './useReferenceData';
```

---

## Ключевые моменты React Query

### Для Queries (GET):

1. **queryKey** - уникальный идентификатор запроса
   - Массив: `['enterprises']`, `['enterprise', id]`
   - Используется для кеширования

2. **queryFn** - функция загрузки данных
   - Должна возвращать Promise
   - Должна бросать ошибку при неудаче

3. **Полезные опции:**
   - `enabled` - условная загрузка
   - `staleTime` - как долго данные "свежие"
   - `cacheTime` - как долго хранить в кеше
   - `retry` - количество повторов при ошибке

### Для Mutations (POST/PATCH/DELETE):

1. **mutationFn** - функция изменения данных
   - Принимает параметры мутации
   - Возвращает Promise

2. **onSuccess** - после успеха
   - Инвалидация кеша
   - Redirect
   - Toast уведомления

3. **onError** - при ошибке
   - Rollback оптимистичных изменений
   - Показ ошибок

4. **onMutate** - перед отправкой
   - Оптимистичные обновления
   - Сохранение snapshot для rollback

---

**Обновлено:** 2026-01-17  
**Версия:** 1.0.0
