/**
 * useSelectOptions - Универсальный hook для формирования options для select
 *
 * Преобразует reference data в формат для select компонентов.
 * Автоматически фильтрует неактивные элементы.
 *
 * @example
 * ```typescript
 * function EnterpriseForm() {
 *   const { localeOptions, currencyOptions, countryOptions, isLoading } = useSelectOptions();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <Form>
 *       <Select name="default_locale" options={localeOptions} />
 *       <Select name="default_currency" options={currencyOptions} />
 *       <Select name="country_code" options={countryOptions} />
 *     </Form>
 *   );
 * }
 * ```
 */

import { useMemo } from "react";
import { useLocales, useCurrencies, useCountries } from "./useReferenceData";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Универсальный хук для формирования options для select компонентов
 *
 * Возвращает готовые options для локалей, валют и стран.
 * Автоматически фильтрует только активные элементы.
 */
export function useSelectOptions() {
  const { data: localesData, isLoading: localesLoading } = useLocales();
  const { data: currenciesData, isLoading: currenciesLoading } =
    useCurrencies();
  const { data: countriesData, isLoading: countriesLoading } = useCountries();

  // Locales options - форматирование для select
  const localeOptions = useMemo<SelectOption[]>(() => {
    if (!localesData?.data) return [];

    return localesData.data
      .filter((locale) => locale.is_active)
      .map((locale) => ({
        value: locale.code,
        label: `${locale.name_native} (${locale.name_en})`,
      }));
  }, [localesData]);

  // Currency options - форматирование для select
  const currencyOptions = useMemo<SelectOption[]>(() => {
    if (!currenciesData?.data) return [];

    return currenciesData.data
      .filter((currency) => currency.is_active)
      .map((currency) => ({
        value: currency.code,
        label: `${currency.symbol} ${currency.name_en} (${currency.code})`,
      }));
  }, [currenciesData]);

  // Currency options grouped - для группировки по популярности
  const currencyOptionsGrouped = useMemo<{
    popular: SelectOption[];
    other: SelectOption[];
  }>(() => {
    if (!currenciesData?.data) return { popular: [], other: [] };

    const popularCodes = ["UAH", "EUR", "USD", "PLN", "GBP"];

    const popular: SelectOption[] = [];
    const other: SelectOption[] = [];

    currenciesData.data
      .filter((c) => c.is_active)
      .forEach((currency) => {
        const option = {
          value: currency.code,
          label: `${currency.symbol} ${currency.name_en} (${currency.code})`,
        };

        if (popularCodes.includes(currency.code)) {
          popular.push(option);
        } else {
          other.push(option);
        }
      });

    return { popular, other };
  }, [currenciesData]);

  // Country options - форматирование для select
  const countryOptions = useMemo<SelectOption[]>(() => {
    if (!countriesData?.data) return [];

    return countriesData.data
      .filter((country) => country.is_active)
      .map((country) => ({
        value: country.code,
        label: `${country.name_en} (${country.code})`,
      }));
  }, [countriesData]);

  // Загрузка - все справочники должны загрузиться
  const isLoading = localesLoading || currenciesLoading || countriesLoading;

  return {
    localeOptions,
    currencyOptions,
    currencyOptionsGrouped,
    countryOptions,
    isLoading,

    // Сырые данные (если нужны)
    localesData,
    currenciesData,
    countriesData,
  };
}

/**
 * Hook для автоматического выбора валюты по стране
 *
 * Возвращает валюту по умолчанию для выбранной страны.
 *
 * @param countryCode - Код страны (ISO 3166-1 alpha-2)
 * @returns Код валюты (ISO 4217) или null
 *
 * @example
 * ```typescript
 * function EnterpriseForm() {
 *   const [selectedCountry, setSelectedCountry] = useState('');
 *   const autoSelectedCurrency = useAutoSelectCurrency(selectedCountry);
 *
 *   useEffect(() => {
 *     if (autoSelectedCurrency) {
 *       form.setValue('default_currency', autoSelectedCurrency);
 *     }
 *   }, [autoSelectedCurrency]);
 *
 *   return (
 *     <Select
 *       name="country_code"
 *       onChange={(value) => setSelectedCountry(value)}
 *     />
 *   );
 * }
 * ```
 */
export function useAutoSelectCurrency(countryCode?: string) {
  const { data: countriesData } = useCountries();

  return useMemo(() => {
    if (!countryCode || !countriesData?.data) return null;

    const country = countriesData.data.find((c) => c.code === countryCode);
    return country?.default_currency || null;
  }, [countryCode, countriesData]);
}
