# Банковская сверка

## Обзор процесса

Банковская сверка — это процесс сопоставления банковских транзакций с документами предприятия для обеспечения точности учета денежных средств.

## Участники процесса

### Бухгалтер
- Загружает банковские выписки
- Просматривает нераспознанные транзакции
- Выполняет ручную сверку
- Подтверждает результаты

### Система
- Автоматически парсит выписки
- Предлагает сопоставления
- Выполняет дедупликацию
- Создает учетные эффекты

## Типы выписок

### Форматы файлов
- **CSV** — универсальный формат
- **Excel (XLSX)** — для сложных структур
- **PDF** — распознавание текста
- **MT940** — SWIFT формат
- **OFX/QFX** — финансовые форматы

### Источники данных
- **Ручная загрузка** файлов
- **API интеграции** с банками
- **Email forwarding** выписок

## Процесс импорта выписки

### Шаг 1: Выбор источника
```typescript
interface ImportSource {
  type: 'file' | 'api' | 'email';
  bankAccountId: string;
  file?: File;
  apiConnectionId?: string;
}
```

### Шаг 2: Парсинг файла
**Поддерживаемые форматы:**
```typescript
interface BankStatementFormat {
  name: string;
  parser: string;  // 'csv', 'mt940', 'ofx'
  dateFormat: string;
  amountFormat: string;
  encoding: string;
}
```

**Структура распаршенной транзакции:**
```typescript
interface ParsedTransaction {
  date: string;
  amount: number;
  currency: string;
  description: string;
  counterpartyName?: string;
  reference?: string;
  externalId: string;  // уникальный ID из банка
}
```

### Шаг 3: Дедупликация
**Проверка на дубли:**
```sql
-- Поиск существующих транзакций
SELECT id FROM bank_transactions
WHERE enterprise_id = ? AND external_id = ?
```

**Если дубликат найден:**
- Пропустить импорт
- Логировать как "already imported"

### Шаг 4: Создание транзакций
**Статусы после импорта:**
- `pending` — ожидает обработки
- `allocated` — автоматически разнесена
- `unallocated` — требует ручной обработки

## Автоматическое сопоставление

### Алгоритмы matching

#### 1. Точное сопоставление
```typescript
const exactMatch = documents.find(doc =>
  doc.amount === transaction.amount &&
  doc.date === transaction.date &&
  doc.counterparty.name === transaction.counterpartyName
);
```

#### 2. Fuzzy matching
- **По сумме:** ±1% tolerance
- **По дате:** ±3 дня
- **По контрагенту:** similarity > 80%

#### 3. Rule-based matching
```typescript
interface MatchingRule {
  name: string;
  conditions: {
    amountRange?: { min: number, max: number };
    dateRange?: { days: number };
    descriptionPattern?: RegExp;
    counterpartyPattern?: RegExp;
  };
  confidence: number;  // 0-100
}
```

### Confidence scoring
```typescript
interface MatchCandidate {
  documentId: string;
  confidence: number;  // 0-100
  reasons: string[];   // почему подходит
  autoAllocate: boolean;
}
```

**Пороги:**
- **90%+:** Автоматическое распределение
- **70-89%:** Предложение пользователю
- **<70%:** Требует ручной обработки

## Ручная сверка

### Интерфейс распределения
```typescript
interface Allocation {
  documentId?: string;        // Связанный документ
  categoryId?: string;        // Статья расходов
  amount: MoneyAmount;        // Сумма распределения
  description?: string;       // Комментарий
}
```

### Типы распределения

#### 1. Полное распределение
```
Транзакция: -1000 UAH "Payment to Supplier"
Распределение: 100% → Document #123 (Purchase)
```

#### 2. Частичное распределение
```
Транзакция: -1500 UAH "Multiple payments"
Распределение:
  - 1000 UAH → Document #123
  - 500 UAH → Expense Category "Office supplies"
```

#### 3. На несколько документов
```
Транзакция: +2500 UAH "Client payments"
Распределение:
  - 1000 UAH → Invoice #456
  - 1500 UAH → Invoice #789
```

## Категории расходов

### Предустановленные категории
```typescript
const expenseCategories = [
  { id: 'office', name: 'Office supplies' },
  { id: 'travel', name: 'Travel expenses' },
  { id: 'utilities', name: 'Utilities' },
  { id: 'taxes', name: 'Taxes and fees' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'other', name: 'Other expenses' }
];
```

### Кастомные категории
- Создание собственных категорий
- Иерархическая структура
- Привязка к GL счетам

## UI компоненты

### Импорт wizard
```
1. Выбор счета ┌─ Bank Account ──────────────────┐
   │ [Dropdown] │ Main Account (UAH) │ [▼] │
   └────────────┴──────────────────────────────┘

2. Загрузка файла
   ┌─ File Upload ──────────────────────────────┐
   │ [Drag & drop area]                        │
   │ or [Browse files]                          │
   │ Supported: CSV, XLSX, PDF                  │
   └────────────────────────────────────────────┘

3. Предпросмотр
   ┌─ Preview ──────────────────────────────────┐
   │ Found 25 transactions                      │
   │ Date range: 01.01 - 31.01.2026             │
   │ Total: +15000 UAH, -8500 UAH               │
   └────────────────────────────────────────────┘
```

### Список транзакций
```typescript
interface TransactionListView {
  filters: {
    status: 'all' | 'unallocated' | 'allocated';
    dateFrom: string;
    dateTo: string;
    amountMin: number;
    amountMax: number;
    search: string;
  };
  columns: [
    'date',
    'description',
    'amount',
    'status',
    'allocations'
  ];
}
```

### Детали транзакции
```
┌─ Transaction Details ──────────────────────┐
│ Date: 15.01.2026                          │
│ Amount: -1,250.00 UAH                     │
│ Description: PAYMENT TO SUPPLIER ABC      │
│ Status: Unallocated                       │
│                                           │
│ [Auto-match suggestions]                  │
│ • Document #123 (95% confidence)          │
│ • Document #456 (78% confidence)          │
│                                           │
│ [Manual allocation]                       │
│ Document: [Search/Dropdown]               │
│ Amount: [Input] 1250.00                   │
│ [Add allocation]                          │
└───────────────────────────────────────────┘
```

## Обработка ошибок

### Ошибки парсинга
```json
{
  "error": {
    "code": "PARSE_ERROR",
    "message": "Invalid date format in row 5",
    "details": {
      "row": 5,
      "column": "date",
      "value": "2026/01/15",
      "expected": "DD.MM.YYYY"
    }
  }
}
```

### Конфликты
```json
{
  "error": {
    "code": "ALLOCATION_CONFLICT",
    "message": "Transaction already fully allocated",
    "details": {
      "allocatedAmount": 1000,
      "transactionAmount": 1000
    }
  }
}
```

## Отчетность

### Сверка по счету
```typescript
interface ReconciliationReport {
  bankAccountId: string;
  period: string;
  bankBalance: number;          // По данным банка
  bookBalance: number;          // По данным учета
  difference: number;           // Расхождение
  unallocatedTransactions: number;
  lastReconciliationDate: string;
}
```

### Детальный отчет
- Список всех транзакций периода
- Сопоставление с документами
- Выделение нераспознанных операций
- Экспорт в Excel/PDF

## API интеграции

### Поддерживаемые банки
- **Stripe** — для платежей
- **PayPal** — для платежей
- **Wise** — для переводов
- **Revolut** — для бизнес-счетов
- **Местные банки** — через API

### Автоматический импорт
```typescript
interface PaymentProviderConnection {
  provider: 'stripe' | 'paypal' | 'wise';
  accountId: string;
  apiKey: string;  // encrypted
  lastSync: string;
  syncFrequency: 'daily' | 'hourly';
}
```

### Webhook обработка
```typescript
interface WebhookPayload {
  provider: string;
  eventType: string;  // 'payment.succeeded', 'transfer.completed'
  transaction: {
    id: string;
    amount: number;
    currency: string;
    date: string;
    description: string;
  };
}
```

## Производительность

### Оптимизации
- **Batch processing** для больших выписок
- **Background jobs** для импорта
- **Incremental sync** для API
- **Caching** правил сопоставления

### Масштабирование
- **Queue-based** обработка импортов
- **Horizontal scaling** парсеров
- **Database optimization** для поиска сопоставлений