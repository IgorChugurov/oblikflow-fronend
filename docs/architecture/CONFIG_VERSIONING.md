# Версионирование конфигураций

## Обзор

Конфигурации предприятия версионируются и привязываются к периодам учета. Это обеспечивает неизменность исторических данных при изменении правил и настроек.

## Основные концепции

### 1. Конфигурация предприятия
```typescript
interface EnterpriseConfig {
  id: string;
  enterpriseId: string;
  version: number;              // Номер версии (1, 2, 3...)
  effectiveFrom: string;        // Дата вступления в силу
  effectiveTo?: string;         // Дата окончания действия

  // Настройки
  enabledModules: string[];     // ['bank', 'inventory', 'taxes']
  taxProfile: TaxProfile;
  inventorySettings: InventorySettings;
  bankSettings: BankSettings;
  fiscalYearStart: number;      // Месяц начала года (1-12)

  // Метаданные
  createdAt: string;
  createdBy: string;
  reason?: string;              // Причина изменения
}
```

### 2. Привязка к периодам
```typescript
interface Period {
  id: string;
  name: string;                 // "2026-01"
  startDate: string;           // "2026-01-01"
  endDate: string;             // "2026-01-31"
  status: PeriodStatus;

  configVersionId: string;      // Какая версия конфигурации действует
  closedAt?: string;
  closedBy?: string;
}
```

### 3. Версионирование
- **Каждое изменение** конфигурации создает новую версию
- **Исторические версии** сохраняются неизменными
- **Новые периоды** могут использовать новые версии
- **Закрытые периоды** зафиксированы на своей версии

## UX влияние

### 1. Ограничения операций

#### Операции в открытых периодах
```typescript
const canModifyDocument = (document: Document, period: Period): boolean => {
  return period.status === 'open';
};

// Если период закрыт → операция невозможна
if (!canModifyDocument(document, period)) {
  showError('Period is closed. Cannot modify historical data.');
}
```

#### Проведение документов
```typescript
const postDocument = async (documentId: string) => {
  const document = await api.getDocument(documentId);
  const period = await api.getPeriod(document.periodId);

  if (period.status === 'closed') {
    throw new Error('Cannot post document in closed period');
  }

  // Проведение использует configVersionId периода
  const config = await api.getConfigVersion(period.configVersionId);

  return api.postDocument(documentId, { configVersionId: config.id });
};
```

### 2. Изменение конфигурации

#### Создание новой версии
```typescript
const createNewConfigVersion = async (changes: Partial<EnterpriseConfig>) => {
  const currentConfig = await api.getCurrentConfig();

  const newConfig = {
    ...currentConfig,
    ...changes,
    version: currentConfig.version + 1,
    effectiveFrom: new Date().toISOString(),
    createdBy: currentUser.id,
    reason: 'User requested changes'
  };

  return api.createConfigVersion(newConfig);
};
```

#### Применение к будущим периодам
```typescript
const applyConfigToFuturePeriods = async (configVersionId: string) => {
  // Будущие открытые периоды могут использовать новую версию
  const futurePeriods = await api.getPeriods({
    status: 'open',
    startDate: { gte: today }
  });

  // Обновление configVersionId для будущих периодов
  await Promise.all(
    futurePeriods.map(period =>
      api.updatePeriod(period.id, { configVersionId })
    )
  );
};
```

### 3. UI индикация

#### Статус периода в интерфейсе
```typescript
const PeriodStatus = ({ period }: { period: Period }) => {
  const statusColors = {
    open: 'green',
    closing: 'yellow',
    closed: 'gray'
  };

  return (
    <Badge color={statusColors[period.status]}>
      {period.status === 'open' && 'Открыт для изменений'}
      {period.status === 'closing' && 'Закрывается...'}
      {period.status === 'closed' && 'Закрыт (неизменен)'}
    </Badge>
  );
};
```

#### Предупреждения о конфигурации
```typescript
const ConfigChangeWarning = ({ period, config }: { period: Period, config: EnterpriseConfig }) => {
  if (period.status === 'closed') {
    return (
      <Alert type="info">
        Этот период закрыт. Используется версия конфигурации #{config.version}
        от {formatDate(config.effectiveFrom)}
      </Alert>
    );
  }

  return null;
};
```

## Технические ограничения

### 1. Детерминизм расчетов

#### Фиксация алгоритмов
```typescript
interface PostingLog {
  id: string;
  commandId: string;
  configVersionId: string;
  algoVersion: string;          // Версия алгоритма проведения
  executedAt: string;

  effectManifest: EffectManifest;
}
```

#### Повторяемость
```typescript
const recalculatePosting = async (postingId: string) => {
  const posting = await api.getPosting(postingId);
  const config = await api.getConfigVersion(posting.configVersionId);

  // Используем тот же алгоритм и конфигурацию
  return recalculateWithConfig(posting.documentId, config, posting.algoVersion);
};
```

### 2. Аудит изменений

#### История конфигураций
```typescript
interface ConfigChangeLog {
  id: string;
  enterpriseId: string;
  configVersionId: string;
  changeType: 'created' | 'updated' | 'deleted';
  fieldName?: string;           // Какое поле изменилось
  oldValue?: any;
  newValue?: any;
  changedBy: string;
  changedAt: string;
  reason?: string;
}
```

#### Просмотр истории
```typescript
const ConfigHistory = () => {
  const { data: changes } = useConfigChanges();

  return (
    <Timeline>
      {changes.map(change => (
        <TimelineItem key={change.id}>
          <div>Version {change.version}</div>
          <div>{change.reason}</div>
          <div>Changed by {change.changedBy} at {formatDate(change.changedAt)}</div>
        </TimelineItem>
      ))}
    </Timeline>
  );
};
```

### 3. Валидация изменений

#### Проверка совместимости
```typescript
const validateConfigChange = (newConfig: EnterpriseConfig): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Проверка включения зависимых модулей
  if (newConfig.enabledModules.includes('taxes') &&
      !newConfig.enabledModules.includes('documents')) {
    errors.push({
      field: 'enabledModules',
      message: 'Taxes module requires Documents module'
    });
  }

  // Проверка корректности настроек
  if (newConfig.fiscalYearStart < 1 || newConfig.fiscalYearStart > 12) {
    errors.push({
      field: 'fiscalYearStart',
      message: 'Fiscal year start must be between 1-12'
    });
  }

  return errors;
};
```

## UI паттерны

### 1. Управление конфигурациями

#### Список версий
```typescript
const ConfigVersionsList = () => {
  const { data: versions } = useConfigVersions();

  return (
    <Table>
      <thead>
        <tr>
          <th>Version</th>
          <th>Effective From</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {versions.map(version => (
          <tr key={version.id}>
            <td>#{version.version}</td>
            <td>{formatDate(version.effectiveFrom)}</td>
            <td>
              <ConfigStatusBadge version={version} />
            </td>
            <td>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};
```

#### Создание новой версии
```typescript
const CreateConfigVersion = () => {
  const [changes, setChanges] = useState<Partial<EnterpriseConfig>>({});

  const handleSubmit = async () => {
    try {
      const newVersion = await createNewConfigVersion(changes);
      await applyConfigToFuturePeriods(newVersion.id);

      showSuccess('Configuration updated successfully');
      navigate('/settings/config');
    } catch (error) {
      showError('Failed to update configuration');
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <ModuleToggles
        modules={changes.enabledModules}
        onChange={modules => setChanges({ ...changes, enabledModules: modules })}
      />

      <TaxProfileEditor
        profile={changes.taxProfile}
        onChange={profile => setChanges({ ...changes, taxProfile: profile })}
      />

      <FormActions>
        <Button type="submit">Save New Version</Button>
      </FormActions>
    </Form>
  );
};
```

### 2. Работа с периодами

#### Календарь периодов
```typescript
const PeriodsCalendar = () => {
  const { data: periods } = usePeriods();

  return (
    <div className="periods-grid">
      {periods.map(period => (
        <PeriodCard key={period.id} period={period}>
          <PeriodStatus status={period.status} />
          <ConfigVersion versionId={period.configVersionId} />

          {period.status === 'open' && (
            <Button onClick={() => closePeriod(period.id)}>
              Close Period
            </Button>
          )}
        </PeriodCard>
      ))}
    </div>
  );
};
```

### 3. Предупреждения и валидации

#### Предупреждение о закрытом периоде
```typescript
const ClosedPeriodWarning = ({ period }: { period: Period }) => {
  if (period.status !== 'closed') return null;

  return (
    <Alert type="warning" icon="lock">
      <strong>Period {period.name} is closed</strong>
      <p>
        This period was closed on {formatDate(period.closedAt)} by {period.closedBy}.
        No modifications are allowed to maintain data integrity.
      </p>
      <p>
        Configuration version: #{period.configVersion}
      </p>
    </Alert>
  );
};
```

#### Валидация операций
```typescript
const validateOperation = (operation: Operation, context: OperationContext) => {
  const errors: ValidationError[] = [];

  // Проверка периода
  if (context.period.status === 'closed') {
    errors.push({
      code: 'PERIOD_CLOSED',
      message: 'Operation not allowed in closed period'
    });
  }

  // Проверка конфигурации
  if (!context.config.enabledModules.includes(operation.requiredModule)) {
    errors.push({
      code: 'MODULE_DISABLED',
      message: `${operation.requiredModule} module is not enabled`
    });
  }

  return errors;
};
```

## Производительность

### 1. Кеширование конфигураций
```typescript
const useConfigVersion = (versionId: string) => {
  return useQuery({
    queryKey: ['config-version', versionId],
    queryFn: () => api.getConfigVersion(versionId),
    staleTime: 30 * 60 * 1000, // 30 минут
  });
};
```

### 2. Предварительная загрузка
```typescript
// Предзагрузка конфигурации периода при открытии документа
const DocumentPage = ({ documentId }: { documentId: string }) => {
  const { data: document } = useDocument(documentId);

  // Предзагрузка конфигурации периода
  const { data: period } = usePeriod(document?.periodId);
  useConfigVersion(period?.configVersionId);

  // ...
};
```

## Тестирование

### Unit тесты
```typescript
describe('Config versioning', () => {
  it('should prevent operations in closed periods', () => {
    const closedPeriod = { status: 'closed' };
    const operation = { type: 'post_document' };

    const errors = validateOperation(operation, { period: closedPeriod });

    expect(errors).toContainEqual(
      expect.objectContaining({ code: 'PERIOD_CLOSED' })
    );
  });
});
```

### Integration тесты
```typescript
describe('Period closing', () => {
  it('should fix config version when closing period', async () => {
    // Создать период
    const period = await createPeriod('2026-01');

    // Изменить конфигурацию
    await updateConfig({ enabledModules: ['bank'] });

    // Закрыть период
    await closePeriod(period.id);

    // Проверить, что версия зафиксирована
    const closedPeriod = await getPeriod(period.id);
    expect(closedPeriod.configVersionId).toBeDefined();
  });
});
```

## Распространенные ошибки

### 1. Изменение конфигурации задним числом
```typescript
// ❌ Неправильно - попытка изменить прошлую версию
await updateConfigVersion(oldVersionId, newSettings);

// ✅ Правильно - создать новую версию
await createNewConfigVersion(newSettings);
```

### 2. Игнорирование статуса периода
```typescript
// ❌ Игнорирование проверки
await postDocument(documentId);

// ✅ Проверка перед операцией
if (period.status === 'closed') {
  throw new Error('Period is closed');
}
await postDocument(documentId);
```

### 3. Кеш конфигураций не инвалидируется
```typescript
// ❌ Кеш остается старым
await updateConfig(changes);

// ✅ Инвалидация кеша
await updateConfig(changes);
queryClient.invalidateQueries({ queryKey: ['config'] });
```