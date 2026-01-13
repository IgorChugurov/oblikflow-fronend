# Мультиарендность (Multi-tenancy)

## Обзор

OblikFlow — мультиарендная система, где каждый клиент (предприятие) имеет полностью изолированные данные. Это критически влияет на UX и архитектуру фронтенда.

## Основные принципы

### 1. Полная изоляция данных
- **Все данные** привязаны к `enterpriseId`
- **Нет пересечений** между предприятиями
- **RLS (Row Level Security)** на уровне БД

### 2. Множественные предприятия на пользователя
```typescript
interface User {
  id: string;
  // ... другие поля
  enterprises: EnterpriseAccess[];
}

interface EnterpriseAccess {
  enterpriseId: string;
  enterpriseName: string;
  role: UserRole;  // owner, admin, accountant, warehouse, viewer
  joinedAt: string;
}
```

### 3. Контекст предприятия
- **Всегда** должен быть выбран активный контекст
- **Все API запросы** включают `enterpriseId`
- **UI адаптируется** под роль пользователя

## UX требования

### 1. Переключение предприятий

#### Селектор предприятия
```typescript
// В шапке приложения
<EnterpriseSelector
  currentEnterprise={currentEnterprise}
  availableEnterprises={user.enterprises}
  onChange={handleEnterpriseChange}
/>
```

#### Процесс переключения
1. **Выбор** предприятия из списка
2. **Валидация прав** доступа
3. **Очистка кеша** предыдущего предприятия
4. **Загрузка данных** нового предприятия
5. **Обновление UI** (меню, настройки)

### 2. Изоляция данных

#### API уровень
```typescript
// Все запросы автоматически включают enterpriseId
const apiClient = {
  get: (endpoint: string) => {
    // Автоматически добавляет ?enterprise_id=123
    return fetch(`/api/v1/${enterpriseId}${endpoint}`);
  }
};
```

#### UI уровень
```typescript
// Компоненты должны учитывать текущий контекст
const DocumentList = () => {
  const { enterpriseId } = useEnterpriseContext();

  // Все запросы фильтруются по enterpriseId
  const { data: documents } = useDocuments(enterpriseId);

  return (
    <div>
      {/* Показываем только документы текущего предприятия */}
      {documents.map(doc => <DocumentCard key={doc.id} {...doc} />)}
    </div>
  );
};
```

### 3. Роли и права

#### Система ролей
```typescript
type UserRole =
  | 'owner'        // Полный доступ
  | 'admin'        // Управление пользователями
  | 'accountant'   // Бухгалтерский учет
  | 'warehouse'    // Склад
  | 'viewer';      // Просмотр
```

#### UI адаптация под роли
```typescript
const usePermissions = () => {
  const { role } = useEnterpriseContext();

  return {
    canCreateDocuments: ['owner', 'admin', 'accountant'].includes(role),
    canManageUsers: ['owner', 'admin'].includes(role),
    canClosePeriod: ['owner', 'accountant'].includes(role),
    canManageWarehouse: ['owner', 'admin', 'warehouse'].includes(role),
  };
};
```

#### Скрытие недоступных функций
```typescript
const DocumentActions = () => {
  const permissions = usePermissions();

  return (
    <div>
      {permissions.canCreateDocuments && (
        <Button>Create Document</Button>
      )}
      {permissions.canClosePeriod && (
        <Button>Close Period</Button>
      )}
    </div>
  );
};
```

## Технические ограничения

### 1. Контекст предприятия

#### React Context
```typescript
const EnterpriseContext = createContext<EnterpriseContextType | null>(null);

export const EnterpriseProvider = ({ children }: { children: ReactNode }) => {
  const [currentEnterprise, setCurrentEnterprise] = useState<Enterprise | null>(null);

  // Загрузка доступных предприятий при логине
  useEffect(() => {
    const loadEnterprises = async () => {
      const enterprises = await api.getUserEnterprises();
      setCurrentEnterprise(enterprises[0]); // Первый по умолчанию
    };
    loadEnterprises();
  }, []);

  return (
    <EnterpriseContext.Provider value={{ currentEnterprise, setCurrentEnterprise }}>
      {children}
    </EnterpriseContext.Provider>
  );
};
```

#### Переключение контекста
```typescript
const switchEnterprise = async (newEnterpriseId: string) => {
  // 1. Валидация доступа
  const hasAccess = user.enterprises.some(e => e.enterpriseId === newEnterpriseId);
  if (!hasAccess) throw new Error('Access denied');

  // 2. Очистка кеша
  queryClient.clear();

  // 3. Установка нового контекста
  setCurrentEnterprise(enterprises.find(e => e.id === newEnterpriseId));

  // 4. Перенаправление на дашборд
  navigate('/dashboard');
};
```

### 2. API дизайн

#### Автоматическая подстановка enterpriseId
```typescript
// API клиент с автоматической подстановкой
class ApiClient {
  private enterpriseId: string;

  constructor(enterpriseId: string) {
    this.enterpriseId = enterpriseId;
  }

  async get(endpoint: string) {
    return fetch(`/api/v1/${this.enterpriseId}${endpoint}`);
  }

  async post(endpoint: string, data: any) {
    return fetch(`/api/v1/${this.enterpriseId}${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}
```

#### Обновление контекста
```typescript
// При переключении предприятия
const apiClient = new ApiClient(newEnterpriseId);
```

### 3. Кеширование

#### React Query с ключами по предприятию
```typescript
// Ключи запросов включают enterpriseId
const useDocuments = (enterpriseId: string) => {
  return useQuery({
    queryKey: ['documents', enterpriseId],
    queryFn: () => api.getDocuments(enterpriseId),
  });
};
```

#### Очистка кеша при переключении
```typescript
const switchEnterprise = (newEnterpriseId: string) => {
  // Очистка всех запросов
  queryClient.invalidateQueries();

  // Или избирательная очистка
  queryClient.removeQueries({ queryKey: ['documents', oldEnterpriseId] });
};
```

### 4. Локальное хранилище

#### Сохранение выбранного предприятия
```typescript
const saveCurrentEnterprise = (enterpriseId: string) => {
  localStorage.setItem('currentEnterpriseId', enterpriseId);
};

const loadCurrentEnterprise = (): string | null => {
  return localStorage.getItem('currentEnterpriseId');
};
```

#### Восстановление после перезагрузки
```typescript
useEffect(() => {
  const savedEnterpriseId = loadCurrentEnterprise();
  if (savedEnterpriseId && enterprises.some(e => e.id === savedEnterpriseId)) {
    setCurrentEnterprise(enterprises.find(e => e.id === savedEnterpriseId));
  }
}, [enterprises]);
```

## Безопасность

### 1. Валидация доступа
```typescript
const validateEnterpriseAccess = (userId: string, enterpriseId: string): boolean => {
  // Проверка в базе данных
  return db.enterpriseMemberships.exists({
    userId,
    enterpriseId,
    status: 'active'
  });
};
```

### 2. Защита от перехвата
- **JWT токены** с enterpriseId
- **API валидация** enterpriseId на каждом запросе
- **RLS policies** на уровне БД

### 3. Аудит действий
```typescript
interface AuditLog {
  userId: string;
  enterpriseId: string;
  action: string;      // 'document.created', 'period.closed'
  resourceId: string;  // ID измененного ресурса
  timestamp: string;
  details: Record<string, any>;
}
```

## UX паттерны

### 1. Индикатор контекста
```typescript
// В шапке всегда показывать текущее предприятие
const Header = () => (
  <header>
    <EnterpriseSelector />
    <UserMenu />
  </header>
);
```

### 2. Предупреждения о контексте
```typescript
// При действиях, влияющих на все предприятие
const ConfirmAction = ({ action, enterprise }) => (
  <Modal>
    <h3>Confirm {action}</h3>
    <p>This will affect all users in <strong>{enterprise.name}</strong></p>
    <p>Enterprise: {enterprise.id}</p>
  </Modal>
);
```

### 3. Ограничения по ролям
```typescript
// UI компоненты проверяют права
const RestrictedButton = ({ permission, children, ...props }) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) return null;

  return <Button {...props}>{children}</Button>;
};
```

## Распространенные ошибки

### 1. Забыт enterpriseId в запросах
```typescript
// ❌ Неправильно
const getDocuments = () => api.get('/documents');

// ✅ Правильно
const getDocuments = (enterpriseId: string) =>
  api.get(`/v1/${enterpriseId}/documents`);
```

### 2. Кеш не очищается при переключении
```typescript
// ❌ Кеш остается
const switchEnterprise = (newId) => setEnterprise(newId);

// ✅ Очистка кеша
const switchEnterprise = (newId) => {
  queryClient.clear();
  setEnterprise(newId);
};
```

### 3. Роли не проверяются на UI
```typescript
// ❌ Доступны все кнопки
<Button>Create Document</Button>

// ✅ Проверка прав
{canCreateDocuments && <Button>Create Document</Button>}
```

## Тестирование

### Unit тесты
```typescript
describe('Enterprise switching', () => {
  it('should clear cache when switching enterprises', () => {
    const { result } = renderHook(() => useEnterprise(), {
      wrapper: EnterpriseProvider
    });

    act(() => result.current.switchEnterprise('new-id'));

    expect(queryClient.clear).toHaveBeenCalled();
  });
});
```

### E2E тесты
```typescript
describe('Multi-tenancy', () => {
  it('should isolate data between enterprises', () => {
    // Создать пользователя с двумя предприятиями
    // Проверить, что документы одного не видны в другом
  });
});
```

## Производительность

### 1. Lazy loading предприятий
```typescript
const useEnterprises = () => {
  return useQuery({
    queryKey: ['user-enterprises'],
    queryFn: api.getUserEnterprises,
    staleTime: 5 * 60 * 1000, // 5 минут
  });
};
```

### 2. Предварительная загрузка
```typescript
// Предзагрузка данных при переключении
const preloadEnterpriseData = (enterpriseId: string) => {
  queryClient.prefetchQuery(['documents', enterpriseId], () =>
    api.getDocuments(enterpriseId)
  );
};
```