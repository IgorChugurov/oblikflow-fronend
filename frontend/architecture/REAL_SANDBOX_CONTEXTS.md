# Контексты REAL vs SANDBOX

## Обзор

OblikFlow поддерживает два контекста выполнения операций: **REAL** (рабочий) и **SANDBOX** (тестовый). Это позволяет тестировать изменения без влияния на реальные данные.

## Основные концепции

### REAL контекст
- **Рабочие данные** предприятия
- Влияют на финансовую отчетность
- Подвержены аудиту и compliance
- Все операции логируются для истории

### SANDBOX контекст
- **Тестовые данные** для экспериментов
- Не влияют на реальную отчетность
- Можно очищать и пересоздавать
- Используются для обучения и тестирования

## Структура данных

### Флаг контекста
```typescript
interface AccountingContext {
  type: 'REAL' | 'SANDBOX';
  description?: string;        // Для SANDBOX: "Testing new tax rules"
  createdAt: string;
  createdBy: string;
}
```

### Привязка ко всем сущностям
```typescript
interface LedgerEntry {
  // ... business fields
  accountingContext: 'REAL' | 'SANDBOX';
  // ... other fields
}
```

## UX дизайн

### 1. Переключение контекстов

#### UI переключатель
```typescript
const ContextSwitcher = () => {
  const { currentContext, setContext } = useAccountingContext();

  return (
    <div className="context-switcher">
      <Button
        variant={currentContext === 'REAL' ? 'primary' : 'outline'}
        onClick={() => setContext('REAL')}
      >
        🏢 REAL
      </Button>

      <Button
        variant={currentContext === 'SANDBOX' ? 'primary' : 'outline'}
        onClick={() => setContext('SANDBOX')}
      >
        🧪 SANDBOX
      </Button>

      {currentContext === 'SANDBOX' && (
        <Badge variant="warning">Test Mode</Badge>
      )}
    </div>
  );
};
```

#### Предупреждения при переключении
```typescript
const ContextWarning = ({ newContext }: { newContext: AccountingContext }) => {
  if (newContext === 'REAL') {
    return (
      <Alert type="warning">
        <strong>Switching to REAL context</strong>
        <p>All operations will affect actual financial data and reports.</p>
      </Alert>
    );
  }

  return (
    <Alert type="info">
      <strong>Switching to SANDBOX context</strong>
      <p>This is a test environment. Changes won't affect real data.</p>
    </Alert>
  );
};
```

### 2. Визуальные индикаторы

#### Цветовая схема
```css
/* REAL context - нормальные цвета */
.real-context {
  --primary-color: #007bff;
  --background: #ffffff;
}

/* SANDBOX context - отличительные цвета */
.sandbox-context {
  --primary-color: #28a745;
  --background: #f8fff8;
  --border: 2px solid #28a745;
}
```

#### Бейджи и лейблы
```typescript
const ContextBadge = ({ context }: { context: AccountingContext }) => {
  if (context === 'REAL') {
    return <Badge variant="default">Production</Badge>;
  }

  return (
    <Badge variant="success" icon="🧪">
      Test Environment
      {context.description && ` - ${context.description}`}
    </Badge>
  );
};
```

### 3. Ограничения интерфейса

#### Блокировка критичных операций в SANDBOX
```typescript
const CriticalActionButton = ({ action, context }: { action: Action, context: AccountingContext }) => {
  const isAllowed = context === 'REAL' ||
    !['close_period', 'final_audit'].includes(action);

  if (!isAllowed) {
    return (
      <Tooltip content="This action is not available in SANDBOX">
        <Button disabled>{action}</Button>
      </Tooltip>
    );
  }

  return <Button onClick={() => performAction(action)}>{action}</Button>;
};
```

## Технические ограничения

### 1. Разделение данных

#### API уровень
```typescript
// Все запросы включают контекст
const api = {
  getDocuments: (params: DocumentQuery) => {
    return fetch(`/api/v1/${enterpriseId}/documents`, {
      headers: {
        'X-Accounting-Context': currentContext
      },
      // ... params
    });
  }
};
```

#### База данных
```sql
-- RLS политика для разделения контекстов
CREATE POLICY ledger_context_isolation ON inventory_ledger
  USING (accounting_context = current_setting('app.accounting_context', TRUE)::VARCHAR);
```

### 2. Операции в разных контекстах

#### REAL операции
```typescript
const performRealOperation = async (operation: Operation) => {
  // Все проверки включены
  await validateBusinessRules(operation);
  await checkPermissions(operation);

  // Полное логирование
  await logOperation(operation);

  // Выполнение с полными эффектами
  return executeOperation(operation, 'REAL');
};
```

#### SANDBOX операции
```typescript
const performSandboxOperation = async (operation: Operation) => {
  // Упрощенные проверки
  await validateBasicRules(operation);

  // Минимальное логирование
  await logSandboxOperation(operation);

  // Выполнение с эффектами
  return executeOperation(operation, 'SANDBOX');
};
```

### 3. Синхронизация между контекстами

#### Копирование из REAL в SANDBOX
```typescript
const copyRealToSandbox = async (description: string) => {
  // Создание нового SANDBOX контекста
  const sandboxId = await createSandboxContext({
    description,
    basedOnReal: true
  });

  // Копирование master data
  await copyMasterData('REAL', sandboxId);

  // Копирование остатков на текущую дату
  await copyBalances('REAL', sandboxId, new Date());

  return sandboxId;
};
```

#### Применение изменений из SANDBOX в REAL
```typescript
const promoteSandboxChanges = async (sandboxId: string) => {
  // Валидация SANDBOX данных
  await validateSandboxData(sandboxId);

  // Создание миграционного плана
  const migrationPlan = await createMigrationPlan(sandboxId);

  // Применение с подтверждением
  await applyMigrationPlan(migrationPlan, {
    approvedBy: currentUser.id,
    reason: 'Promoting tested changes from SANDBOX'
  });
};
```

## UI паттерны

### 1. Дашборд с контекстами

#### Переключение представлений
```typescript
const ContextAwareDashboard = () => {
  const { context } = useAccountingContext();

  return (
    <div className={`dashboard ${context.toLowerCase()}`}>
      <ContextSwitcher />

      <div className="dashboard-content">
        {context === 'REAL' ? <RealDashboard /> : <SandboxDashboard />}
      </div>

      <ContextFooter context={context} />
    </div>
  );
};
```

#### Отличные метрики
```typescript
const DashboardMetrics = ({ context }: { context: AccountingContext }) => {
  const { data: metrics } = useDashboardMetrics(context);

  return (
    <div className="metrics-grid">
      {metrics.map(metric => (
        <MetricCard
          key={metric.key}
          title={metric.title}
          value={context === 'SANDBOX' ? `${metric.value} (test)` : metric.value}
          trend={metric.trend}
          context={context}
        />
      ))}
    </div>
  );
};
```

### 2. Формы с учетом контекста

#### Валидация форм
```typescript
const DocumentForm = ({ context }: { context: AccountingContext }) => {
  const [formData, setFormData] = useState<DocumentFormData>({});

  const validationRules = context === 'REAL'
    ? strictValidationRules    // Все проверки
    : relaxedValidationRules;  // Основные проверки

  const errors = validateForm(formData, validationRules);

  return (
    <Form onSubmit={handleSubmit} errors={errors}>
      {/* Form fields */}
      {context === 'SANDBOX' && (
        <Alert type="info">
          Test mode: Some validations are relaxed
        </Alert>
      )}
    </Form>
  );
};
```

### 3. Операции с подтверждением

#### Preview в разных контекстах
```typescript
const OperationPreview = ({ operation, context }: { operation: Operation, context: AccountingContext }) => {
  const { data: preview } = useOperationPreview(operation, context);

  return (
    <div className="operation-preview">
      <h3>Preview: {operation.name}</h3>

      {preview.effects.map(effect => (
        <EffectItem key={effect.id} effect={effect} />
      ))}

      {context === 'REAL' && (
        <Alert type="warning">
          This will permanently affect financial records
        </Alert>
      )}

      {context === 'SANDBOX' && (
        <Alert type="info">
          This is a test operation. No real data will be affected.
        </Alert>
      )}

      <div className="actions">
        <Button variant="secondary">Cancel</Button>
        <Button
          variant={context === 'REAL' ? 'danger' : 'primary'}
          onClick={() => executeOperation(operation, context)}
        >
          {context === 'REAL' ? 'Execute' : 'Test Execute'}
        </Button>
      </div>
    </div>
  );
};
```

## Управление SANDBOX

### Создание SANDBOX
```typescript
const CreateSandboxModal = () => {
  const [config, setConfig] = useState<SandboxConfig>({
    name: '',
    description: '',
    copyFromReal: false,
    includeHistoricalData: false
  });

  const handleCreate = async () => {
    const sandbox = await createSandbox({
      ...config,
      createdBy: currentUser.id
    });

    // Переключение в новый SANDBOX
    setAccountingContext(sandbox.id);
  };

  return (
    <Modal title="Create Test Environment">
      <Form onSubmit={handleCreate}>
        <Input
          label="Name"
          value={config.name}
          onChange={name => setConfig({ ...config, name })}
        />

        <Textarea
          label="Description"
          value={config.description}
          onChange={description => setConfig({ ...config, description })}
        />

        <Checkbox
          label="Copy data from REAL environment"
          checked={config.copyFromReal}
          onChange={copyFromReal => setConfig({ ...config, copyFromReal })}
        />

        {config.copyFromReal && (
          <Checkbox
            label="Include historical data (last 3 months)"
            checked={config.includeHistoricalData}
            onChange={includeHistoricalData => setConfig({ ...config, includeHistoricalData })}
          />
        )}
      </Form>
    </Modal>
  );
};
```

### Очистка SANDBOX
```typescript
const ClearSandboxModal = ({ sandbox }: { sandbox: Sandbox }) => {
  const handleClear = async () => {
    await clearSandboxData(sandbox.id);

    showSuccess('Sandbox cleared successfully');
  };

  return (
    <Modal title="Clear Test Environment">
      <Alert type="warning">
        This will permanently delete all data in {sandbox.name}.
        This action cannot be undone.
      </Alert>

      <div className="actions">
        <Button variant="secondary">Cancel</Button>
        <Button variant="danger" onClick={handleClear}>
          Clear All Data
        </Button>
      </div>
    </Modal>
  );
};
```

## Аудит и безопасность

### Логирование операций
```typescript
interface OperationLog {
  id: string;
  operationId: string;
  context: AccountingContext;
  userId: string;
  timestamp: string;
  operationType: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}
```

### Ограничения доступа
```typescript
const canAccessContext = (user: User, context: AccountingContext): boolean => {
  // REAL - только авторизованные пользователи
  if (context === 'REAL') {
    return user.roles.includes('accountant') || user.roles.includes('owner');
  }

  // SANDBOX - может быть доступен всем для обучения
  return true;
};
```

## Производительность

### Оптимизации
- **Раздельные индексы** для REAL и SANDBOX
- **Архивация** старых SANDBOX данных
- **Кеширование** с учетом контекста
- **Background cleanup** SANDBOX данных

### Мониторинг
```typescript
const SandboxMetrics = () => {
  const { data: metrics } = useSandboxMetrics();

  return (
    <div className="sandbox-metrics">
      <MetricCard
        title="Active Sandboxes"
        value={metrics.activeCount}
      />
      <MetricCard
        title="Storage Used"
        value={`${metrics.storageUsed} MB`}
      />
      <MetricCard
        title="Old Sandboxes (>30 days)"
        value={metrics.oldCount}
        status={metrics.oldCount > 0 ? 'warning' : 'good'}
      />
    </div>
  );
};
```

## Тестирование

### Unit тесты
```typescript
describe('Context management', () => {
  it('should isolate REAL and SANDBOX data', async () => {
    // Создание документа в REAL
    const realDoc = await createDocument('REAL', testData);

    // Создание документа в SANDBOX
    const sandboxDoc = await createDocument('SANDBOX', testData);

    // Проверка изоляции
    const realDocs = await getDocuments('REAL');
    const sandboxDocs = await getDocuments('SANDBOX');

    expect(realDocs).toContain(realDoc);
    expect(realDocs).not.toContain(sandboxDoc);

    expect(sandboxDocs).toContain(sandboxDoc);
    expect(sandboxDocs).not.toContain(realDoc);
  });
});
```

### E2E тесты
```typescript
describe('Context switching', () => {
  it('should maintain separate states', () => {
    // Переключение в SANDBOX
    cy.switchContext('SANDBOX');

    // Создание тестовых данных
    cy.createDocument({ amount: 100 });

    // Проверка в SANDBOX
    cy.get('[data-testid="documents-count"]').should('contain', '1');

    // Переключение в REAL
    cy.switchContext('REAL');

    // Проверка, что данные не видны
    cy.get('[data-testid="documents-count"]').should('contain', '0');
  });
});
```

## Распространенные проблемы

### 1. Пересечение контекстов
```typescript
// ❌ Забыт контекст в запросе
const getDocuments = () => api.get('/documents'); // Может вернуть смешанные данные

// ✅ Явное указание контекста
const getDocuments = (context: AccountingContext) =>
  api.get('/documents', { context });
```

### 2. Операции без проверки контекста
```typescript
// ❌ Операция работает в обоих контекстах
const closePeriod = (periodId: string) => api.post(`/periods/${periodId}/close`);

// ✅ Проверка контекста
const closePeriod = (periodId: string, context: AccountingContext) => {
  if (context === 'SANDBOX') {
    throw new Error('Cannot close periods in SANDBOX');
  }
  return api.post(`/periods/${periodId}/close`);
};
```

### 3. Утечка SANDBOX данных в отчеты
```typescript
// ❌ Смешанные данные в отчете
const getBalanceReport = () => api.get('/reports/balance');

// ✅ Фильтрация по контексту
const getBalanceReport = (context: AccountingContext) =>
  api.get('/reports/balance', { context });
```