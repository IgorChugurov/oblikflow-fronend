# Примеры использования - Enterprises API

**Дата:** 2026-01-17  
**Версия:** 1.0.0

---

## Содержание

1. [Базовые примеры fetch](#базовые-примеры-fetch)
2. [React Query hooks](#react-query-hooks)
3. [Обработка ошибок](#обработка-ошибок)
4. [Типичные сценарии](#типичные-сценарии)
5. [Валидация форм](#валидация-форм)
6. [API Client wrapper](#api-client-wrapper)

---

## Базовые примеры fetch

### 1. Получить список предприятий

```typescript
import type { EnterpriseListResponse } from '@/shared/types/enterprises';

async function getEnterprises(): Promise<EnterpriseListResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  const jwt = session?.access_token;
  
  const response = await fetch(`${API_URL}/api/enterprises`, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch enterprises');
  }
  
  return response.json();
}

// Использование
const { data } = await getEnterprises();
console.log(data); // Enterprise[]
```

### 2. Создать предприятие

```typescript
import type { 
  CreateEnterpriseDto, 
  CreateEnterpriseResponse 
} from '@/shared/types/enterprises';

async function createEnterprise(
  formData: CreateEnterpriseDto
): Promise<CreateEnterpriseResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  const jwt = session?.access_token;
  
  const response = await fetch(`${API_URL}/api/enterprises`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return response.json();
}

// Использование
const enterprise = await createEnterprise({
  name: "My Company",
  country_code: "UA",
  default_currency: "UAH",
  default_locale: "uk",
});

console.log(enterprise.data.id); // UUID нового предприятия
```

### 3. Обновить предприятие

```typescript
import type { 
  UpdateEnterpriseDto, 
  UpdateEnterpriseResponse 
} from '@/shared/types/enterprises';

async function updateEnterprise(
  id: string,
  updates: UpdateEnterpriseDto
): Promise<UpdateEnterpriseResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  const jwt = session?.access_token;
  
  const response = await fetch(`${API_URL}/api/enterprises/${id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return response.json();
}

// Использование
const updated = await updateEnterprise("enterprise-uuid", {
  name: "Updated Company Name",
});
```

### 4. Получить участников

```typescript
import type { MemberListResponse } from '@/shared/types/enterprises';

async function getMembers(enterpriseId: string): Promise<MemberListResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  const jwt = session?.access_token;
  
  const response = await fetch(
    `${API_URL}/api/enterprises/${enterpriseId}/members`,
    {
      headers: {
        'Authorization': `Bearer ${jwt}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch members');
  }
  
  return response.json();
}
```

### 5. Добавить участника

```typescript
import type { 
  AddMemberDto, 
  AddMemberResponse 
} from '@/shared/types/enterprises';

async function addMember(
  enterpriseId: string,
  data: AddMemberDto
): Promise<AddMemberResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  const jwt = session?.access_token;
  
  const response = await fetch(
    `${API_URL}/api/enterprises/${enterpriseId}/members`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    
    if (response.status === 404) {
      throw new Error('User not found. They need to register first.');
    }
    if (response.status === 409) {
      throw new Error('User is already a member.');
    }
    
    throw new Error(error.error.message);
  }
  
  return response.json();
}

// Использование
try {
  const member = await addMember("enterprise-uuid", {
    email: "newadmin@example.com",
  });
  
  toast.success(`${member.data.name} added as admin`);
} catch (error) {
  toast.error(error.message);
}
```

### 6. Удалить участника

```typescript
async function removeMember(
  enterpriseId: string,
  userId: string
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const jwt = session?.access_token;
  
  const response = await fetch(
    `${API_URL}/api/enterprises/${enterpriseId}/members/${userId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${jwt}`,
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    
    if (response.status === 400) {
      throw new Error('Cannot remove owner');
    }
    
    throw new Error(error.error.message);
  }
}
```

---

## React Query hooks

### useEnterprises (список)

```typescript
import { useQuery } from '@tanstack/react-query';
import type { EnterpriseListResponse } from '@/shared/types/enterprises';

function useEnterprises() {
  return useQuery<EnterpriseListResponse>({
    queryKey: ['enterprises'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/enterprises`, {
        headers: {
          'Authorization': `Bearer ${jwt}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch enterprises');
      }
      
      return response.json();
    },
  });
}

// Использование в компоненте
function EnterprisesPage() {
  const { data, isLoading, error } = useEnterprises();
  
  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div>
      {data?.data.map(enterprise => (
        <EnterpriseCard key={enterprise.id} enterprise={enterprise} />
      ))}
    </div>
  );
}
```

### useCreateEnterprise (создание)

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateEnterpriseDto } from '@/shared/types/enterprises';

function useCreateEnterprise() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateEnterpriseDto) => {
      const response = await fetch(`${API_URL}/api/enterprises`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error.message);
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Инвалидировать кеш списка предприятий
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
    },
  });
}

// Использование в компоненте
function CreateEnterpriseForm() {
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
      {/* форма */}
    </Form>
  );
}
```

### useUpdateEnterprise (обновление)

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateEnterpriseDto } from '@/shared/types/enterprises';

function useUpdateEnterprise(enterpriseId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: UpdateEnterpriseDto) => {
      const response = await fetch(
        `${API_URL}/api/enterprises/${enterpriseId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error.message);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      queryClient.invalidateQueries({ 
        queryKey: ['enterprise', enterpriseId] 
      });
    },
  });
}
```

### useMembers (список участников)

```typescript
import { useQuery } from '@tanstack/react-query';
import type { MemberListResponse } from '@/shared/types/enterprises';

function useMembers(enterpriseId: string) {
  return useQuery<MemberListResponse>({
    queryKey: ['members', enterpriseId],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/api/enterprises/${enterpriseId}/members`,
        {
          headers: {
            'Authorization': `Bearer ${jwt}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      
      return response.json();
    },
  });
}
```

---

## Обработка ошибок

### Централизованная обработка

```typescript
import { isApiError } from '@/shared/types/enterprises';

async function handleApiRequest<T>(
  request: () => Promise<Response>
): Promise<T> {
  try {
    const response = await request();
    
    if (!response.ok) {
      const error = await response.json();
      
      // Обработка специфичных ошибок
      switch (response.status) {
        case 401:
          // Redirect на login
          window.location.href = '/login';
          throw new Error('Unauthorized');
          
        case 403:
          throw new Error('You don\'t have permission to perform this action');
          
        case 404:
          throw new Error('Resource not found');
          
        case 409:
          throw new Error('This resource already exists');
          
        case 422:
          // Validation errors
          const details = error.error.details;
          throw new Error(
            `Validation error: ${details.field} - ${details.reason}`
          );
          
        default:
          throw new Error(error.error.message || 'Unknown error');
      }
    }
    
    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Использование
try {
  const data = await handleApiRequest<EnterpriseListResponse>(() =>
    fetch(`${API_URL}/api/enterprises`, {
      headers: {
        'Authorization': `Bearer ${jwt}`,
      },
    })
  );
} catch (error) {
  toast.error(error.message);
}
```

### Обработка с Toast уведомлениями

```typescript
import { toast } from 'sonner';

async function createEnterpriseWithToast(data: CreateEnterpriseDto) {
  const toastId = toast.loading('Creating enterprise...');
  
  try {
    const result = await createEnterprise(data);
    
    toast.success('Enterprise created successfully!', { id: toastId });
    
    return result;
  } catch (error) {
    if (error.message.includes('validation')) {
      toast.error('Please check your input', { id: toastId });
    } else if (error.message.includes('permission')) {
      toast.error('You don\'t have permission', { id: toastId });
    } else {
      toast.error('Failed to create enterprise', { id: toastId });
    }
    
    throw error;
  }
}
```

---

## Типичные сценарии

### Сценарий 1: Создание первого предприятия

```typescript
import { useRouter } from 'next/navigation';
import { useCreateEnterprise } from '@/hooks/useCreateEnterprise';

function CreateFirstEnterpriseFlow() {
  const router = useRouter();
  const createMutation = useCreateEnterprise();
  
  const handleCreate = async (data: CreateEnterpriseDto) => {
    try {
      const result = await createMutation.mutateAsync(data);
      
      // Установить cookie для автовыбора
      document.cookie = `current_enterprise_id=${result.data.id}; path=/`;
      
      // Redirect на главную страницу
      router.push('/');
      
      toast.success('Welcome to your new enterprise!');
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  return <EnterpriseForm onSubmit={handleCreate} />;
}
```

### Сценарий 2: Список с пустым состоянием

```typescript
function EnterprisesList() {
  const { data, isLoading } = useEnterprises();
  
  if (isLoading) {
    return <Spinner />;
  }
  
  if (!data?.data.length) {
    return (
      <EmptyState
        title="No enterprises yet"
        description="Create your first enterprise to get started"
        action={
          <Button onClick={() => router.push('/enterprises/new')}>
            Create Enterprise
          </Button>
        }
      />
    );
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

### Сценарий 3: Форма редактирования с pre-fill

```typescript
function EditEnterpriseForm({ id }: { id: string }) {
  const { data: enterpriseData, isLoading } = useEnterprise(id);
  const updateMutation = useUpdateEnterprise(id);
  
  if (isLoading) return <Spinner />;
  
  const enterprise = enterpriseData?.data;
  
  const handleSubmit = async (updates: UpdateEnterpriseDto) => {
    try {
      await updateMutation.mutateAsync(updates);
      toast.success('Enterprise updated!');
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  return (
    <Form
      defaultValues={{
        name: enterprise?.name,
        default_currency: enterprise?.default_currency,
        default_locale: enterprise?.default_locale,
      }}
      onSubmit={handleSubmit}
    />
  );
}
```

### Сценарий 4: Приглашение участника

```typescript
function InviteMemberDialog({ enterpriseId }: { enterpriseId: string }) {
  const [email, setEmail] = useState('');
  const addMemberMutation = useAddMember(enterpriseId);
  
  const handleInvite = async () => {
    try {
      const result = await addMemberMutation.mutateAsync({ email });
      
      toast.success(`${result.data.name} has been added as admin`);
      
      setEmail('');
      onClose();
    } catch (error) {
      if (error.message.includes('not found')) {
        toast.error('User not registered. They need to sign up first.');
      } else if (error.message.includes('already a member')) {
        toast.error('This user is already a member.');
      } else {
        toast.error(error.message);
      }
    }
  };
  
  return (
    <Dialog>
      <Input 
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="user@example.com"
      />
      <Button onClick={handleInvite} disabled={addMemberMutation.isPending}>
        {addMemberMutation.isPending ? 'Inviting...' : 'Invite'}
      </Button>
    </Dialog>
  );
}
```

---

## Валидация форм

### Zod схемы

```typescript
import { z } from 'zod';
import type { CreateEnterpriseDto } from '@/shared/types/enterprises';

export const createEnterpriseSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name is too long'),
  
  country_code: z.string()
    .length(2, 'Must be ISO 3166-1 alpha-2')
    .regex(/^[A-Z]{2}$/, 'Must be uppercase'),
  
  default_currency: z.string()
    .length(3, 'Must be ISO 4217')
    .regex(/^[A-Z]{3}$/, 'Must be uppercase'),
  
  default_locale: z.string()
    .length(2, 'Must be ISO 639-1')
    .regex(/^[a-z]{2}$/, 'Must be lowercase')
    .optional(),
}) satisfies z.ZodType<CreateEnterpriseDto>;

export type CreateEnterpriseFormData = z.infer<typeof createEnterpriseSchema>;
```

### React Hook Form интеграция

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEnterpriseSchema } from './schemas';

function EnterpriseForm() {
  const form = useForm<CreateEnterpriseFormData>({
    resolver: zodResolver(createEnterpriseSchema),
    defaultValues: {
      name: '',
      country_code: '',
      default_currency: '',
      default_locale: undefined,
    },
  });
  
  const onSubmit = async (data: CreateEnterpriseFormData) => {
    try {
      await createEnterprise(data);
      toast.success('Enterprise created!');
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input {...form.register('name')} />
      {form.formState.errors.name && (
        <ErrorMessage>{form.formState.errors.name.message}</ErrorMessage>
      )}
      
      {/* другие поля */}
      
      <Button type="submit" disabled={form.formState.isSubmitting}>
        Create
      </Button>
    </form>
  );
}
```

---

## API Client wrapper

### Централизованный клиент

```typescript
// lib/api-client.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class ApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  private async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    
    if (!jwt) {
      throw new Error('Not authenticated');
    }
    
    return {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    };
  }
  
  async get<T>(path: string): Promise<T> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers,
    });
    
    if (!response.ok) {
      await this.handleError(response);
    }
    
    return response.json();
  }
  
  async post<T>(path: string, body: any): Promise<T> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      await this.handleError(response);
    }
    
    return response.json();
  }
  
  async patch<T>(path: string, body: any): Promise<T> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      await this.handleError(response);
    }
    
    return response.json();
  }
  
  async delete(path: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers,
    });
    
    if (!response.ok) {
      await this.handleError(response);
    }
  }
  
  private async handleError(response: Response): Promise<never> {
    const error = await response.json();
    
    if (response.status === 401) {
      // Try refresh
      const { data } = await supabase.auth.refreshSession();
      
      if (!data.session) {
        window.location.href = '/login';
      }
    }
    
    throw new Error(error.error?.message || 'Unknown error');
  }
}

export const apiClient = new ApiClient(process.env.NEXT_PUBLIC_API_URL!);
```

### Использование клиента

```typescript
import { apiClient } from '@/lib/api-client';
import type { 
  EnterpriseListResponse,
  CreateEnterpriseDto,
  CreateEnterpriseResponse,
} from '@/shared/types/enterprises';

// Список
const enterprises = await apiClient.get<EnterpriseListResponse>(
  '/api/enterprises'
);

// Создание
const newEnterprise = await apiClient.post<CreateEnterpriseResponse>(
  '/api/enterprises',
  {
    name: 'My Company',
    country_code: 'UA',
    default_currency: 'UAH',
  } as CreateEnterpriseDto
);

// Обновление
const updated = await apiClient.patch<UpdateEnterpriseResponse>(
  `/api/enterprises/${id}`,
  { name: 'Updated Name' }
);

// Удаление
await apiClient.delete(`/api/enterprises/${id}/members/${userId}`);
```

---

**Обновлено:** 2026-01-17  
**Версия:** 1.0.0
