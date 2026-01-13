# Управление складом и инвентаризация

## Обзор модуля

Складской учет включает управление товарами, остатками, резервами и инвентаризацией. Модуль поддерживает многоточечный учет и сложные резервы.

## Основные сущности

### Товары (Products)
```typescript
interface Product {
  id: string;
  code: string;                 // Артикул/SKU
  name: string;
  categoryId?: string;
  unit: string;                 // шт, кг, л, м²
  price: MoneyAmount;           // Продажная цена
  costPrice?: MoneyAmount;      // Себестоимость
  minStock?: number;            // Минимальный остаток
  maxStock?: number;            // Максимальный остаток
  inventoryTracking: boolean;   // Ведется количественный учет
}
```

### Точки учета (Inventory Points)
```typescript
interface InventoryPoint {
  id: string;
  name: string;                 // "Main Warehouse", "Shop A"
  type: 'warehouse' | 'shop' | 'production';
  address?: string;
  isActive: boolean;
}
```

### Остатки (Inventory Balances)
```typescript
interface InventoryBalance {
  productId: string;
  inventoryPointId: string;
  available: number;            // Доступно для продажи
  reserved: number;             // В резерве
  onHand: number;              // Фактически на складе
  incoming?: number;            // Ожидается поступление
  unit: string;
  lastUpdated: string;
}
```

## Резервы (Reservations)

### Создание резерва
```typescript
interface Reservation {
  id: string;
  productId: string;
  inventoryPointId: string;
  quantity: number;
  reason: string;               // "Order #123", "Production batch #456"
  expiresAt?: string;           // TTL для резерва
  status: 'active' | 'converted' | 'expired' | 'cancelled';
  createdBy: string;
}
```

### Жизненный цикл резерва
```
Создан (Active)
├── Конвертирован (Converted) → Связан с документом отгрузки
├── Истек (Expired) → Автоматически освобожден
└── Отменен (Cancelled) → Вручную освобожден
```

### Конвертация резерва
**Процесс:**
1. Создание документа отгрузки
2. Связывание с существующим резервом
3. Атомарная операция через Posting Orchestrator
4. Освобождение/уменьшение резерва

## Инвентаризация

### Сессии инвентаризации
```typescript
interface InventorySession {
  id: string;
  name: string;                 // "Monthly count January 2026"
  inventoryPointId: string;
  status: 'draft' | 'counting' | 'review' | 'confirmed' | 'posted';
  baselineDate: string;         // Дата на которую считаем
  countedBy?: string[];         // Кто участвует в подсчете
  approvedBy?: string;          // Кто утвердил
  createdAt: string;
}
```

### Подсчеты (Counts)
```typescript
interface InventoryCount {
  id: string;
  sessionId: string;
  productId: string;
  expectedQuantity: number;     // По данным учета
  countedQuantity: number;      // Фактический подсчет
  difference: number;           // Расхождение
  reasonCodeId?: string;        // Причина расхождения
  notes?: string;
  countedBy: string;
  countedAt: string;
}
```

### Причины расхождений
```typescript
const reasonCodes = [
  { id: 'damage', name: 'Damage/Loss', glAccountId: 'losses' },
  { id: 'theft', name: 'Theft', glAccountId: 'losses' },
  { id: 'error', name: 'Counting error', glAccountId: 'adjustments' },
  { id: 'supplier', name: 'Supplier discrepancy', glAccountId: 'suppliers' },
  { id: 'transfer', name: 'Unrecorded transfer', glAccountId: 'transfers' }
];
```

## Процессы

### 1. Управление товарами

#### Создание товара
```typescript
const newProduct = {
  code: 'LPT-001',
  name: 'Laptop Model X',
  unit: 'шт',
  price: { amount: 150000, currency: 'UAH' },  // 1500.00 UAH
  inventoryTracking: true,
  categoryId: 'electronics'
};
```

#### Импорт товаров
- **Excel/CSV** загрузка
- **Валидация** данных
- **Дедупликация** по коду
- **Batch processing** для больших файлов

### 2. Учет поступлений

#### Поступление товаров
```typescript
const purchaseDocument = {
  type: 'purchase',
  date: '2026-01-15',
  counterpartyId: 'supplier-123',
  lines: [
    {
      productId: 'LPT-001',
      quantity: 10,
      unitPrice: { amount: 120000, currency: 'UAH' },  // 1200.00
      inventoryPointId: 'warehouse-1'
    }
  ]
};
```

#### Автоматические эффекты
- **+10** Laptop в Main Warehouse
- **GL:** Debit Inventory 12000 UAH, Credit Accounts Payable 12000 UAH
- **Обновление** остатков

### 3. Резервирование

#### Создание резерва
```typescript
const reservation = await createReservation({
  productId: 'LPT-001',
  inventoryPointId: 'warehouse-1',
  quantity: 2,
  reason: 'Order #123 for Customer ABC',
  expiresAt: '2026-02-15'  // 30 дней
});
```

#### Проверка доступности
```typescript
const availability = await checkProductAvailability('LPT-001', 'warehouse-1');
// {
//   available: 8,    // 10 - 2 reserved = 8
//   reserved: 2,
//   onHand: 10
// }
```

### 4. Отгрузка и продажа

#### Создание продажи
```typescript
const saleDocument = {
  type: 'sale',
  date: '2026-01-16',
  counterpartyId: 'customer-456',
  lines: [
    {
      productId: 'LPT-001',
      quantity: 2,
      unitPrice: { amount: 150000, currency: 'UAH' },  // 1500.00
      inventoryPointId: 'warehouse-1'
    }
  ]
};
```

#### Конвертация резерва
```typescript
await convertReservation({
  reservationId: 'res-123',
  documentId: 'doc-456',  // Sale document
  quantity: 2  // Полная конвертация
});
```

### 5. Инвентаризация

#### Создание сессии
```typescript
const session = await createInventorySession({
  name: 'Monthly inventory January 2026',
  inventoryPointId: 'warehouse-1',
  baselineDate: '2026-01-31'
});
```

#### Получение baseline
```typescript
const baseline = await getInventoryBaseline(session.id);
// Возвращает все товары с expected количествами на baselineDate
```

#### Ввод подсчетов
```typescript
// Оффлайн/онлайн ввод
const counts = [
  { productId: 'LPT-001', countedQuantity: 8 },  // Было 10, продано 2
  { productId: 'MS-001', countedQuantity: 15 },  // Расхождение +2
];

// Batch сохранение
await saveInventoryCounts(session.id, counts);
```

#### Review и корректировка
```typescript
const variances = await getInventoryVariances(session.id);
// Показывает расхождения:
// LPT-001: expected 10, counted 8, difference -2
// MS-001: expected 13, counted 15, difference +2

// Назначение причин
await assignReasonCodes(session.id, [
  { productId: 'LPT-001', reasonCodeId: 'sale', notes: 'Sold to customer' },
  { productId: 'MS-001', reasonCodeId: 'supplier', notes: 'Extra delivery' }
]);
```

#### Подтверждение и проведение
```typescript
// Создание корректировочного документа
const adjustmentDoc = await confirmInventorySession(session.id);

// Автоматические эффекты:
// -2 LPT-001 (adjustment out)
// +2 MS-001 (adjustment in)
// GL проводки по reason codes
```

## UI компоненты

### Дашборд склада
```
┌─ Inventory Dashboard ──────────────────────┐
│ 📊 Key Metrics                             │
│ • Total products: 1,247                    │
│ • Low stock alerts: 23                     │
│ • Active reservations: 45                  │
│ • Pending counts: 2 sessions               │
│                                            │
│ 🔴 Low Stock Items                         │
│ • Laptop Model X: 3 left (min: 5)         │
│ • Mouse Wireless: 0 left (min: 10)        │
│                                            │
│ 📦 Recent Movements                        │
│ • +50 Monitors (Purchase #123)             │
│ • -5 Laptops (Sale #456)                   │
│ • Transfer: Warehouse → Shop (+10 items)   │
└────────────────────────────────────────────┘
```

### Управление товарами
```typescript
interface ProductManagementView {
  filters: {
    category?: string;
    stockStatus: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
    search: string;
  };
  bulkActions: [
    'update_prices',
    'adjust_stock',
    'export',
    'delete'
  ];
}
```

### Резервы
```
┌─ Reservations ─────────────────────────────┐
│ [Active] [Expired] [Converted]             │
│                                            │
│ 📋 Active Reservations                     │
│ ┌─────────────────────────────────────────┐ │
│ │ Order #123 - Customer ABC              │ │
│ │ Product: Laptop Model X                 │ │
│ │ Quantity: 2 шт                         │ │
│ │ Expires: 15.02.2026                    │ │
│ │ [Convert] [Cancel]                     │ │
│ └─────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

### Инвентаризация wizard
```
Шаг 1: Создание сессии
├── Выбор точки учета
├── Указание даты baseline
└── Назначение участников

Шаг 2: Подсчет
├── Печать листов подсчета
├── Онлайн ввод (мобильное app)
├── Импорт из Excel
└── Progress tracking

Шаг 3: Review
├── Сравнение expected vs counted
├── Выделение variances
├── Назначение reason codes
└── Approval workflow

Шаг 4: Подтверждение
├── Создание adjustment документа
├── Preview эффектов
└── Проведение корректировок
```

## Мобильное приложение

### Оффлайн возможности
- **Синхронизация** товаров и остатков
- **Оффлайн подсчет** инвентаризации
- **Queue** операций для отправки при подключении
- **Штрихкоды** для быстрого ввода

### PWA features
- **Installable** на устройства
- **Push notifications** о низких остатках
- **Camera integration** для штрихкодов
- **Offline-first** архитектура

## Отчетность

### Складские отчеты
- **Остатки по товарам** (с фильтрами)
- **Движения товаров** (период, точка учета)
- **ABC анализ** (по оборачиваемости)
- **Low stock alerts** (автоматические)

### Инвентаризационные отчеты
- **История подсчетов** по сессиям
- **Анализ расхождений** по причинам
- **Тренды точности** подсчетов
- **Cost of inventory** adjustments

## API endpoints

### Основные операции
```typescript
// Товары
GET /products
POST /products
PUT /products/{id}

// Остатки
GET /products/{id}/balance
GET /inventory-points/{id}/balances

// Резервы
GET /reservations
POST /reservations
POST /reservations/{id}/convert

// Инвентаризация
GET /inventory-sessions
POST /inventory-sessions
POST /inventory-sessions/{id}/counts
POST /inventory-sessions/{id}/confirm
```

## Производительность

### Оптимизации
- **Materialized views** для остатков
- **Partitioning** по inventory_point_id
- **Batch updates** для массовых операций
- **Caching** популярных товаров

### Масштабирование
- **Read replicas** для отчетов
- **Queue-based** обработка тяжелых операций
- **Horizontal scaling** для больших складов