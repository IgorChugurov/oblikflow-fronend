# API архитектура OblikFlow

## Обзор

OblikFlow использует REST API с JSON для коммуникации между фронтендом и бэкендом. API построен на принципах RESTful дизайна с использованием HTTP методов и статус кодов.

## Базовая структура URL

```
https://api.oblikflow.com/v1/{enterpriseId}/{resource}
```

**Примеры:**

- `GET /v1/123/documents` - список документов предприятия 123
- `POST /v1/123/documents` - создание документа
- `GET /v1/123/documents/456` - получение документа 456

## Аутентификация

### JWT токены

- Используется Supabase Auth для аутентификации
- JWT токен передается в `Authorization: Bearer {token}` header
- Токен содержит `user_id` и метаданные пользователя

### Мультиарендность

- `enterpriseId` передается в URL path
- Проверка прав доступа происходит на каждом запросе
- Пользователь может иметь доступ к нескольким предприятиям

## HTTP методы

| Метод  | Назначение           | Пример                  |
| ------ | -------------------- | ----------------------- |
| GET    | Получение данных     | `GET /documents`        |
| POST   | Создание сущности    | `POST /documents`       |
| PUT    | Обновление сущности  | `PUT /documents/123`    |
| PATCH  | Частичное обновление | `PATCH /documents/123`  |
| DELETE | Удаление сущности    | `DELETE /documents/123` |

## Статус коды

### Успешные операции

- `200 OK` - Успешное получение/обновление
- `201 Created` - Успешное создание
- `204 No Content` - Успешное удаление

### Ошибки клиента

- `400 Bad Request` - Неверные данные запроса
- `401 Unauthorized` - Не авторизован
- `403 Forbidden` - Нет прав доступа
- `404 Not Found` - Ресурс не найден
- `409 Conflict` - Конфликт (например, идемпотентный ключ)
- `422 Unprocessable Entity` - Валидационная ошибка

### Ошибки сервера

- `500 Internal Server Error` - Внутренняя ошибка

## Структура ответов

### Успешный ответ

```json
{
  "data": {
    /* payload */
  },
  "meta": {
    "timestamp": "2026-01-13T10:00:00Z",
    "requestId": "req-123"
  }
}
```

### Ошибка

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Document validation failed",
    "details": {
      "field": "amount",
      "reason": "Must be positive"
    }
  },
  "meta": {
    "timestamp": "2026-01-13T10:00:00Z",
    "requestId": "req-123"
  }
}
```

## Пагинация

### Структура

```json
{
  "data": [
    /* items */
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1250,
      "totalPages": 25,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Параметры запроса

- `page` - номер страницы (начиная с 1)
- `limit` - количество элементов на странице (макс 100)
- `sort` - сортировка (например, `created_at:desc`)

## Фильтрация и поиск

### Простые фильтры

```
GET /documents?status=posted&date_from=2026-01-01
```

### Расширенные фильтры

```
GET /documents?filter[status]=posted&filter[amount][gte]=1000
```

### Поиск

```
GET /documents?search=invoice
```

## Идемпотентность

### Идемпотентные операции

Критичные операции поддерживают идемпотентность через `Idempotency-Key` header:

```http
POST /documents
Idempotency-Key: user-123-doc-456
Content-Type: application/json

{
  "type": "purchase",
  "amount": 1000
}
```

### Повторный запрос

Если запрос с тем же ключом уже обработан:

- `409 Conflict` с ссылкой на существующий ресурс
- Или `200 OK` с существующим результатом

## Preview операции

### Контракт

Все критичные операции поддерживают preview режим:

```http
POST /documents/preview
Content-Type: application/json

{
  "type": "purchase",
  "amount": 1000,
  "lines": [...]
}
```

### Ответ preview

```json
{
  "data": {
    "effects": [
      {
        "type": "inventory_movement",
        "description": "+10 items to warehouse",
        "amount": 1000
      },
      {
        "type": "gl_entry",
        "description": "Debit: Inventory, Credit: Accounts Payable",
        "amount": 1000
      }
    ],
    "warnings": ["Tax rate not set for this counterparty"]
  }
}
```

## Асинхронные операции

### Длительные операции

Некоторые операции выполняются асинхронно:

```json
{
  "data": {
    "jobId": "job-123",
    "status": "pending",
    "estimatedDuration": 30
  }
}
```

### Проверка статуса

```http
GET /jobs/job-123
```

```json
{
  "data": {
    "jobId": "job-123",
    "status": "completed",
    "result": {
      /* результат операции */
    },
    "progress": {
      "current": 100,
      "total": 100,
      "message": "Import completed"
    }
  }
}
```

## Валидация данных

### Frontend валидация

- Использовать JSON Schema для клиентской валидации
- Синхронизировать схемы с бэкендом
- Показывать ошибки валидации до отправки

### Backend валидация

- Полная валидация на сервере
- Детальные сообщения об ошибках
- Возврат валидационных ошибок в структурированном формате

## Кеширование

### HTTP кеширование

- Использовать `ETag` и `Last-Modified` headers
- Кешировать справочники (products, counterparties)
- Инвалидировать кеш при изменениях

### Client-side кеширование

- Кешировать часто используемые данные
- Использовать React Query или аналог
- Обновлять кеш при mutations

## Rate limiting

### Ограничения

- 1000 запросов в минуту для обычных операций
- 100 запросов в минуту для критичных операций
- 10 запросов в минуту для массовых операций

### Заголовки ответа

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1640995200
```

## Versioning

### API versioning

- Версия в URL path: `/v1/`
- Breaking changes → новая версия
- Backward compatible changes → та же версия

### Schema versioning

- Сущности имеют версии схем
- Frontend должен поддерживать несколько версий
- Migration path для обновлений

## Безопасность

### CORS

- Настроен для разрешенных origins
- Только необходимые HTTP методы
- Credentials включены

### Content Security Policy

- Защита от XSS
- Ограничение источников ресурсов
- Report-only режим для development

### Data sanitization

- Все входные данные sanitизируются
- SQL injection protection
- XSS protection
