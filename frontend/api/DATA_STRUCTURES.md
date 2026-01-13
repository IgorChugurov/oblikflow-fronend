# Структуры данных OblikFlow

## Общие поля

### Base Entity
Все сущности наследуют общие поля:

```typescript
interface BaseEntity {
  id: string;                    // UUID
  enterpriseId: string;          // UUID предприятия
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
  createdBy: string;             // UUID пользователя
  updatedBy?: string;            // UUID пользователя
}
```

### Money fields
```typescript
interface MoneyAmount {
  amount: number;                // Сумма в минимальных единицах (копейки/центы)
  currency: string;              // ISO код валюты (UAH, USD, EUR)
}
```

### Period reference
```typescript
interface PeriodReference {
  periodId: string;              // UUID периода
  periodName: string;            // Человекочитаемое имя (2026-01)
  periodStatus: 'open' | 'closed';
}
```

## Документы (Documents)

### Document
```typescript
interface Document extends BaseEntity {
  type: DocumentType;
  number?: string;               // Номер документа
  date: string;                  // Дата документа (YYYY-MM-DD)
  status: DocumentStatus;
  counterpartyId?: string;       // Контрагент
  amount: MoneyAmount;
  description?: string;
  lines: DocumentLine[];
  tags?: string[];               // Теги для поиска
  externalId?: string;           // ID из внешней системы
}

type DocumentType =
  | 'purchase'      // Поступление товаров/услуг
  | 'sale'          // Продажа товаров/услуг
  | 'expense'       // Расход
  | 'income'        // Доход
  | 'transfer'      // Внутреннее перемещение
  | 'adjustment';   // Корректировка

type DocumentStatus =
  | 'draft'         // Черновик
  | 'posted'        // Проведен
  | 'cancelled';    // Отменен
```

### Document Line
```typescript
interface DocumentLine {
  id: string;
  productId?: string;           // Товар/услуга
  description: string;
  quantity?: number;            // Количество
  unitPrice?: MoneyAmount;      // Цена за единицу
  amount: MoneyAmount;          // Сумма строки
  taxRate?: number;             // Ставка НДС (%)
  taxAmount?: MoneyAmount;      // Сумма НДС
  accountId?: string;           // Счет учета
  inventoryPointId?: string;    // Точка учета (для склада)
}
```

## Товары (Products)

### Product
```typescript
interface Product extends BaseEntity {
  code: string;                 // Артикул/SKU
  name: string;
  description?: string;
  categoryId?: string;
  unit: string;                 // шт, кг, м, etc.
  price: MoneyAmount;           // Стандартная цена продажи
  costPrice?: MoneyAmount;      // Себестоимость
  taxCategoryId?: string;       // Налоговая категория
  isActive: boolean;
  inventoryTracking: boolean;   // Ведется ли количественный учет
}
```

### Inventory Balance
```typescript
interface InventoryBalance {
  productId: string;
  inventoryPointId: string;
  available: number;            // Доступно для продажи
  reserved: number;             // В резерве
  onHand: number;              // Фактически на складе
  unit: string;
}
```

## Контрагенты (Counterparties)

### Counterparty
```typescript
interface Counterparty extends BaseEntity {
  type: 'customer' | 'supplier' | 'both';
  name: string;
  code?: string;                // Внутренний код
  taxId?: string;              // ИНН/Налоговый ID
  vatNumber?: string;          // НДС номер
  address?: Address;
  contactInfo?: ContactInfo;
  paymentTerms?: PaymentTerms;
  taxProfile?: TaxProfile;
  isActive: boolean;
}
```

### Address
```typescript
interface Address {
  country: string;             // ISO код страны
  city: string;
  street: string;
  postalCode?: string;
}
```

### Contact Info
```typescript
interface ContactInfo {
  email?: string;
  phone?: string;
  website?: string;
}
```

## Банк (Bank)

### Bank Account
```typescript
interface BankAccount extends BaseEntity {
  name: string;                // Название счета
  accountNumber: string;       // Номер счета
  bankName: string;
  currency: string;
  isActive: boolean;
  balance: MoneyAmount;        // Текущий баланс
}
```

### Bank Transaction
```typescript
interface BankTransaction extends BaseEntity {
  bankAccountId: string;
  date: string;                // Дата транзакции
  amount: MoneyAmount;
  description: string;
  counterpartyName?: string;
  reference?: string;          // Номер платежного поручения
  externalId: string;          // ID из банка/API
  status: TransactionStatus;
  allocations: TransactionAllocation[];
}

type TransactionStatus =
  | 'pending'      // Ожидает обработки
  | 'allocated'    // Разнесена
  | 'unallocated'; // Не разнесена
```

### Transaction Allocation
```typescript
interface TransactionAllocation {
  id: string;
  documentId?: string;          // Связанный документ
  amount: MoneyAmount;
  description?: string;
  categoryId?: string;          // Статья расходов
}
```

## Периоды (Periods)

### Period
```typescript
interface Period extends BaseEntity {
  name: string;                // 2026-01
  startDate: string;           // YYYY-MM-DD
  endDate: string;             // YYYY-MM-DD
  status: PeriodStatus;
  configVersionId: string;     // Версия конфигурации
  closedAt?: string;
  closedBy?: string;
}

type PeriodStatus =
  | 'open'         // Открыт для операций
  | 'closing'      // В процессе закрытия
  | 'closed';      // Закрыт
```

## Пользователи и роли

### User
```typescript
interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  language: string;            // en, uk, de
  timezone: string;
  isActive: boolean;
  createdAt: string;
}
```

### Enterprise Membership
```typescript
interface EnterpriseMembership {
  id: string;
  userId: string;
  enterpriseId: string;
  role: UserRole;
  invitedAt: string;
  joinedAt?: string;
  invitedBy: string;
}

type UserRole =
  | 'owner'        // Владелец предприятия
  | 'admin'        // Администратор
  | 'accountant'   // Бухгалтер
  | 'warehouse'    // Складовщик
  | 'viewer';      // Просмотр
```

## Предприятие (Enterprise)

### Enterprise
```typescript
interface Enterprise {
  id: string;
  name: string;
  code?: string;
  country: string;             // ISO код страны
  baseCurrency: string;        // Основная валюта учета
  language: string;            // Язык документов
  timezone: string;
  status: EnterpriseStatus;
  config: EnterpriseConfig;
  ownerId: string;
  createdAt: string;
}

type EnterpriseStatus =
  | 'setup'        // В процессе настройки
  | 'active'       // Активно
  | 'inactive'     // Неактивно
  | 'suspended';   // Заблокировано
```

### Enterprise Config
```typescript
interface EnterpriseConfig {
  enabledModules: string[];    // ['bank', 'inventory', 'taxes']
  taxProfile: TaxProfile;
  inventorySettings?: InventorySettings;
  bankSettings?: BankSettings;
  fiscalYearStart: number;     // Месяц начала года (1-12)
}
```

## Effect Manifest

### Preview/Efect Response
```typescript
interface EffectManifest {
  effects: Effect[];
  warnings?: string[];
  errors?: ValidationError[];
}

interface Effect {
  type: EffectType;
  description: string;         // Человекочитаемое описание
  amount?: MoneyAmount;
  quantity?: number;
  details?: Record<string, any>;
}

type EffectType =
  | 'inventory_movement'    // Движение товара
  | 'gl_entry'             // Проводка
  | 'tax_event'            // Налоговое событие
  | 'bank_allocation'      // Распределение платежа
  | 'reservation_create'   // Создание резерва
  | 'reservation_convert'; // Конвертация резерва
```

## API Response wrappers

### Paginated Response
```typescript
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    timestamp: string;
    requestId: string;
  };
}
```

### Single Item Response
```typescript
interface SingleResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
  };
}
```

### Error Response
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    field?: string;           // Для валидационных ошибок
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}
```

## Validation

### Validation Error
```typescript
interface ValidationError {
  field: string;              // Путь к полю (dot notation)
  code: string;               // Код ошибки
  message: string;            // Человекочитаемое сообщение
  value?: any;                // Переданное значение
  expected?: any;             // Ожидаемое значение
}
```

### Common Validation Codes
- `required` - Обязательное поле
- `invalid_format` - Неверный формат
- `out_of_range` - Значение вне диапазона
- `invalid_reference` - Ссылка на несуществующий объект
- `period_closed` - Период закрыт
- `insufficient_permissions` - Недостаточно прав