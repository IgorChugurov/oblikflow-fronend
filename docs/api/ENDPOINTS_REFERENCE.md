# Справочник API эндпоинтов

> **Примечание:** Этот документ описывает планируемые API эндпоинты. Реальная реализация может отличаться. Все эндпоинты имеют префикс `/v1/{enterpriseId}`.

## Аутентификация

### Текущий пользователь
```http
GET /auth/me
```
**Ответ:**
```json
{
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "enterprises": [
      {
        "id": "ent-123",
        "name": "My Company",
        "role": "owner"
      }
    ]
  }
}
```

### Смена предприятия
```http
POST /auth/switch-enterprise
Content-Type: application/json

{
  "enterpriseId": "ent-456"
}
```

## Документы

### Список документов
```http
GET /documents?page=1&limit=50&status=posted&date_from=2026-01-01
```

**Параметры:**
- `page`, `limit` - пагинация
- `status` - фильтр по статусу
- `type` - тип документа
- `date_from`, `date_to` - диапазон дат
- `counterparty_id` - контрагент
- `search` - текстовый поиск

### Создание документа
```http
POST /documents
Content-Type: application/json

{
  "type": "purchase",
  "date": "2026-01-13",
  "counterpartyId": "ctr-123",
  "lines": [
    {
      "productId": "prod-456",
      "quantity": 10,
      "unitPrice": { "amount": 10000, "currency": "UAH" }
    }
  ]
}
```

### Получение документа
```http
GET /documents/{id}
```

### Обновление документа
```http
PUT /documents/{id}
```
> Только для черновиков

### Проведение документа
```http
POST /documents/{id}/post
```

### Preview проведения
```http
POST /documents/{id}/preview
```

### Отмена документа
```http
POST /documents/{id}/cancel
```

## Товары

### Список товаров
```http
GET /products?page=1&limit=50&category_id=cat-123&search=laptop
```

### Создание товара
```http
POST /products
Content-Type: application/json

{
  "code": "LPT-001",
  "name": "Laptop",
  "unit": "шт",
  "price": { "amount": 150000, "currency": "UAH" },
  "inventoryTracking": true
}
```

### Остатки товаров
```http
GET /products/{id}/balance
```
**Ответ:**
```json
{
  "data": {
    "productId": "prod-123",
    "balances": [
      {
        "inventoryPointId": "inv-1",
        "available": 50,
        "reserved": 10,
        "onHand": 60
      }
    ]
  }
}
```

## Контрагенты

### Список контрагентов
```http
GET /counterparties?page=1&limit=50&type=supplier&search=apple
```

### Создание контрагента
```http
POST /counterparties
Content-Type: application/json

{
  "type": "supplier",
  "name": "Apple Inc.",
  "taxId": "123456789",
  "address": {
    "country": "US",
    "city": "Cupertino"
  }
}
```

## Банк

### Список счетов
```http
GET /bank-accounts
```

### Импорт выписки
```http
POST /bank-accounts/{id}/import-statement
Content-Type: multipart/form-data

file: statement.csv
```

### Список транзакций
```http
GET /bank-transactions?page=1&limit=50&status=unallocated&date_from=2026-01-01
```

### Распределение транзакции
```http
POST /bank-transactions/{id}/allocate
Content-Type: application/json

{
  "allocations": [
    {
      "documentId": "doc-123",
      "amount": { "amount": 50000, "currency": "UAH" }
    }
  ]
}
```

## Склад

### Точки учета
```http
GET /inventory-points
```

### Резервы
```http
GET /reservations?page=1&limit=50&status=active
```

### Создание резерва
```http
POST /reservations
Content-Type: application/json

{
  "productId": "prod-123",
  "inventoryPointId": "inv-1",
  "quantity": 5,
  "reason": "Order #123"
}
```

### Инвентаризация

#### Создание сессии
```http
POST /inventory-sessions
Content-Type: application/json

{
  "inventoryPointId": "inv-1",
  "name": "Monthly count"
}
```

#### Получение подсчета
```http
GET /inventory-sessions/{id}/counts
```

#### Добавление подсчета
```http
POST /inventory-sessions/{id}/counts
Content-Type: application/json

{
  "productId": "prod-123",
  "countedQuantity": 45
}
```

#### Подтверждение инвентаризации
```http
POST /inventory-sessions/{id}/confirm
```

## Финансы

### Баланс
```http
GET /financial/balance?period_id=period-123
```

### Отчет о прибылях и убытках
```http
GET /financial/pnl?period_id=period-123
```

### Проводки
```http
GET /financial/ledger?page=1&limit=50&account_id=acc-123&period_id=period-123
```

### Периоды
```http
GET /periods
```

### Закрытие периода
```http
POST /periods/{id}/close
```

## Регулярные операции

### Шаблоны
```http
GET /recurring-templates
```

### Создание шаблона
```http
POST /recurring-templates
Content-Type: application/json

{
  "name": "Monthly depreciation",
  "type": "depreciation",
  "schedule": "monthly",
  "rules": [...]
}
```

### Запуск операции
```http
POST /recurring-templates/{id}/run
```

### Preview запуска
```http
POST /recurring-templates/{id}/preview
```

## Настройки предприятия

### Конфигурация
```http
GET /settings/config
```

### Обновление конфигурации
```http
PUT /settings/config
Content-Type: application/json

{
  "enabledModules": ["bank", "inventory"],
  "taxProfile": { ... }
}
```

## Пользователи

### Участники предприятия
```http
GET /members
```

### Приглашение пользователя
```http
POST /members/invite
Content-Type: application/json

{
  "email": "newuser@example.com",
  "role": "accountant"
}
```

## Асинхронные операции

### Статус операции
```http
GET /jobs/{jobId}
```

### Отмена операции
```http
POST /jobs/{jobId}/cancel
```

## Справочники

### Валюты
```http
GET /references/currencies
```

### Страны
```http
GET /references/countries
```

### Налоговые ставки
```http
GET /references/tax-rates?country=UA
```

### Типы документов
```http
GET /references/document-types
```

## Webhooks (для интеграций)

### Регистрация webhook
```http
POST /webhooks
Content-Type: application/json

{
  "url": "https://example.com/webhook",
  "events": ["document.posted", "period.closed"]
}
```

## Экспорт данных

### Экспорт в Excel
```http
GET /export/documents.xlsx?date_from=2026-01-01&date_to=2026-01-31
```

### Экспорт в PDF
```http
GET /export/invoice-{id}.pdf
```

## Rate Limiting Headers

Все ответы включают заголовки rate limiting:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1640995200
```

## Version Headers

```http
X-API-Version: v1
X-Schema-Version: 1.0
```