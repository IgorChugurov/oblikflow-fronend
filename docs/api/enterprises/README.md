# Документация API для Enterprises (Предприятия)

**Дата:** 2026-01-17  
**Версия:** 1.0.0  
**Статус:** ✅ Готово к использованию

---

## 📋 Содержание

1. [API_SPEC.md](./API_SPEC.md) - **Полная спецификация API**
   - Все эндпоинты для CRUD операций
   - Request/Response структуры
   - Headers и авторизация
   - Коды ошибок и edge cases

2. [TYPES.md](./TYPES.md) - **TypeScript типы**
   - Все интерфейсы и типы для работы с enterprises
   - DTOs для создания/обновления
   - Response wrappers
   - Error types

3. [EXAMPLES.md](./EXAMPLES.md) - **Примеры использования**
   - Примеры запросов (curl, fetch)
   - React Query hooks
   - Обработка ошибок
   - Типичные сценарии

4. [REACT_QUERY_GUIDE.md](./REACT_QUERY_GUIDE.md) - **React Query гайд** ⭐
   - Детальное руководство по React Query v5
   - Queries (GET запросы) - список, детали
   - Mutations (POST/PATCH/DELETE) - создание, обновление, удаление
   - Инвалидация кеша
   - Оптимистичные обновления
   - Полные примеры

5. [REFERENCE_DATA.md](./REFERENCE_DATA.md) - **Справочные данные**
   - API для locales, currencies, countries
   - TypeScript типы для справочников
   - Кеширование справочников

---

## 🚀 Быстрый старт

### Импорт типов

```typescript
import type {
  Enterprise,
  CreateEnterpriseDto,
  UpdateEnterpriseDto,
  EnterpriseListResponse
} from '@/shared/types/enterprises';
```

### Базовый пример

```typescript
import { useEnterprises } from '@/hooks/useEnterprises';

function EnterprisesPage() {
  const { data, isLoading } = useEnterprises();
  
  if (isLoading) return <Spinner />;
  
  return (
    <div>
      {data?.data.map(enterprise => (
        <EnterpriseCard key={enterprise.id} enterprise={enterprise} />
      ))}
    </div>
  );
}
```

---

## 🔗 Связанные документы

### Backend документация
- [API_CONTRACT.md](../../../oblikflow-backend/docs/FRONTEND/API_CONTRACT.md) - Полный контракт фронтенд-бэкенд
- [BACKEND_API_SPEC.md](../../../oblikflow-backend/docs/FRONTEND/BACKEND_API_SPEC.md) - Спецификация для бэкенда
- [OpenAPI Spec](../../../oblikflow-backend/docs/api-specifications/openapi/openapi-v1.yaml) - OpenAPI v3 спецификация

### Frontend документация
- [AUTH](../../auth/README.md) - Документация по авторизации
- [API_OVERVIEW.md](../API_OVERVIEW.md) - Общий обзор API архитектуры
- [DATA_STRUCTURES.md](../DATA_STRUCTURES.md) - Все структуры данных

---

## 📝 Основные сущности

### Enterprise (Предприятие)
Главная сущность для multi-tenancy. Каждый пользователь может:
- Быть owner (владельцем) нескольких enterprises
- Быть admin в enterprises других пользователей
- Создавать неограниченное количество enterprises (на Этапе 1)

### Member (Участник)
Пользователь, имеющий доступ к enterprise. Роли:
- `owner` - владелец (создатель предприятия)
- `admin` - администратор (приглашенный owner'ом)

---

## 🎯 CRUD операции

| Операция | Endpoint | Метод | Описание |
|----------|----------|-------|----------|
| **Список** | `/api/enterprises` | GET | Получить все enterprises пользователя |
| **Создание** | `/api/enterprises` | POST | Создать новое enterprise |
| **Детали** | `/api/enterprises/:id` | GET | Получить детали enterprise |
| **Обновление** | `/api/enterprises/:id` | PATCH | Обновить настройки enterprise |
| **Участники** | `/api/enterprises/:id/members` | GET | Получить список участников |
| **Добавить участника** | `/api/enterprises/:id/members` | POST | Пригласить admin |
| **Удалить участника** | `/api/enterprises/:id/members/:userId` | DELETE | Удалить admin |

---

## 🔐 Авторизация

Все запросы требуют JWT токен от Supabase:

```typescript
headers: {
  'Authorization': `Bearer ${supabaseToken}`,
  'Content-Type': 'application/json'
}
```

Подробнее: [AUTH документация](../../auth/README.md)

---

## 🌍 Справочные данные

Для форм создания/редактирования нужны справочники:

- **Локали** (языки интерфейса): `GET /api/locales`
- **Валюты** (ISO 4217): `GET /api/currencies`
- **Страны** (ISO 3166-1): `GET /api/countries`

Эти эндпоинты **публичные** (не требуют авторизации).

Подробнее: [REFERENCE_DATA.md](./REFERENCE_DATA.md)

---

## 📦 Готовые компоненты

### Shared типы
Расположение: `/shared/types/enterprises.ts`

### Hooks (см. [REACT_QUERY_GUIDE.md](./REACT_QUERY_GUIDE.md))
- `useEnterprises()` - список enterprises
- `useEnterprise(id)` - детали enterprise
- `useCreateEnterprise()` - создание
- `useUpdateEnterprise(id)` - обновление
- `useMembers(enterpriseId)` - список участников
- `useAddMember(enterpriseId)` - добавить участника
- `useRemoveMember(enterpriseId)` - удалить участника
- `useLocales()`, `useCurrencies()`, `useCountries()` - справочники

### Компоненты (планируется)
- `EnterpriseList` - список enterprises
- `EnterpriseForm` - форма создания/редактирования
- `EnterpriseSwitcher` - переключатель между enterprises

---

## ❓ Часто задаваемые вопросы

### Где брать JWT токен?
Из Supabase session:
```typescript
const { data: { session } } = await supabase.auth.getSession();
const jwt = session?.access_token;
```

### Как определить текущее enterprise?
Из cookie `current_enterprise_id` (устанавливается middleware).

### Можно ли изменить owner?
Нет, в текущей версии (Этап 1) изменение owner не поддерживается.

### Как обрабатывать ошибки?
Все ошибки возвращаются в стандартном формате. См. [EXAMPLES.md](./EXAMPLES.md)

---

**Версия:** 1.0.0  
**Обновлено:** 2026-01-17
