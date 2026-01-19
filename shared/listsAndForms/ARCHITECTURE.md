# Architecture: Universal Lists & Forms для oblikflow

## Принципы архитектуры

### 1. **Универсальные компоненты НЕ знают про SDK**

```typescript
// ❌ НЕПРАВИЛЬНО - Universal компонент зависит от SDK
function UniversalList() {
  const { sdk } = useSDK(); // ← SDK внутри!
  const data = await sdk.getInstances();
}

// ✅ ПРАВИЛЬНО - Universal компонент получает функции через props
function UniversalList({ onLoadData, onDelete }) {
  const data = await onLoadData(params); // ← Не знает откуда данные!
}
```

### 2. **Page Wrappers формируют props**

Каждая страница имеет свою обертку, которая:
- Загружает конфигурацию из JSON
- Подключает нужный SDK
- Формирует `onLoadData` и `onDelete` функции
- Настраивает routing для Next.js
- Передает все в Universal компонент

### 3. **Actions универсальны**

Все actions - это просто ссылки или функции:
- `type: "edit"` → link на `/entities/{id}/edit`
- `type: "delete"` → вызывает `onDelete(id)`
- `type: "link"` → link на любой URL (в т.ч. `/members`)

Нет специальных типов вроде `"members"` - все через `"link"`.

---

## Архитектура в примерах

### **Уровень 1: Universal Components (переиспользуемые)**

```typescript
// shared/listsAndForms/universal-list/UniversalEntityListClient.tsx
interface UniversalEntityListClientProps<TData extends { id: string }> {
  // Конфигурация (из JSON)
  listSpec: ListSpec;
  
  // Данные (универсальные функции)
  onLoadData: LoadDataFn<TData>;
  onDelete: (id: string) => Promise<void>;
  
  // Routing (универсальный)
  routing: RoutingConfig;
  
  // Служебное
  projectId: string;
  serviceType: ServiceType;
  readOnly?: boolean;
}

export function UniversalEntityListClient<TData>({
  listSpec,
  onLoadData,
  onDelete,
  routing,
  projectId,
  serviceType,
  readOnly,
}: UniversalEntityListClientProps<TData>) {
  // ← НЕ знает про enterprisesSDK, membersSDK и т.д.
  // ← Только работает с переданными функциями
  
  const { data, isLoading } = useListQuery({
    projectId,
    serviceType,
    onLoadData, // ← Просто вызывает эту функцию
  });
  
  const handleDelete = async (id: string) => {
    await onDelete(id); // ← Просто вызывает эту функцию
    queryClient.invalidateQueries(['list', projectId, serviceType]);
  };
  
  // ... rendering logic
}
```

---

### **Уровень 2: Page Wrappers (обертки для конкретных страниц)**

```typescript
// admin/components/EnterprisesListWrapper.tsx
import { UniversalEntityListClient } from '@/shared/listsAndForms/universal-list';
import { enterprisesSDK } from '@/shared/api/sdk';
import enterprisesConfig from '@/shared/listsAndForms/configuration-setup/enterprises.config.json';
import type { Enterprise } from '@/shared/types/enterprises';
import type { LoadDataFn, LoadDataResult } from '@/shared/listsAndForms/types';

interface EnterprisesListWrapperProps {
  readOnly?: boolean;
}

export function EnterprisesListWrapper({ readOnly = false }: EnterprisesListWrapperProps) {
  // ========================================
  // 1. Загрузка конфигурации
  // ========================================
  const listSpec = enterprisesConfig.list;
  
  // ========================================
  // 2. Формирование onLoadData (адаптер SDK → Universal)
  // ========================================
  const onLoadData: LoadDataFn<Enterprise> = async (params) => {
    // Вызываем SDK
    const result = await enterprisesSDK.getAll();
    
    // Проверяем ошибки
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    // Трансформируем в формат LoadDataResult
    const enterprises = result.data?.data || [];
    const total = result.data?.meta?.total || enterprises.length;
    
    // Client-side filtering (если нужен search)
    let filteredData = enterprises;
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredData = enterprises.filter(e => 
        e.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Client-side pagination
    const start = (params.page - 1) * params.limit;
    const end = start + params.limit;
    const paginatedData = filteredData.slice(start, end);
    
    const loadDataResult: LoadDataResult<Enterprise> = {
      data: paginatedData,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: filteredData.length,
        totalPages: Math.ceil(filteredData.length / params.limit),
        hasPreviousPage: params.page > 1,
        hasNextPage: end < filteredData.length,
      },
    };
    
    return loadDataResult;
  };
  
  // ========================================
  // 3. Формирование onDelete (адаптер SDK → Universal)
  // ========================================
  const onDelete = async (id: string) => {
    const result = await enterprisesSDK.delete(id);
    
    if (result.error) {
      throw new Error(result.error.message);
    }
  };
  
  // ========================================
  // 4. Routing для Next.js
  // ========================================
  const routing = {
    createUrlTemplate: '/enterprises/new',
    editUrlTemplate: '/enterprises/{id}/edit',
    basePath: '/enterprises',
  };
  
  // ========================================
  // 5. Передаем все в Universal компонент
  // ========================================
  return (
    <UniversalEntityListClient<Enterprise>
      projectId="admin"
      serviceType="enterprises"
      listSpec={listSpec}
      routing={routing}
      onLoadData={onLoadData}
      onDelete={onDelete}
      readOnly={readOnly}
    />
  );
}
```

---

### **Уровень 3: Page Components (Next.js pages)**

```typescript
// admin/app/page.tsx
import { EnterprisesListWrapper } from '@/admin/components/EnterprisesListWrapper';

export default function EnterprisesPage() {
  return <EnterprisesListWrapper />;
}
```

**Вот и всё!** 🎉

---

## Routing в Next.js App Router

### **Обработка rowClick (клик на строку)**

```typescript
// В UniversalEntityListClient (универсальный)
import { useRouter } from 'next/navigation';

function UniversalEntityListClient({ listSpec, ... }) {
  const router = useRouter();
  
  const handleRowClick = (row: TData) => {
    const config = listSpec.rowClick;
    if (!config) return;
    
    if (config.action === 'navigate') {
      // Заменяем плейсхолдеры в URL
      let url = config.urlTemplate || '';
      Object.keys(row).forEach(key => {
        url = url.replace(`{${key}}`, (row as any)[key]);
      });
      
      // Устанавливаем cookie если нужно
      if (config.setCookie) {
        const value = (row as any)[config.setCookie.valueField];
        document.cookie = `${config.setCookie.name}=${value}; path=/`;
      }
      
      // Навигация через Next.js router
      router.push(url);
    }
  };
  
  // ...
}
```

### **Обработка actions (действия)**

```typescript
// В table-column-generator.ts (универсальный)
import { useRouter } from 'next/navigation';

export function generateActionsColumn(
  actions: ActionConfig[],
  onDelete: (id: string) => void,
  router: ReturnType<typeof useRouter>
) {
  return {
    id: 'actions',
    header: 'Дії',
    cell: ({ row }) => {
      return (
        <DropdownMenu>
          {actions.map(action => {
            // Edit action
            if (action.type === 'edit') {
              const url = action.urlTemplate?.replace('{id}', row.id);
              return (
                <DropdownMenuItem onClick={() => router.push(url)}>
                  {action.label}
                </DropdownMenuItem>
              );
            }
            
            // Link action (универсальный - для members тоже)
            if (action.type === 'link') {
              const url = action.urlTemplate?.replace('{id}', row.id);
              return (
                <DropdownMenuItem onClick={() => router.push(url)}>
                  {action.label}
                </DropdownMenuItem>
              );
            }
            
            // Delete action
            if (action.type === 'delete') {
              // Проверка условий видимости
              if (action.showOnlyFor) {
                const fieldValue = row[action.showOnlyFor.field];
                if (fieldValue !== action.showOnlyFor.value) {
                  return null;
                }
              }
              
              return (
                <DropdownMenuItem 
                  onClick={() => handleDeleteRequest(row.id)}
                  className="text-destructive"
                >
                  {action.label}
                </DropdownMenuItem>
              );
            }
          })}
        </DropdownMenu>
      );
    },
  };
}
```

---

## Паттерн для других сущностей

### **Пример: Members List**

```typescript
// admin/components/MembersListWrapper.tsx
import { UniversalEntityListClient } from '@/shared/listsAndForms/universal-list';
import { membersSDK } from '@/shared/api/sdk';
import membersConfig from '@/shared/listsAndForms/configuration-setup/members.config.json';
import type { Member } from '@/shared/types/enterprises';

interface MembersListWrapperProps {
  enterpriseId: string;
}

export function MembersListWrapper({ enterpriseId }: MembersListWrapperProps) {
  // 1. Конфигурация
  const listSpec = membersConfig.list;
  
  // 2. onLoadData для members
  const onLoadData = async (params) => {
    const result = await membersSDK.getAll(enterpriseId);
    
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    const members = result.data?.data || [];
    
    // ... pagination/filtering ...
    
    return {
      data: members,
      pagination: { /* ... */ },
    };
  };
  
  // 3. onDelete для members
  const onDelete = async (userId: string) => {
    const result = await membersSDK.remove(enterpriseId, userId);
    
    if (result.error) {
      throw new Error(result.error.message);
    }
  };
  
  // 4. Routing
  const routing = {
    createUrlTemplate: `/enterprises/${enterpriseId}/members/invite`,
  };
  
  // 5. Universal компонент
  return (
    <UniversalEntityListClient<Member>
      projectId={`enterprise-${enterpriseId}`}
      serviceType="members"
      listSpec={listSpec}
      routing={routing}
      onLoadData={onLoadData}
      onDelete={onDelete}
    />
  );
}
```

```typescript
// admin/enterprises/[id]/members/page.tsx
import { MembersListWrapper } from '@/admin/components/MembersListWrapper';

export default function MembersPage({ params }: { params: { id: string } }) {
  return <MembersListWrapper enterpriseId={params.id} />;
}
```

---

## Преимущества архитектуры

✅ **Universal компоненты полностью переиспользуемы**
- Не зависят от конкретных SDK
- Не зависят от конкретных сущностей
- Работают с любыми данными через `onLoadData`

✅ **Page Wrappers изолируют логику**
- Каждая сущность имеет свою обертку
- SDK используется только в обертках
- Легко тестировать

✅ **Легко добавлять новые сущности**
- Создай config.json
- Создай Page Wrapper
- Используй Universal компонент

✅ **Actions универсальны**
- Все через `type: "link"` или `type: "delete"`
- Нет специальных типов
- Легко расширять

---

## Следующие шаги

1. ✅ Базовые типы созданы
2. 🔄 Создать Universal List компоненты
3. 🔄 Создать EnterprisesListWrapper
4. 🔄 Интегрировать в admin/app/page.tsx
5. ⏭️ Фаза 2: Forms

---

**Вопросы?** Или продолжаем с созданием Universal List компонентов? 🚀
