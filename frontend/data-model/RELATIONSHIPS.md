# Связи между сущностями

## Диаграмма основных связей

```
Enterprise (1)
├── Users (M:M) через EnterpriseMembership
├── Periods (1:M)
├── Documents (1:M)
├── Products (1:M)
├── Counterparties (1:M)
├── BankAccounts (1:M)
├── PostingLogs (1:M)
└── Ledger Entries (1:M)

Period (1)
├── Documents (1:M)
├── PostingLogs (1:M)
├── InventoryLedger (1:M)
├── GlLedger (1:M)
├── TaxLedger (1:M)
└── PayrollLedger (1:M)

Document (1)
├── DocumentLines (1:M)
├── Product (M:1) через DocumentLines
├── Counterparty (M:1)
├── BankTransactions (M:M) через Allocations
└── PostingLog (1:1)

Product (1)
├── DocumentLines (1:M)
├── InventoryBalances (1:M)
└── InventoryLedger (1:M)

BankAccount (1)
├── BankTransactions (1:M)
└── BankStatementImports (1:M)

PostingLog (1)
├── InventoryLedger (1:M)
├── GlLedger (1:M)
├── TaxLedger (1:M)
└── PayrollLedger (1:M)
```

## Типы связей

### 1. Один к одному (1:1)

#### Enterprise → EnterpriseConfig
```typescript
interface Enterprise {
  config: EnterpriseConfig;  // Текущая конфигурация
}

interface EnterpriseConfig {
  enterpriseId: string;      // Обратная ссылка (необязательна)
}
```

#### Document → PostingLog
```typescript
interface Document {
  // Нет прямой ссылки
}

interface PostingLog {
  // Ссылка через commandId → posting_commands → documentId
  commandId: string;
}
```

### 2. Один ко многим (1:M)

#### Enterprise → Periods
```typescript
interface Enterprise {
  // periods: Period[];  // Через запрос
}

interface Period {
  enterpriseId: string;     // Обязательная ссылка
}
```

#### Document → DocumentLines
```typescript
interface Document {
  lines: DocumentLine[];     // Встроенный массив
}

interface DocumentLine {
  documentId: string;       // Ссылка на документ
}
```

#### Period → Documents
```typescript
interface Period {
  // documents: Document[]; // Через запрос
}

interface Document {
  periodId: string;         // Ссылка на период
}
```

### 3. Многие ко многим (M:M)

#### Enterprise ↔ User (через EnterpriseMembership)
```typescript
interface Enterprise {
  // users: User[];  // Через EnterpriseMembership
}

interface User {
  // enterprises: Enterprise[];  // Через EnterpriseMembership
}

interface EnterpriseMembership {
  enterpriseId: string;
  userId: string;
  role: UserRole;
}
```

#### Document ↔ BankTransaction (через Allocation)
```typescript
interface Document {
  // allocations: TransactionAllocation[];  // Через запрос
}

interface BankTransaction {
  allocations: TransactionAllocation[];
}

interface TransactionAllocation {
  documentId?: string;
  transactionId: string;
  amount: MoneyAmount;
}
```

## Каскадные связи

### При удалении предприятия
```
Enterprise (DELETE)
├── EnterpriseMembership (CASCADE) → Users (не удаляются)
├── Periods (CASCADE)
│   ├── Documents (CASCADE)
│   │   ├── DocumentLines (CASCADE)
│   │   └── PostingLogs (CASCADE)
│   │       ├── InventoryLedger (CASCADE)
│   │       ├── GlLedger (CASCADE)
│   │       ├── TaxLedger (CASCADE)
│   │       └── PayrollLedger (CASCADE)
│   └── PeriodSnapshots (CASCADE)
├── Products (CASCADE)
├── Counterparties (CASCADE)
└── BankAccounts (CASCADE)
    └── BankTransactions (CASCADE)
        └── TransactionAllocations (CASCADE)
```

### При закрытии периода
```
Period (status = 'closed')
├── Documents (period.status проверяется в UI/API)
├── Новые PostingLogs (блокируются триггерами)
└── Новые Ledger Entries (блокируются триггерами)
```

## Навигация по связям

### От документа к проводкам
```typescript
// Найти все проводки документа
const documentPostings = await api.getPostingLogs({
  documentId: 'doc-123'
});

// Найти все GL проводки
const glEntries = await api.getLedgerEntries({
  postingIds: documentPostings.map(p => p.id),
  type: 'gl'
});
```

### От товара к остаткам
```typescript
// Остатки товара по всем точкам учета
const balances = await api.getInventoryBalances({
  productId: 'prod-456'
});

// Движения товара за период
const movements = await api.getLedgerEntries({
  productId: 'prod-456',
  periodId: 'period-789',
  type: 'inventory'
});
```

### От транзакции к документам
```typescript
// Документы, связанные с транзакцией
const allocations = await api.getTransactionAllocations('tx-123');

const documents = await Promise.all(
  allocations
    .filter(a => a.documentId)
    .map(a => api.getDocument(a.documentId))
);
```

## Циклические зависимости

### Проблема
Некоторые связи могут создавать циклы:
```
Document → Period → Documents
Product → DocumentLines → Document → Product
```

### Решение
- **Ленивая загрузка** для предотвращения бесконечных циклов
- **Ограничение глубины** при сериализации
- **Селективная загрузка** только нужных связей

```typescript
// Избегать циклических ссылок
interface DocumentSummary {
  id: string;
  number?: string;
  date: string;
  amount: MoneyAmount;
  status: DocumentStatus;
  // НЕ включать lines, period, etc.
}
```

## Связи в API запросах

### Включение связанных данных
```typescript
// Запрос с включением связей
const document = await api.getDocument('doc-123', {
  include: ['lines', 'counterparty', 'period']
});

// Ответ с populated связями
{
  "data": {
    "id": "doc-123",
    "lines": [...],
    "counterparty": {...},
    "period": {...}
  }
}
```

### Пагинация связанных данных
```typescript
// Документы с пагинацией строк
const documents = await api.getDocuments({
  include: {
    lines: {
      page: 1,
      limit: 50
    }
  }
});
```

## Связи в формах

### Каскадные селекторы
```typescript
// При выборе предприятия фильтровать периоды
const PeriodSelector = ({ enterpriseId }: { enterpriseId: string }) => {
  const { data: periods } = usePeriods(enterpriseId);

  return (
    <Select>
      {periods?.map(period => (
        <Option key={period.id} value={period.id}>
          {period.name}
        </Option>
      ))}
    </Select>
  );
};
```

### Автозаполнение связей
```typescript
// При выборе контрагента заполнять налоговые поля
const CounterpartySelector = ({ onChange }: { onChange: (counterparty: Counterparty) => void }) => {
  const handleSelect = async (counterpartyId: string) => {
    const counterparty = await api.getCounterparty(counterpartyId);
    onChange(counterparty);
  };

  return <SearchSelect onSelect={handleSelect} />;
};
```

## Связи в отчетах

### Агрегация по связям
```typescript
// Отчет по продажам с детализацией по товарам
const salesReport = await api.getSalesReport({
  groupBy: ['product', 'counterparty'],
  periodId: 'period-123'
});

// Результат группируется по связанным сущностям
{
  "data": [
    {
      "product": { "id": "prod-1", "name": "Laptop" },
      "counterparty": { "id": "ctr-1", "name": "Customer A" },
      "totalAmount": { "amount": 150000, "currency": "UAH" },
      "quantity": 2
    }
  ]
}
```

### Дрилл-даун по связям
```typescript
// Клик на сумму в отчете открывает детали
const handleDrillDown = (productId: string, counterpartyId: string) => {
  navigate(`/documents?productId=${productId}&counterpartyId=${counterpartyId}`);
};
```

## Связи в поиске

### Поиск по связанным полям
```typescript
// Поиск документов по названию контрагента
const documents = await api.searchDocuments({
  counterpartyName: 'Apple',
  periodId: 'period-123'
});

// Поиск товаров по категории
const products = await api.searchProducts({
  categoryName: 'Electronics',
  inStock: true
});
```

### Фильтры по связям
```typescript
// Документы определенного типа с товарами из категории
const documents = await api.getDocuments({
  filters: {
    type: 'sale',
    'lines.product.categoryId': 'electronics'
  }
});
```

## Производительность связей

### Оптимизация запросов

#### N+1 проблема
```typescript
// ❌ N+1 запросов
const documents = await api.getDocuments();
const documentsWithLines = await Promise.all(
  documents.map(doc => api.getDocumentLines(doc.id))
);

// ✅ Один запрос с JOIN
const documents = await api.getDocuments({
  include: ['lines']
});
```

#### Индексы для связей
```sql
-- Индексы для часто используемых связей
CREATE INDEX idx_documents_period ON documents(period_id);
CREATE INDEX idx_document_lines_product ON document_lines(product_id);
CREATE INDEX idx_inventory_product_point ON inventory_ledger(product_id, inventory_point_id);
```

### Кеширование связей

#### Кеш справочников
```typescript
const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: api.getProducts,
    staleTime: 5 * 60 * 1000,  // 5 минут
  });
};

const useCounterparties = () => {
  return useQuery({
    queryKey: ['counterparties'],
    queryFn: api.getCounterparties,
    staleTime: 5 * 60 * 1000,
  });
};
```

#### Предварительная загрузка
```typescript
// Предзагрузка связанных данных
const DocumentForm = ({ documentId }: { documentId?: string }) => {
  // Предзагрузка справочников
  useProducts();
  useCounterparties();

  // ...
};
```

## Валидация связей

### Проверка существования
```typescript
const validateDocument = (document: Document) => {
  const errors: ValidationError[] = [];

  // Проверка существования периода
  if (!await api.periodExists(document.periodId)) {
    errors.push({
      field: 'periodId',
      message: 'Period does not exist'
    });
  }

  // Проверка существования контрагента
  if (document.counterpartyId && !await api.counterpartyExists(document.counterpartyId)) {
    errors.push({
      field: 'counterpartyId',
      message: 'Counterparty does not exist'
    });
  }

  // Проверка существования товаров в строках
  for (const line of document.lines) {
    if (line.productId && !await api.productExists(line.productId)) {
      errors.push({
        field: `lines[${line.id}].productId`,
        message: 'Product does not exist'
      });
    }
  }

  return errors;
};
```

### Целостность ссылок
```sql
-- DB constraints для обеспечения целостности
ALTER TABLE documents
  ADD CONSTRAINT fk_documents_period
  FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE;

ALTER TABLE document_lines
  ADD CONSTRAINT fk_document_lines_product
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
```

## Миграции связей

### Добавление новых связей
1. **Добавить поля** в сущности
2. **Создать индексы** для новых полей
3. **Обновить API** для работы с новыми связями
4. **Мигрировать данные** если необходимо

### Удаление связей
1. **Проверить использование** в коде и БД
2. **Создать план миграции** для переноса данных
3. **Удалить связи** из кода
4. **Удалить поля** из БД

## Тестирование связей

### Unit тесты
```typescript
describe('Entity relationships', () => {
  it('should validate foreign key constraints', async () => {
    const invalidDocument = {
      periodId: 'non-existent-period',
      counterpartyId: 'non-existent-counterparty'
    };

    const errors = await validateDocument(invalidDocument);

    expect(errors).toContainEqual(
      expect.objectContaining({ field: 'periodId' })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({ field: 'counterpartyId' })
    );
  });
});
```

### Integration тесты
```typescript
describe('Cascade operations', () => {
  it('should delete related entities when enterprise is deleted', async () => {
    // Создать предприятие с данными
    const enterprise = await createEnterpriseWithData();

    // Удалить предприятие
    await deleteEnterprise(enterprise.id);

    // Проверить каскадное удаление
    const documents = await getDocuments(enterprise.id);
    expect(documents).toHaveLength(0);

    const products = await getProducts(enterprise.id);
    expect(products).toHaveLength(0);
  });
});
```