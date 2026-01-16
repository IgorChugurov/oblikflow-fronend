# 🌍 Локализация в OblikFlow

**Дата:** 2026-01-14  
**Версия:** 1.0.0

---

## 📋 Обзор

OblikFlow поддерживает **8 языков** интерфейса с использованием стандарта **ISO 639-1**.

### Поддерживаемые языки:

| Код  | Язык        | Название (native) |
| ---- | ----------- | ----------------- |
| `uk` | Украинский  | Українська        |
| `en` | Английский  | English           |
| `pl` | Польский    | Polski            |
| `ru` | Русский     | Русский           |
| `de` | Немецкий    | Deutsch           |
| `fr` | Французский | Français          |
| `sk` | Словацкий   | Slovenčina        |
| `es` | Испанский   | Español           |

---

## 🎯 Архитектура локализации

### Два уровня выбора языка:

```
┌─────────────────────────────────────┐
│  Public Pages (Landing, Login)      │
│  ➜ Cookie (locale)                  │
│  ➜ Browser language                 │
│  ➜ DEFAULT_LOCALE (.env)            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Workspace (Internal Pages)         │
│  ➜ Enterprise.default_locale        │
│  ➜ DEFAULT_LOCALE (.env)            │
│  ➜ Hardcoded fallback (uk)          │
└─────────────────────────────────────┘
```

---

## 🗄️ База данных

### Таблица `locales`

```sql
CREATE TABLE locales (
  code VARCHAR(5) PRIMARY KEY,           -- ISO 639-1: uk, en, pl...
  name_native VARCHAR(50) NOT NULL,      -- Українська, English
  name_en VARCHAR(50) NOT NULL,          -- Ukrainian, English
  is_active BOOLEAN DEFAULT TRUE,        -- Доступен для выбора
  created_at timestamptz DEFAULT now()
);
```

### Таблица `enterprises`

```sql
ALTER TABLE enterprises
ADD COLUMN default_locale VARCHAR(10) DEFAULT NULL;

-- Constraint: только валидные ISO 639-1 коды
CHECK (default_locale ~ '^[a-z]{2}$' OR default_locale IS NULL)

-- Foreign Key к справочнику
FOREIGN KEY (default_locale) REFERENCES locales(code)
```

**Важно:** `default_locale` может быть `NULL` - в этом случае используется `DEFAULT_LOCALE` из `.env`.

---

## 🔧 Environment Variables

### `.env` или `.env.local`:

```bash
# Язык по умолчанию для workspace (если default_locale = NULL)
DEFAULT_LOCALE=uk

# Fallback язык (если DEFAULT_LOCALE недоступен)
FALLBACK_LOCALE=en
```

---

## 🌐 API

### 1. **GET /api/locales** (публичный endpoint)

Получить список всех поддерживаемых языков.

**Не требует авторизации!**

**Response:**

```json
{
  "data": [
    {
      "code": "uk",
      "name_native": "Українська",
      "name_en": "Ukrainian",
      "is_active": true
    },
    {
      "code": "en",
      "name_native": "English",
      "name_en": "English",
      "is_active": true
    }
    // ... другие языки
  ]
}
```

**Использование:**

- Заполнить `<select>` для выбора языка
- Отобразить названия языков на родном языке пользователя

---

### 2. **Enterprise API**

#### GET /api/enterprises

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "ФОП Іванов",
      "country_code": "UA",
      "default_currency": "UAH",
      "default_locale": "uk",  // ← Язык предприятия
      "status": "active",
      ...
    }
  ]
}
```

#### POST /api/enterprises

**Request:**

```json
{
  "name": "ФОП Іванов",
  "country_code": "UA",
  "default_currency": "UAH",
  "default_locale": "uk" // ← Опционально
}
```

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "name": "ФОП Іванов",
    "default_locale": "uk",
    ...
  }
}
```

#### PATCH /api/enterprises/:id

**Request:**

```json
{
  "default_locale": "en" // Изменить язык workspace
}
```

---

## 💻 Frontend Integration

### Cookie для Public Pages

```typescript
// Сохранить выбранный язык в cookie
document.cookie = `locale=uk; path=/; max-age=31536000`; // 1 год

// Прочитать
function getCookieLocale(): string | null {
  const match = document.cookie.match(/locale=([a-z]{2})/);
  return match ? match[1] : null;
}
```

---

### Логика выбора языка на фронтенде

```typescript
import { useRouter } from "next/router";
import { useEnterprise } from "@/hooks/useEnterprise";
import Cookies from "js-cookie";

function getCurrentLocale(): string {
  const router = useRouter();
  const { enterprise } = useEnterprise();

  // 1. Workspace pages → язык предприятия
  if (router.pathname.startsWith("/workspace")) {
    return (
      enterprise?.default_locale ||
      process.env.NEXT_PUBLIC_DEFAULT_LOCALE ||
      "uk"
    );
  }

  // 2. Public pages → cookie или browser
  const cookieLocale = Cookies.get("locale");
  if (cookieLocale) return cookieLocale;

  const browserLocale = navigator.language.split("-")[0]; // en-US → en
  if (SUPPORTED_LOCALES.includes(browserLocale)) {
    return browserLocale;
  }

  // 3. Fallback
  return process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "uk";
}
```

---

### Селект выбора языка

```typescript
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

function LanguageSelector() {
  const [locales, setLocales] = useState([]);
  const [currentLocale, setCurrentLocale] = useState(getCurrentLocale());

  useEffect(() => {
    // Загрузить список языков из API
    fetch("/api/locales")
      .then((res) => res.json())
      .then((data) => setLocales(data.data));
  }, []);

  const handleChange = (newLocale: string) => {
    // Сохранить в cookie
    Cookies.set("locale", newLocale, { expires: 365 });

    // Перезагрузить страницу или обновить i18n
    window.location.reload();
  };

  return (
    <select
      value={currentLocale}
      onChange={(e) => handleChange(e.target.value)}
    >
      {locales.map((locale) => (
        <option key={locale.code} value={locale.code}>
          {locale.name_native}
        </option>
      ))}
    </select>
  );
}
```

---

## 🎨 i18n библиотеки

### Next.js + i18next

```bash
npm install next-i18next i18next react-i18next
```

**Структура переводов:**

```
public/
  locales/
    uk/
      common.json
      workspace.json
    en/
      common.json
      workspace.json
    pl/
      common.json
      workspace.json
    ...
```

**Пример `uk/common.json`:**

```json
{
  "welcome": "Ласкаво просимо",
  "login": "Увійти",
  "signup": "Зареєструватися",
  "enterprise": {
    "create": "Створити підприємство",
    "settings": "Налаштування"
  }
}
```

---

## 🔄 Workflow

### 1. Регистрация / Login (Public Pages)

```
User visits landing page
  ↓
Check cookie locale → Set i18n
  ↓
No cookie? → Use browser language or DEFAULT_LOCALE
  ↓
Show language selector
  ↓
User selects "Українська" → Save to cookie → Reload
```

### 2. Workspace (после входа)

```
User enters workspace
  ↓
Fetch enterprise data (GET /api/enterprises/:id)
  ↓
enterprise.default_locale = "uk" → Set i18n to "uk"
  ↓
Ignore cookie! Use enterprise locale
  ↓
Owner can change via Settings → PATCH /api/enterprises/:id { default_locale: "en" }
```

---

## ✅ Validation

### Backend (NestJS)

```typescript
import { IsString, Matches, IsOptional } from "class-validator";

export class CreateEnterpriseDto {
  @IsString()
  @Matches(/^[a-z]{2}$/, { message: "default_locale must be ISO 639-1 code" })
  @IsOptional()
  default_locale?: string;
}
```

### Database CHECK constraint

```sql
CHECK (default_locale ~ '^[a-z]{2}$' OR default_locale IS NULL)
```

---

## 🧪 Тестовые сценарии

### 1. Public page без cookie

**Expected:** Язык = browser language или DEFAULT_LOCALE

### 2. Public page с cookie `locale=pl`

**Expected:** Язык = pl (Polish)

### 3. Workspace с `default_locale = "uk"`

**Expected:** Язык = uk, cookie игнорируется

### 4. Workspace с `default_locale = NULL`

**Expected:** Язык = DEFAULT_LOCALE из .env (uk)

### 5. Изменить язык предприятия

**Request:** `PATCH /api/enterprises/:id { default_locale: "de" }`  
**Expected:** Workspace перезагружается с немецким интерфейсом

---

## 📚 Связанные документы

- [OpenAPI Specification](../docs/api-specifications/openapi/openapi-v1.yaml)
- [Database Schema](../database/migrations/000_init_schema.sql)
- [Frontend API Contract](../docs/FRONTEND/API_CONTRACT.md)

---

## 🚀 Roadmap

- ✅ **v1.0:** ISO 639-1 коды (uk, en, pl, ru, de, fr, sk, es)
- ⬜ **v1.1:** BCP 47 для региональных вариантов (en-US, en-GB)
- ⬜ **v1.2:** Формат даты/времени по региону
- ⬜ **v1.3:** Формат чисел/валют по региону

---

**Версия:** 1.0.0  
**Дата:** 2026-01-14  
**Статус:** ✅ Implemented
