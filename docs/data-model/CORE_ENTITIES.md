# Основные сущности системы

## Предприятие (Enterprise)

### Описание
Корневая сущность, представляющая изолированный контур данных и бизнес-процессов.

### Структура
```typescript
interface Enterprise {
  id: string;                          // UUID
  name: string;                        // Название предприятия
  code?: string;                       // Внутренний код
  country: string;                     // ISO код страны (UA, AT, DE)
  baseCurrency: string;                // Основная валюта учета (UAH, EUR, USD)
  language: string;                    // Язык документов (en, uk, de)
  timezone: string;                    // Часовой пояс
  status: EnterpriseStatus;            // Статус предприятия
  config: EnterpriseConfig;            // Текущая конфигурация
  ownerId: string;                     // ID владельца

  // Метаданные
  createdAt: string;                   // Дата создания
  updatedAt: string;                   // Дата обновления
}
```

### Статусы
```typescript
type EnterpriseStatus =
  | 'setup'        // В процессе настройки
  | 'active'       // Активно
  | 'inactive'     // Неактивно
  | 'suspended';   // Заблокировано
```

### Связи
- **1:1** с `EnterpriseConfig` (текущая конфигурация)
- **1:M** с `EnterpriseConfigVersion` (история конфигураций)
- **1:M** с `Period` (периоды учета)
- **1:M** с `EnterpriseMembership` (участники)

## Пользователь (User)

### Описание
Пользователь системы, может иметь доступ к нескольким предприятиям.

### Структура
```typescript
interface User {
  id: string;                          // UUID
  email: string;                       // Email (уникальный)
  name?: string;                       // Отображаемое имя
  avatar?: string;                     // URL аватара
  language: string;                    // Предпочитаемый язык UI
  timezone: string;                    // Часовой пояс
  isActive: boolean;                   // Активен ли аккаунт

  // Метаданные
  createdAt: string;
  lastLoginAt?: string;
  emailVerified: boolean;
}
```

### Связи
- **M:M** через `EnterpriseMembership` с `Enterprise`

## Участник предприятия (EnterpriseMembership)

### Описание
Связь пользователя с предприятием и его ролью.

### Структура
```typescript
interface EnterpriseMembership {
  id: string;
  userId: string;                      // Ссылка на пользователя
  enterpriseId: string;                // Ссылка на предприятие
  role: UserRole;                      // Роль в предприятии

  // Даты
  invitedAt: string;                   // Когда пригласили
  joinedAt?: string;                   // Когда присоединился
  invitedBy: string;                   // Кто пригласил

  // Статус
  status: MembershipStatus;
}
```

### Роли пользователей
```typescript
type UserRole =
  | 'owner'        // Владелец предприятия (полный доступ)
  | 'admin'        // Администратор (управление пользователями)
  | 'accountant'   // Бухгалтер (документы, отчеты)
  | 'warehouse'    // Складовщик (товары, инвентаризация)
  | 'viewer';      // Просмотр (только чтение)
```

### Статусы членства
```typescript
type MembershipStatus =
  | 'invited'      // Приглашен, но не присоединился
  | 'active'       // Активный участник
  | 'inactive'     // Деактивирован
  | 'removed';     // Удален
```

## Период (Period)

### Описание
Учетный период (обычно месяц), в рамках которого ведется учет.

### Структура
```typescript
interface Period {
  id: string;
  enterpriseId: string;
  name: string;                        // "2026-01", "Q1-2026"
  startDate: string;                   // Дата начала (YYYY-MM-DD)
  endDate: string;                     // Дата окончания (YYYY-MM-DD)
  status: PeriodStatus;

  // Фиксированная конфигурация для детерминизма
  configVersionId: string;

  // Метаданные закрытия
  closedAt?: string;
  closedBy?: string;
}
```

### Статусы периода
```typescript
type PeriodStatus =
  | 'open'         // Открыт для операций
  | 'closing'      // В процессе закрытия
  | 'closed';      // Закрыт (неизменен)
```

### Связи
- **1:1** с `EnterpriseConfigVersion`
- **1:M** с `Document`
- **1:M** с `PostingLog`
- **1:M** с ledger записями

## Документ (Document)

### Описание
Первичная бизнес-сущность, представляющая факт хозяйственной деятельности.

### Структура
```typescript
interface Document {
  id: string;
  enterpriseId: string;
  periodId: string;                    // Период документа

  // Идентификация
  type: DocumentType;                  // Тип документа
  number?: string;                     // Номер документа
  date: string;                        // Дата документа

  // Стороны
  counterpartyId?: string;             // Контрагент

  // Финансы
  amount: MoneyAmount;                 // Сумма документа
  currency: string;                    // Валюта документа

  // Статус
  status: DocumentStatus;

  // Описание
  description?: string;
  tags?: string[];                     // Теги для поиска

  // Связи
  lines: DocumentLine[];                // Строки документа

  // Метаданные
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;

  // Внешние системы
  externalId?: string;                 // ID из внешней системы
}
```

### Типы документов
```typescript
type DocumentType =
  | 'purchase'      // Поступление товаров/услуг
  | 'sale'          // Продажа товаров/услуг
  | 'expense'       // Расход
  | 'income'        // Доход
  | 'transfer'      // Внутреннее перемещение
  | 'adjustment';   // Корректировка
```

### Статусы документов
```typescript
type DocumentStatus =
  | 'draft'         // Черновик (можно редактировать)
  | 'posted'        // Проведен (неизменен)
  | 'cancelled';    // Отменен
```

### Строка документа (DocumentLine)
```typescript
interface DocumentLine {
  id: string;
  documentId: string;

  // Товар/услуга
  productId?: string;                  // Ссылка на товар
  description: string;                 // Описание строки

  // Количественные данные
  quantity?: number;                   // Количество
  unit: string;                        // Единица измерения

  // Ценообразование
  unitPrice?: MoneyAmount;             // Цена за единицу
  amount: MoneyAmount;                 // Сумма по строке

  // Налоги
  taxRate?: number;                    // Ставка НДС (%)
  taxAmount?: MoneyAmount;             // Сумма НДС

  // Учет
  accountId?: string;                  // Счет учета
  inventoryPointId?: string;           // Точка учета (для склада)
}
```

## Товар (Product)

### Описание
Справочник товаров и услуг предприятия.

### Структура
```typescript
interface Product {
  id: string;
  enterpriseId: string;

  // Идентификация
  code: string;                        // Артикул/SKU
  name: string;                        // Название
  description?: string;                // Описание

  // Классификация
  categoryId?: string;                 // Категория товара
  type: ProductType;                   // Тип продукта

  // Единицы измерения
  unit: string;                        // шт, кг, л, м²

  // Ценообразование
  price: MoneyAmount;                  // Продажная цена
  costPrice?: MoneyAmount;             // Себестоимость

  // Учет
  inventoryTracking: boolean;          // Ведется количественный учет
  taxCategoryId?: string;              // Налоговая категория

  // Контроль остатков
  minStock?: number;                   // Минимальный остаток
  maxStock?: number;                   // Максимальный остаток

  // Статус
  isActive: boolean;

  // Метаданные
  createdAt: string;
  updatedAt: string;
}
```

### Типы продуктов
```typescript
type ProductType =
  | 'goods'        // Товары
  | 'services'     // Услуги
  | 'fixed_asset'; // Основные средства
```

## Контрагент (Counterparty)

### Описание
Клиенты, поставщики и другие контрагенты предприятия.

### Структура
```typescript
interface Counterparty {
  id: string;
  enterpriseId: string;

  // Идентификация
  type: CounterpartyType;              // Тип контрагента
  name: string;                        // Название
  code?: string;                       // Внутренний код

  // Налоговые данные
  taxId?: string;                      // ИНН/Налоговый ID
  vatNumber?: string;                  // НДС номер

  // Адрес
  address?: Address;

  // Контакты
  contactInfo?: ContactInfo;

  // Финансовые условия
  paymentTerms?: PaymentTerms;

  // Налоговый профиль
  taxProfile?: TaxProfile;

  // Статус
  isActive: boolean;

  // Метаданные
  createdAt: string;
  updatedAt: string;
}
```

### Типы контрагентов
```typescript
type CounterpartyType =
  | 'customer'     // Клиент
  | 'supplier'     // Поставщик
  | 'both';        // И клиент, и поставщик
```

### Адрес
```typescript
interface Address {
  country: string;                     // ISO код страны
  region?: string;                     // Регион/область
  city: string;                        // Город
  street: string;                      // Улица
  building: string;                    // Дом
  apartment?: string;                  // Квартира/офис
  postalCode?: string;                 // Почтовый индекс
}
```

### Контактная информация
```typescript
interface ContactInfo {
  email?: string;
  phone?: string;
  website?: string;
  fax?: string;
}
```

## Банковский счет (BankAccount)

### Описание
Банковские счета и карты предприятия.

### Структура
```typescript
interface BankAccount {
  id: string;
  enterpriseId: string;

  // Идентификация
  name: string;                        // Название счета
  accountNumber: string;               // Номер счета
  iban?: string;                       // IBAN

  // Банк
  bankName: string;
  bankCode?: string;                   // BIC/SWIFT

  // Валюта и баланс
  currency: string;                    // Валюта счета
  balance: MoneyAmount;                // Текущий баланс

  // Тип
  type: BankAccountType;

  // Статус
  isActive: boolean;

  // Метаданные
  createdAt: string;
  updatedAt: string;
}
```

### Типы счетов
```typescript
type BankAccountType =
  | 'checking'     // Расчетный счет
  | 'savings'      // Сберегательный счет
  | 'card';        // Карточный счет
```

## Общие типы данных

### Деньги (MoneyAmount)
```typescript
interface MoneyAmount {
  amount: number;                      // Сумма в минимальных единицах валюты
  currency: string;                   // ISO код валюты (UAH, USD, EUR)
}

// Примеры:
// 150.50 UAH = { amount: 15050, currency: "UAH" }
// 100.00 USD = { amount: 10000, currency: "USD" }
```

### Платежные условия (PaymentTerms)
```typescript
interface PaymentTerms {
  type: PaymentTermType;
  days?: number;                      // Количество дней
  description?: string;               // Описание условий
}

type PaymentTermType =
  | 'immediate'    // Немедленная оплата
  | 'net_days'     // Через N дней
  | 'end_of_month'; // Конец месяца
```

### Налоговый профиль (TaxProfile)
```typescript
interface TaxProfile {
  country: string;                    // Страна
  isVatPayer: boolean;                // Плательщик НДС
  vatNumber?: string;                 // НДС номер
  taxRegime: string;                  // Режим налогообложения
  defaultVatRate?: number;            // Ставка НДС по умолчанию
}
```

## Связи между сущностями

### Диаграмма связей
```
Enterprise (1)
├── Users (M) через EnterpriseMembership
├── Periods (M)
├── Documents (M)
├── Products (M)
├── Counterparties (M)
└── BankAccounts (M)

Period (1)
├── Documents (M)
├── PostingLogs (M)
└── Ledger Entries (M)

Document (1)
├── DocumentLines (M)
├── Counterparty (1)
└── Product (M) через DocumentLines

Product (1)
├── DocumentLines (M)
└── InventoryBalances (M)

BankAccount (1)
├── BankTransactions (M)
└── BankStatementImports (M)
```

## Идентификаторы и ключи

### Первичные ключи
- Все сущности используют `UUID` как первичный ключ
- Формат: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### Внешние ключи
- Ссылки на другие сущности через `{EntityName}Id`
- Пример: `enterpriseId`, `periodId`, `productId`

### Бизнес-идентификаторы
- `code` - внутренний код для удобства пользователей
- `externalId` - ID из внешних систем для интеграций
- `number` - номер документа для отчетности

## Временные метки

### Обязательные поля
```typescript
interface BaseEntity {
  createdAt: string;     // ISO 8601, UTC
  updatedAt: string;     // ISO 8601, UTC
  createdBy: string;     // UUID пользователя
  updatedBy?: string;    // UUID пользователя (при обновлении)
}
```

### Примеры значений
```json
{
  "createdAt": "2026-01-13T10:30:00.000Z",
  "updatedAt": "2026-01-13T14:45:30.000Z",
  "createdBy": "550e8400-e29b-41d4-a716-446655440000",
  "updatedBy": "550e8400-e29b-41d4-a716-446655440001"
}
```

## Мультивалютность

### Поддержка валют
- Каждое предприятие имеет `baseCurrency`
- Документы могут быть в любой валюте
- Хранение в минимальных единицах валюты
- Конвертация по курсам на дату операции

### Курсы валют
```typescript
interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;                       // Количество toCurrency за 1 fromCurrency
  date: string;                       // Дата курса
  source: string;                     // Источник (manual, ECB, NBU)
}
```