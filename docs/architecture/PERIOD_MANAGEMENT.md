# Управление периодами

## Обзор

Периоды — это фундаментальные единицы учета в OblikFlow. Они определяют временные интервалы, в которых ведется учет, и обеспечивают неизменность исторических данных.

## Структура периодов

### Базовые свойства
```typescript
interface Period {
  id: string;
  enterpriseId: string;
  name: string;                 // "2026-01", "Q1-2026"
  startDate: string;           // "2026-01-01T00:00:00Z"
  endDate: string;             // "2026-01-31T23:59:59Z"
  status: PeriodStatus;
  configVersionId: string;     // Фиксированная версия конфигурации

  // Метаданные
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  closedBy?: string;
}
```

### Статусы периодов
```typescript
type PeriodStatus =
  | 'open'         // Открыт для операций
  | 'closing'      // В процессе закрытия
  | 'closed';      // Закрыт (неизменен)
```

### Типы периодов
- **Месячные**: 2026-01, 2026-02, etc.
- **Квартальные**: Q1-2026, Q2-2026, etc.
- **Годовые**: 2026

## Жизненный цикл периода

### 1. Создание периода
```typescript
const createPeriod = async (periodData: CreatePeriodData) => {
  // Валидация
  validatePeriodDates(periodData.startDate, periodData.endDate);
  validateNoOverlappingPeriods(periodData);

  // Создание
  const period = await api.createPeriod({
    ...periodData,
    status: 'open',
    configVersionId: getCurrentConfigVersionId()
  });

  return period;
};
```

### 2. Работа в открытом периоде
- Создание документов
- Проведение операций
- Редактирование данных
- Импорт выписок

### 3. Закрытие периода
```typescript
const closePeriod = async (periodId: string) => {
  // 1. Проверка условий закрытия
  await validatePeriodCanBeClosed(periodId);

  // 2. Финализация всех операций
  await finalizePendingOperations(periodId);

  // 3. Создание снимка (snapshot)
  await createPeriodSnapshot(periodId);

  // 4. Фиксация статуса
  await api.updatePeriod(periodId, {
    status: 'closed',
    closedAt: new Date().toISOString(),
    closedBy: currentUser.id
  });
};
```

### 4. Работа в закрытом периоде
- Только чтение
- Просмотр исторических данных
- Формирование отчетов
- Аудит

## UX ограничения

### 1. Операции в открытых периодах

#### Доступные действия
```typescript
const canPerformAction = (action: Action, period: Period): boolean => {
  if (period.status !== 'open') return false;

  switch (action) {
    case 'create_document':
    case 'post_document':
    case 'import_bank_statement':
      return true;

    case 'close_period':
      return hasPermission('period.close');

    default:
      return false;
  }
};
```

#### UI индикация
```typescript
const ActionButton = ({ action, period }: { action: Action, period: Period }) => {
  const canPerform = canPerformAction(action, period);

  if (!canPerform) {
    return (
      <Tooltip content={`Cannot ${action} in ${period.status} period`}>
        <Button disabled>{action}</Button>
      </Tooltip>
    );
  }

  return <Button onClick={() => performAction(action)}>{action}</Button>;
};
```

### 2. Операции в закрытых периодах

#### Блокировка изменений
```typescript
const DocumentActions = ({ document, period }: { document: Document, period: Period }) => {
  if (period.status === 'closed') {
    return (
      <Alert type="info">
        This document belongs to closed period {period.name}.
        No modifications allowed.
      </Alert>
    );
  }

  return (
    <div>
      <Button>Edit</Button>
      <Button>Post</Button>
      <Button>Delete</Button>
    </div>
  );
};
```

#### Корректировки в закрытых периодах
```typescript
const createAdjustment = async (closedPeriodId: string, adjustmentData: AdjustmentData) => {
  // Создание корректировочного документа в следующем открытом периоде
  const nextPeriod = await getNextOpenPeriod(closedPeriodId);

  const adjustmentDoc = {
    type: 'adjustment',
    date: nextPeriod.startDate,
    description: `Adjustment for closed period ${closedPeriodId}`,
    // ... adjustment data
  };

  return createDocument(nextPeriod.id, adjustmentDoc);
};
```

## UI компоненты

### 1. Календарь периодов
```typescript
const PeriodsCalendar = () => {
  const { data: periods } = usePeriods();

  return (
    <div className="periods-timeline">
      {periods.map(period => (
        <PeriodCard key={period.id} period={period}>
          <PeriodStatusBadge status={period.status} />
          <PeriodDateRange start={period.startDate} end={period.endDate} />

          {period.status === 'open' && (
            <PeriodActions period={period} />
          )}

          {period.status === 'closed' && (
            <PeriodClosedInfo period={period} />
          )}
        </PeriodCard>
      ))}
    </div>
  );
};
```

### 2. Селектор периода
```typescript
const PeriodSelector = ({ selectedPeriodId, onChange }: PeriodSelectorProps) => {
  const { data: periods } = usePeriods();

  return (
    <Select value={selectedPeriodId} onChange={onChange}>
      {periods.map(period => (
        <Option key={period.id} value={period.id}>
          <div className="period-option">
            <span>{period.name}</span>
            <PeriodStatusBadge status={period.status} size="small" />
          </div>
        </Option>
      ))}
    </Select>
  );
};
```

### 3. Дашборд периода
```typescript
const PeriodDashboard = ({ periodId }: { periodId: string }) => {
  const { data: period } = usePeriod(periodId);
  const { data: stats } = usePeriodStats(periodId);

  if (!period) return <Loading />;

  return (
    <div className="period-dashboard">
      <PeriodHeader period={period} />

      <div className="stats-grid">
        <StatCard
          title="Documents"
          value={stats.documentsCount}
          trend={stats.documentsTrend}
        />
        <StatCard
          title="Transactions"
          value={stats.transactionsCount}
          trend={stats.transactionsTrend}
        />
        <StatCard
          title="Balance"
          value={formatMoney(stats.balance)}
        />
      </div>

      {period.status === 'open' && (
        <QuickActions period={period} />
      )}

      <RecentActivity periodId={periodId} />
    </div>
  );
};
```

## Правила закрытия периода

### Обязательные проверки
```typescript
const validatePeriodCanBeClosed = async (periodId: string): Promise<ValidationError[]> => {
  const errors: ValidationError[] = [];

  // 1. Все документы проведены или отменены
  const draftDocuments = await getDocumentsByStatus(periodId, 'draft');
  if (draftDocuments.length > 0) {
    errors.push({
      code: 'DRAFT_DOCUMENTS_EXIST',
      message: `${draftDocuments.length} draft documents must be posted or cancelled`
    });
  }

  // 2. Все банковские транзакции распределены
  const unallocatedTransactions = await getUnallocatedTransactions(periodId);
  if (unallocatedTransactions.length > 0) {
    errors.push({
      code: 'UNALLOCATED_TRANSACTIONS',
      message: `${unallocatedTransactions.length} bank transactions not allocated`
    });
  }

  // 3. Баланс по всем счетам сходится
  const balanceErrors = await validatePeriodBalances(periodId);
  errors.push(...balanceErrors);

  // 4. Все инвентаризации завершены
  const pendingInventories = await getPendingInventorySessions(periodId);
  if (pendingInventories.length > 0) {
    errors.push({
      code: 'PENDING_INVENTORIES',
      message: `${pendingInventories.length} inventory sessions not completed`
    });
  }

  return errors;
};
```

### UI чек-листа закрытия
```typescript
const PeriodClosingChecklist = ({ period }: { period: Period }) => {
  const { data: checks } = usePeriodClosingChecks(period.id);

  return (
    <div className="closing-checklist">
      <h3>Period Closing Checklist</h3>

      {checks.map(check => (
        <ChecklistItem key={check.id} check={check}>
          <CheckStatus status={check.status} />
          <span>{check.description}</span>
          {check.errors && (
            <ErrorDetails errors={check.errors} />
          )}
        </ChecklistItem>
      ))}

      <ClosingActions
        canClose={checks.every(c => c.status === 'passed')}
        onClose={() => closePeriod(period.id)}
      />
    </div>
  );
};
```

## Работа с несколькими периодами

### Навигация между периодами
```typescript
const PeriodNavigation = ({ currentPeriodId }: { currentPeriodId: string }) => {
  const { data: periods } = usePeriods();

  const currentIndex = periods.findIndex(p => p.id === currentPeriodId);
  const prevPeriod = periods[currentIndex - 1];
  const nextPeriod = periods[currentIndex + 1];

  return (
    <div className="period-navigation">
      {prevPeriod && (
        <Button onClick={() => navigateToPeriod(prevPeriod.id)}>
          ← {prevPeriod.name}
        </Button>
      )}

      <span className="current-period">{periods[currentIndex]?.name}</span>

      {nextPeriod && (
        <Button onClick={() => navigateToPeriod(nextPeriod.id)}>
          {nextPeriod.name} →
        </Button>
      )}
    </div>
  );
};
```

### Сравнение периодов
```typescript
const PeriodComparison = ({ periodIds }: { periodIds: string[] }) => {
  const { data: comparison } = usePeriodComparison(periodIds);

  return (
    <div className="period-comparison">
      <ComparisonTable>
        <thead>
          <tr>
            <th>Metric</th>
            {periodIds.map(id => (
              <th key={id}>{getPeriodName(id)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparison.metrics.map(metric => (
            <tr key={metric.key}>
              <td>{metric.label}</td>
              {periodIds.map(periodId => (
                <td key={periodId}>
                  {formatValue(metric.values[periodId], metric.type)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </ComparisonTable>
    </div>
  );
};
```

## Аудит и compliance

### Аудитный след
```typescript
interface PeriodAuditLog {
  id: string;
  periodId: string;
  action: PeriodAction;
  userId: string;
  timestamp: string;
  details: Record<string, any>;
}

type PeriodAction =
  | 'created'
  | 'opened'
  | 'closed'
  | 'reopened'  // В исключительных случаях
  | 'snapshot_created'
  | 'adjustment_made';
```

### Неизменность закрытых периодов
```typescript
const enforcePeriodImmutability = () => {
  // DB Triggers предотвращают изменения в closed периодах
  // UI блокирует все действия редактирования
  // API возвращает 403 для операций изменения
};

// Пример DB trigger
CREATE OR REPLACE FUNCTION fn_prevent_closed_period_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot modify closed period %', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Производительность

### Оптимизации
- **Индексы** по period_id во всех ledger таблицах
- **Partitioning** таблиц по периодам
- **Snapshots** для быстрого доступа к историческим данным
- **Caching** периодов и их статусов

### Предварительная загрузка
```typescript
// Предзагрузка данных периода при навигации
const usePeriodData = (periodId: string) => {
  return useQueries({
    queries: [
      {
        queryKey: ['period', periodId],
        queryFn: () => api.getPeriod(periodId),
      },
      {
        queryKey: ['period-stats', periodId],
        queryFn: () => api.getPeriodStats(periodId),
      },
      {
        queryKey: ['period-documents', periodId],
        queryFn: () => api.getDocuments({ periodId }),
        enabled: !!periodId,
      },
    ],
  });
};
```

## Тестирование

### Проверка ограничений
```typescript
describe('Period management', () => {
  it('should prevent document posting in closed period', async () => {
    const closedPeriod = await createClosedPeriod();
    const document = await createDocument(closedPeriod.id);

    await expect(postDocument(document.id)).rejects.toThrow('Period is closed');
  });

  it('should validate period closing requirements', async () => {
    const period = await createPeriodWithDraftDocuments();

    const errors = await validatePeriodCanBeClosed(period.id);

    expect(errors).toContainEqual(
      expect.objectContaining({ code: 'DRAFT_DOCUMENTS_EXIST' })
    );
  });
});
```

## Распространенные проблемы

### 1. Попытка изменения в закрытом периоде
```typescript
// ❌ Попытка редактирования
const updateClosedPeriodDocument = async (documentId: string) => {
  await api.updateDocument(documentId, { amount: 100 }); // Ошибка!
};

// ✅ Создание корректировки
const createAdjustmentForClosedPeriod = async (documentId: string) => {
  const adjustment = await createAdjustment(documentId, { amount: -50 });
  await postDocument(adjustment.id);
};
```

### 2. Игнорирование статуса периода в UI
```typescript
// ❌ Всегда показывать кнопки редактирования
<Button>Edit Document</Button>

// ✅ Проверка статуса периода
{period.status === 'open' && <Button>Edit Document</Button>}
```

### 3. Долгое закрытие периода
```typescript
// Решение: асинхронное закрытие с прогрессом
const closePeriodAsync = async (periodId: string) => {
  const job = await api.startPeriodClosing(periodId);

  // Показывать прогресс
  return <PeriodClosingProgress jobId={job.id} />;
};
```