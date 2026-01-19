# Reference Data API - Справочники

**Дата:** 2026-01-17  
**Версия:** 1.0.0

---

## Обзор

Для форм создания и редактирования enterprises необходимы справочные данные:
- **Locales** (языки интерфейса) - 8 локалей
- **Currencies** (валюты) - 31 валюта
- **Countries** (страны) - 58 стран

**Важно:** Все эти endpoints **публичные** (не требуют JWT авторизации).

---

## Содержание

1. [GET /api/locales](#get-apilocales)
2. [GET /api/currencies](#get-apicurrencies)
3. [GET /api/countries](#get-apicountries)
4. [TypeScript типы](#typescript-типы)
5. [Кеширование](#кеширование)
6. [Примеры использования](#примеры-использования)

---

## GET /api/locales

**Получить список поддерживаемых языков интерфейса**

### Request

```http
GET /api/locales HTTP/1.1
Host: api.oblikflow.com
```

**Авторизация:** ❌ Не требуется

### Response 200 OK

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
    },
    {
      "code": "pl",
      "name_native": "Polski",
      "name_en": "Polish",
      "is_active": true
    },
    {
      "code": "ru",
      "name_native": "Русский",
      "name_en": "Russian",
      "is_active": true
    },
    {
      "code": "de",
      "name_native": "Deutsch",
      "name_en": "German",
      "is_active": true
    },
    {
      "code": "fr",
      "name_native": "Français",
      "name_en": "French",
      "is_active": true
    },
    {
      "code": "sk",
      "name_native": "Slovenčina",
      "name_en": "Slovak",
      "is_active": true
    },
    {
      "code": "es",
      "name_native": "Español",
      "name_en": "Spanish",
      "is_active": true
    }
  ]
}
```

### Поля Locale

| Поле | Тип | Описание |
|------|-----|----------|
| `code` | `string` | Код языка (ISO 639-1, 2 символа) |
| `name_native` | `string` | Название на родном языке |
| `name_en` | `string` | Название на английском |
| `is_active` | `boolean` | Активен ли язык |

### TypeScript

```typescript
import type { LocaleListResponse } from '@/shared/types/enterprises';

async function getLocales(): Promise<LocaleListResponse> {
  const response = await fetch(`${API_URL}/api/locales`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch locales');
  }
  
  return response.json();
}
```

---

## GET /api/currencies

**Получить список валют**

### Request

```http
GET /api/currencies HTTP/1.1
Host: api.oblikflow.com
```

**Авторизация:** ❌ Не требуется

### Response 200 OK

```json
{
  "data": [
    {
      "code": "UAH",
      "symbol": "₴",
      "name_en": "Ukrainian Hryvnia",
      "name_native": "Гривня",
      "decimal_places": 2,
      "is_active": true
    },
    {
      "code": "EUR",
      "symbol": "€",
      "name_en": "Euro",
      "name_native": "Euro",
      "decimal_places": 2,
      "is_active": true
    },
    {
      "code": "USD",
      "symbol": "$",
      "name_en": "US Dollar",
      "name_native": "Dollar",
      "decimal_places": 2,
      "is_active": true
    },
    {
      "code": "PLN",
      "symbol": "zł",
      "name_en": "Polish Zloty",
      "name_native": "Złoty",
      "decimal_places": 2,
      "is_active": true
    }
    // ... еще 27 валют
  ]
}
```

### Поля Currency

| Поле | Тип | Описание |
|------|-----|----------|
| `code` | `string` | Код валюты (ISO 4217, 3 символа) |
| `symbol` | `string` | Символ валюты (₴, €, $) |
| `name_en` | `string` | Название на английском |
| `name_native` | `string` | Название на родном языке |
| `decimal_places` | `number` | Количество знаков после запятой (обычно 2, для JPY = 0) |
| `is_active` | `boolean` | Активна ли валюта |

### Полный список валют (31 шт)

- **Европа:** EUR, UAH, PLN, CZK, RON, BGN, HUF, GBP, CHF, SEK, DKK, NOK
- **Америка:** USD, CAD, MXN, BRL, ARS, CLP
- **Азия:** CNY, JPY, INR, KRW, SGD, THB, VND, IDR, MYR
- **Другие:** AUD, NZD, ZAR, TRY, ILS, AED

### TypeScript

```typescript
import type { CurrencyListResponse } from '@/shared/types/enterprises';

async function getCurrencies(): Promise<CurrencyListResponse> {
  const response = await fetch(`${API_URL}/api/currencies`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch currencies');
  }
  
  return response.json();
}
```

---

## GET /api/countries

**Получить список стран**

### Request

```http
GET /api/countries HTTP/1.1
Host: api.oblikflow.com
```

**Авторизация:** ❌ Не требуется

### Response 200 OK

```json
{
  "data": [
    {
      "code": "UA",
      "code_alpha3": "UKR",
      "name_en": "Ukraine",
      "name_native": "Україна",
      "default_currency": "UAH",
      "phone_code": "+380",
      "is_active": true
    },
    {
      "code": "PL",
      "code_alpha3": "POL",
      "name_en": "Poland",
      "name_native": "Polska",
      "default_currency": "PLN",
      "phone_code": "+48",
      "is_active": true
    },
    {
      "code": "DE",
      "code_alpha3": "DEU",
      "name_en": "Germany",
      "name_native": "Deutschland",
      "default_currency": "EUR",
      "phone_code": "+49",
      "is_active": true
    }
    // ... еще 55 стран
  ]
}
```

### Поля Country

| Поле | Тип | Описание |
|------|-----|----------|
| `code` | `string` | Код страны (ISO 3166-1 alpha-2, 2 символа) |
| `code_alpha3` | `string` | Код страны (ISO 3166-1 alpha-3, 3 символа) |
| `name_en` | `string` | Название на английском |
| `name_native` | `string` | Название на родном языке |
| `default_currency` | `string` | Валюта по умолчанию (ISO 4217) |
| `phone_code` | `string` | Телефонный код (+380, +48) |
| `is_active` | `boolean` | Активна ли страна |

### Список стран (58 шт)

**Европа:** UA, PL, DE, FR, GB, IT, ES, NL, BE, AT, CH, CZ, SK, RO, BG, HU, GR, PT, SE, DK, NO, FI, IE, HR, SI, LT, LV, EE, CY, MT, LU

**Америка:** US, CA, MX, BR, AR, CL, CO, PE, VE

**Азия:** CN, JP, IN, KR, SG, TH, VN, ID, MY, PH, IL, AE, SA

**Другие:** AU, NZ, ZA, TR

### TypeScript

```typescript
import type { CountryListResponse } from '@/shared/types/enterprises';

async function getCountries(): Promise<CountryListResponse> {
  const response = await fetch(`${API_URL}/api/countries`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch countries');
  }
  
  return response.json();
}
```

---

## TypeScript типы

### Locale

```typescript
interface Locale {
  code: string;
  name_native: string;
  name_en: string;
  is_active: boolean;
}
```

### Currency

```typescript
interface Currency {
  code: string;
  symbol: string;
  name_en: string;
  name_native?: string;
  decimal_places: number;
  is_active: boolean;
}
```

### Country

```typescript
interface Country {
  code: string;
  code_alpha3?: string;
  name_en: string;
  name_native?: string;
  default_currency?: string;
  phone_code?: string;
  is_active: boolean;
}
```

### Response Types

```typescript
type LocaleListResponse = ApiResponse<Locale[]>;
type CurrencyListResponse = ApiResponse<Currency[]>;
type CountryListResponse = ApiResponse<Country[]>;
```

---

## Кеширование

### React Query

Справочники редко меняются, поэтому их можно агрессивно кешировать:

```typescript
import { useQuery } from '@tanstack/react-query';

// Locales
function useLocales() {
  return useQuery({
    queryKey: ['locales'],
    queryFn: getLocales,
    staleTime: 1000 * 60 * 60 * 24, // 24 часа
    cacheTime: 1000 * 60 * 60 * 24 * 7, // 7 дней
  });
}

// Currencies
function useCurrencies() {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: getCurrencies,
    staleTime: 1000 * 60 * 60 * 24, // 24 часа
    cacheTime: 1000 * 60 * 60 * 24 * 7, // 7 дней
  });
}

// Countries
function useCountries() {
  return useQuery({
    queryKey: ['countries'],
    queryFn: getCountries,
    staleTime: 1000 * 60 * 60 * 24, // 24 часа
    cacheTime: 1000 * 60 * 60 * 24 * 7, // 7 дней
  });
}
```

### LocalStorage кеширование

Для еще более агрессивного кеширования можно использовать localStorage:

```typescript
const CACHE_KEY = 'oblikflow_reference_data';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 часа

interface CachedReferenceData {
  locales: Locale[];
  currencies: Currency[];
  countries: Country[];
  timestamp: number;
}

async function getReferenceData(): Promise<CachedReferenceData> {
  // Проверить кеш
  const cached = localStorage.getItem(CACHE_KEY);
  
  if (cached) {
    const data = JSON.parse(cached) as CachedReferenceData;
    const age = Date.now() - data.timestamp;
    
    if (age < CACHE_TTL) {
      return data;
    }
  }
  
  // Загрузить с сервера
  const [locales, currencies, countries] = await Promise.all([
    getLocales(),
    getCurrencies(),
    getCountries(),
  ]);
  
  const data: CachedReferenceData = {
    locales: locales.data,
    currencies: currencies.data,
    countries: countries.data,
    timestamp: Date.now(),
  };
  
  // Сохранить в кеш
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  
  return data;
}
```

---

## Примеры использования

### В форме создания Enterprise

```typescript
import { useLocales, useCurrencies, useCountries } from '@/hooks/useReferenceData';

function CreateEnterpriseForm() {
  const { data: locales, isLoading: localesLoading } = useLocales();
  const { data: currencies, isLoading: currenciesLoading } = useCurrencies();
  const { data: countries, isLoading: countriesLoading } = useCountries();
  
  const isLoading = localesLoading || currenciesLoading || countriesLoading;
  
  if (isLoading) {
    return <Spinner />;
  }
  
  return (
    <Form>
      <Select name="default_locale" label="Language">
        {locales?.data.map(locale => (
          <option key={locale.code} value={locale.code}>
            {locale.name_native} ({locale.name_en})
          </option>
        ))}
      </Select>
      
      <Select name="default_currency" label="Currency">
        {currencies?.data.map(currency => (
          <option key={currency.code} value={currency.code}>
            {currency.symbol} {currency.name_en} ({currency.code})
          </option>
        ))}
      </Select>
      
      <Select name="country_code" label="Country">
        {countries?.data.map(country => (
          <option key={country.code} value={country.code}>
            {country.name_en} ({country.code})
          </option>
        ))}
      </Select>
    </Form>
  );
}
```

### С группировкой валют

```typescript
function CurrencySelect() {
  const { data: currencies } = useCurrencies();
  
  // Группировка по популярности
  const popularCurrencies = currencies?.data.filter(c => 
    ['UAH', 'EUR', 'USD', 'PLN', 'GBP'].includes(c.code)
  );
  
  const otherCurrencies = currencies?.data.filter(c => 
    !['UAH', 'EUR', 'USD', 'PLN', 'GBP'].includes(c.code)
  );
  
  return (
    <Select name="default_currency">
      <optgroup label="Popular">
        {popularCurrencies?.map(currency => (
          <option key={currency.code} value={currency.code}>
            {currency.symbol} {currency.name_en}
          </option>
        ))}
      </optgroup>
      
      <optgroup label="Other">
        {otherCurrencies?.map(currency => (
          <option key={currency.code} value={currency.code}>
            {currency.symbol} {currency.name_en}
          </option>
        ))}
      </optgroup>
    </Select>
  );
}
```

### Поиск по справочнику

```typescript
import { useMemo, useState } from 'react';

function CountryCombobox() {
  const { data: countries } = useCountries();
  const [search, setSearch] = useState('');
  
  const filtered = useMemo(() => {
    if (!search) return countries?.data || [];
    
    const query = search.toLowerCase();
    
    return countries?.data.filter(country => 
      country.name_en.toLowerCase().includes(query) ||
      country.name_native?.toLowerCase().includes(query) ||
      country.code.toLowerCase().includes(query)
    ) || [];
  }, [countries, search]);
  
  return (
    <Combobox>
      <ComboboxInput 
        value={search} 
        onChange={e => setSearch(e.target.value)}
        placeholder="Search country..."
      />
      
      <ComboboxOptions>
        {filtered.map(country => (
          <ComboboxOption key={country.code} value={country.code}>
            {country.name_en} ({country.code})
          </ComboboxOption>
        ))}
      </ComboboxOptions>
    </Combobox>
  );
}
```

### Автоматический выбор валюты по стране

```typescript
function EnterpriseForm() {
  const { data: countries } = useCountries();
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [currency, setCurrency] = useState<string>('');
  
  // Автоматически установить валюту при выборе страны
  useEffect(() => {
    if (selectedCountry) {
      const country = countries?.data.find(c => c.code === selectedCountry);
      if (country?.default_currency) {
        setCurrency(country.default_currency);
      }
    }
  }, [selectedCountry, countries]);
  
  return (
    <Form>
      <Select 
        value={selectedCountry}
        onChange={e => setSelectedCountry(e.target.value)}
      >
        {countries?.data.map(country => (
          <option key={country.code} value={country.code}>
            {country.name_en}
          </option>
        ))}
      </Select>
      
      <Select value={currency} onChange={e => setCurrency(e.target.value)}>
        {/* валюты */}
      </Select>
    </Form>
  );
}
```

---

## Preloading

Для лучшей UX можно preload справочники при загрузке приложения:

```typescript
// app/layout.tsx
import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
  
  // Preload reference data
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['locales'],
      queryFn: getLocales,
    }),
    queryClient.prefetchQuery({
      queryKey: ['currencies'],
      queryFn: getCurrencies,
    }),
    queryClient.prefetchQuery({
      queryKey: ['countries'],
      queryFn: getCountries,
    }),
  ]);
  
  return (
    <html>
      <body>
        <HydrationBoundary state={dehydrate(queryClient)}>
          {children}
        </HydrationBoundary>
      </body>
    </html>
  );
}
```

---

**Обновлено:** 2026-01-17  
**Версия:** 1.0.0
