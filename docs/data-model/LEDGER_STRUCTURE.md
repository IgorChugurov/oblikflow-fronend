# Структура бухгалтерских регистров

## Обзор

OblikFlow использует append-only ledger подход для хранения всех учетных данных. Все изменения фиксируются как новые записи, старые данные никогда не изменяются.

## Типы регистров

### 1. Inventory Ledger (Складской регистр)

**Назначение:** Отслеживание движения товаров по точкам учета.

```typescript
interface InventoryLedgerEntry {
  id: string;
  enterpriseId: string;
  postingId: string;                   // Ссылка на проведение

  // Бизнес-данные
  documentId: string;                  // Исходный документ
  productId: string;                   // Товар
  inventoryPointId: string;            // Точка учета
  branchId: string;                    // Филиал

  // Движения
  deltaQty: number;                    // Изменение количества (+входящие, -исходящие)
  unit: string;                        // Единица измерения

  // Финансы
  unitCost?: MoneyAmount;              // Себестоимость за единицу
  totalCost?: MoneyAmount;             // Общая стоимость движения

  // Контекст
  docDate: string;                     // Дата документа
  periodId: string;                    // Период учета
  configVersionId: string;             // Версия конфигурации

  // Метаданные
  accountingContext: 'REAL' | 'SANDBOX';
  createdAt: string;

  // Корректировки
  reversalOfId?: string;               // Если это сторно, ссылка на оригинал
}
```

### 2. GL Ledger (Главная книга)

**Назначение:** Двойная запись бухгалтерского учета.

```typescript
interface GlLedgerEntry {
  id: string;
  enterpriseId: string;
  postingId: string;                   // Ссылка на проведение

  // Бизнес-данные
  documentId: string;                  // Исходный документ
  branchId: string;                    // Филиал

  // Проводка
  accountId: string;                   // Счет учета
  debitAmount?: MoneyAmount;           // Дебет
  creditAmount?: MoneyAmount;          // Кредит

  // Аналитика
  counterpartyId?: string;             // Контрагент
  productId?: string;                  // Товар
  projectId?: string;                  // Проект
  departmentId?: string;               // Подразделение

  // Контекст
  docDate: string;                     // Дата документа
  periodId: string;                    // Период учета
  configVersionId: string;             // Версия конфигурации

  // Метаданные
  accountingContext: 'REAL' | 'SANDBOX';
  createdAt: string;

  // Корректировки
  reversalOfId?: string;               // Если это сторно
}
```

### 3. Tax Ledger (Налоговый регистр)

**Назначение:** Регистрация налоговых событий и обязательств.

```typescript
interface TaxLedgerEntry {
  id: string;
  enterpriseId: string;
  postingId: string;                   // Ссылка на проведение

  // Налоговое событие
  taxEventType: TaxEventType;          // Тип события
  taxCode: string;                     // Код налога (VAT, INCOME_TAX)
  taxPeriod: string;                   // Налоговый период

  // Суммы
  taxableAmount: MoneyAmount;          // Налоговая база
  taxAmount: MoneyAmount;              // Сумма налога
  taxRate: number;                     // Ставка налога (%)

  // Стороны
  taxpayerId: string;                  // Налогоплательщик (предприятие)
  counterpartyId?: string;             // Контрагент (если применимо)

  // Контекст
  docDate: string;                     // Дата документа
  periodId: string;                    // Период учета
  configVersionId: string;             // Версия конфигурации

  // Метаданные
  accountingContext: 'REAL' | 'SANDBOX';
  createdAt: string;
}
```

### 4. Payroll Ledger (Зарплатный регистр)

**Назначение:** Учет начислений и выплат сотрудникам.

```typescript
interface PayrollLedgerEntry {
  id: string;
  enterpriseId: string;
  postingId: string;                   // Ссылка на проведение

  // Сотрудник
  employeeId: string;                  // Сотрудник
  payrollPeriod: string;               // Период начисления (месяц)

  // Начисления
  grossAmount: MoneyAmount;            // Начислено до вычетов
  taxAmount: MoneyAmount;              // Налоги и вычеты
  netAmount: MoneyAmount;              // К выплате

  // Детализация
  earnings: PayrollComponent[];        // Начисления
  deductions: PayrollComponent[];      // Вычеты

  // Контекст
  docDate: string;                     // Дата начисления
  periodId: string;                    // Период учета
  configVersionId: string;             // Версия конфигурации

  // Метаданные
  accountingContext: 'REAL' | 'SANDBOX';
  createdAt: string;
}
```

## Общие поля регистров

### Аудит и трассировка
```typescript
interface BaseLedgerEntry {
  // Ссылки для аудита
  postingId: string;                   // Ссылка на проведение
  documentId: string;                  // Исходный документ

  // Версионирование
  configVersionId: string;             // Конфигурация на момент проведения

  // Контекст
  accountingContext: 'REAL' | 'SANDBOX';

  // Корректировки
  reversalOfId?: string;               // Ссылка на оригинал при сторно

  // Метаданные
  createdAt: string;
}
```

### Правила append-only
- **Записи никогда не изменяются** после создания
- **Корректировки** через новые записи со ссылкой `reversalOfId`
- **Полная история** всех изменений сохраняется

## Posting Log (Журнал проведений)

### Описание
Центральный журнал всех учетных проведений с полным аудитом.

```typescript
interface PostingLog {
  id: string;
  enterpriseId: string;
  commandId: string;                   // Ссылка на команду проведения

  // Исполнение
  executedAt: string;                  // Точное время выполнения
  algoVersion: string;                 // Версия алгоритма проведения

  // Конфигурация
  configVersionId: string;             // Версия конфигурации

  // Результат
  effectManifest: EffectManifest;      // Полное описание эффектов

  // Статус
  status: 'success' | 'failed';
  errorMessage?: string;
}
```

### Effect Manifest
```typescript
interface EffectManifest {
  summary: {
    inventoryMovements: number;
    glEntries: number;
    taxEvents: number;
    payrollEntries: number;
  };

  details: {
    inventory: string[];               // IDs созданных inventory записей
    gl: string[];                      // IDs созданных GL записей
    tax: string[];                     // IDs созданных tax записей
    payroll: string[];                 // IDs созданных payroll записей
  };
}
```

## Запросы остатков

### Inventory Balance (Остатки товаров)
```typescript
interface InventoryBalance {
  productId: string;
  inventoryPointId: string;

  // Остатки
  available: number;                   // Доступно для продажи/отгрузки
  reserved: number;                    // В резерве
  onHand: number;                      // Фактически на складе

  // Финансы
  avgCost?: MoneyAmount;               // Средняя себестоимость
  totalValue?: MoneyAmount;            // Общая стоимость

  unit: string;
  lastUpdated: string;
}
```

**Расчет остатков:**
```sql
-- Текущий остаток товара по точке учета
SELECT
  product_id,
  inventory_point_id,
  SUM(delta_qty) as on_hand,
  SUM(CASE WHEN delta_qty > 0 THEN delta_qty ELSE 0 END) as incoming,
  SUM(CASE WHEN delta_qty < 0 THEN -delta_qty ELSE 0 END) as outgoing
FROM inventory_ledger
WHERE enterprise_id = ? AND accounting_context = 'REAL'
GROUP BY product_id, inventory_point_id;
```

### GL Balance (Сальдо по счетам)
```typescript
interface GlBalance {
  accountId: string;
  periodId: string;

  // Сальдо на начало периода
  openingDebit: MoneyAmount;
  openingCredit: MoneyAmount;

  // Обороты за период
  periodDebit: MoneyAmount;
  periodCredit: MoneyAmount;

  // Сальдо на конец периода
  closingDebit: MoneyAmount;
  closingCredit: MoneyAmount;
}
```

**Расчет оборотов:**
```sql
-- Обороты по счету за период
SELECT
  account_id,
  SUM(COALESCE(debit_amount, 0)) as period_debit,
  SUM(COALESCE(credit_amount, 0)) as period_credit
FROM gl_ledger
WHERE enterprise_id = ? AND period_id = ? AND accounting_context = 'REAL'
GROUP BY account_id;
```

## Корректировки и сторно

### Типы корректировок

#### 1. Storno (Сторно)
- Создание обратных проводок
- Применяется для полной отмены операций
- Сохраняет аудитный след

```typescript
interface StornoOperation {
  originalPostingId: string;
  reason: string;
  stornoDate: string;
}

// Создает записи со ссылкой reversal_of_id = originalPostingId
```

#### 2. Adjustment (Корректировка)
- Дополнительные проводки для исправления
- Применяется когда нужна частичная корректировка
- Не отменяет оригинальные записи

### Примеры корректировок

#### Исправление ошибки в количестве
```typescript
// Оригинал: +10 товаров
// Корректировка: +2 товара (итого должно быть +12)
{
  documentId: "adjustment-123",
  lines: [{
    productId: "product-456",
    quantity: 2,
    inventoryPointId: "warehouse-1"
  }]
}
```

#### Сторно продажи
```typescript
// Оригинальная продажа
{
  reversalOfId: "original-posting-789",
  reason: "Customer returned goods"
}
```

## Snapshots (Снимки)

### Period Snapshot
Фиксированные остатки на конец периода для быстрого доступа.

```typescript
interface PeriodSnapshot {
  id: string;
  enterpriseId: string;
  periodId: string;

  // Тип snapshot
  snapshotType: 'inventory' | 'gl' | 'tax';

  // Данные
  data: Record<string, any>;           // JSON с остатками

  // Метаданные
  createdAt: string;
  configVersionId: string;             // Конфигурация на момент создания
}
```

### Использование snapshots
- **Быстрые отчеты** без пересчета
- **Аудит** исторических данных
- **Восстановление** после сбоев

## Производительность и индексы

### Основные индексы
```sql
-- По enterprise и контексту (RLS)
CREATE INDEX idx_inventory_enterprise_context
  ON inventory_ledger(enterprise_id, accounting_context);

-- По периодам для отчетов
CREATE INDEX idx_gl_period_account
  ON gl_ledger(period_id, account_id, accounting_context);

-- По товарам для остатков
CREATE INDEX idx_inventory_product_point
  ON inventory_ledger(product_id, inventory_point_id, accounting_context);

-- По posting_id для аудита
CREATE INDEX idx_all_ledgers_posting
  ON inventory_ledger(posting_id),
  ON gl_ledger(posting_id),
  ON tax_ledger(posting_id);
```

### Partitioning
```sql
-- Разделение по периодам для больших таблиц
CREATE TABLE gl_ledger_y2026m01 PARTITION OF gl_ledger
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE gl_ledger_y2026m02 PARTITION OF gl_ledger
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

## Аудит и compliance

### Цепочка аудита
```
User Action → Posting Command → Posting Log → Ledger Entries
```

### Неизменность данных
- Все записи **append-only**
- DB triggers предотвращают UPDATE/DELETE
- Только **reversal** для корректировок

### Аудитные запросы
```typescript
// Все изменения товара за период
const productHistory = await api.getLedgerEntries({
  productId: 'product-123',
  periodId: 'period-456',
  type: 'inventory'
});

// Все проводки по счету
const accountHistory = await api.getLedgerEntries({
  accountId: 'account-789',
  periodId: 'period-456',
  type: 'gl'
});
```

## UI отображение регистров

### Таблица проводок
```typescript
interface LedgerTableProps {
  entries: LedgerEntry[];
  columns: LedgerColumn[];
  filters: LedgerFilters;
  onRowClick: (entry: LedgerEntry) => void;
}

const columns: LedgerColumn[] = [
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'document', label: 'Document', type: 'link' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'debit', label: 'Debit', type: 'money' },
  { key: 'credit', label: 'Credit', type: 'money' },
  { key: 'balance', label: 'Balance', type: 'money' }
];
```

### Детали проводки
```typescript
const LedgerEntryDetails = ({ entry }: { entry: LedgerEntry }) => (
  <div className="ledger-entry-details">
    <h3>Ledger Entry Details</h3>

    <InfoGrid>
      <InfoItem label="Entry ID" value={entry.id} />
      <InfoItem label="Posting ID" value={entry.postingId} />
      <InfoItem label="Document" value={entry.documentId} link />
      <InfoItem label="Date" value={formatDate(entry.docDate)} />
      <InfoItem label="Period" value={entry.periodId} />
      <InfoItem label="Config Version" value={entry.configVersionId} />
    </InfoGrid>

    {entry.reversalOfId && (
      <Alert type="warning">
        This entry reverses {entry.reversalOfId}
      </Alert>
    )}
  </div>
);
```