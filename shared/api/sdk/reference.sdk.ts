/**
 * Reference Data SDK
 *
 * SDK для работы со справочными данными.
 * Справочники НЕ требуют авторизации (публичные endpoints).
 *
 * @example
 * ```typescript
 * import { referenceSDK } from '@/shared/api/sdk';
 *
 * // Получить языки
 * const locales = await referenceSDK.getLocales();
 *
 * // Получить валюты
 * const currencies = await referenceSDK.getCurrencies();
 *
 * // Получить страны
 * const countries = await referenceSDK.getCountries();
 * ```
 */

import { httpClient } from "../../lib/api/http-client";
import type {
  LocaleListResponse,
  CurrencyListResponse,
  CountryListResponse,
} from "../../types/enterprises";
import type { ApiResult } from "../../lib/api/core/types";

export class ReferenceSDK {
  /**
   * Получить список поддерживаемых языков интерфейса
   *
   * **Публичный endpoint** - не требует авторизации.
   * Используется для селекта выбора языка в формах.
   *
   * @returns Список языков (8 локалей)
   * @throws {Error} При ошибке сети
   *
   * @example
   * ```typescript
   * const result = await referenceSDK.getLocales();
   *
   * if ('error' in result) {
   *   console.error(result.error);
   * } else {
   *   const activeLocales = result.data.data.filter(l => l.is_active);
   *   console.log('Available locales:', activeLocales.map(l => l.code));
   * }
   * ```
   */
  async getLocales(): Promise<ApiResult<LocaleListResponse>> {
    return httpClient.get<LocaleListResponse>("/api/locales", {
      skipAuth: true, // Публичный endpoint
    });
  }

  /**
   * Получить список валют
   *
   * **Публичный endpoint** - не требует авторизации.
   * Используется для селекта выбора валюты учета.
   *
   * @returns Список валют (31 валюта, ISO 4217)
   * @throws {Error} При ошибке сети
   *
   * @example
   * ```typescript
   * const result = await referenceSDK.getCurrencies();
   *
   * if ('error' in result) {
   *   console.error(result.error);
   * } else {
   *   const currencies = result.data.data;
   *
   *   // Группировка по популярности
   *   const popular = currencies.filter(c =>
   *     ['UAH', 'EUR', 'USD', 'PLN'].includes(c.code)
   *   );
   * }
   * ```
   */
  async getCurrencies(): Promise<ApiResult<CurrencyListResponse>> {
    return httpClient.get<CurrencyListResponse>("/api/currencies", {
      skipAuth: true, // Публичный endpoint
    });
  }

  /**
   * Получить список стран
   *
   * **Публичный endpoint** - не требует авторизации.
   * Используется для селекта выбора страны регистрации предприятия.
   *
   * @returns Список стран (58 стран, ISO 3166-1)
   * @throws {Error} При ошибке сети
   *
   * @example
   * ```typescript
   * const result = await referenceSDK.getCountries();
   *
   * if ('error' in result) {
   *   console.error(result.error);
   * } else {
   *   const countries = result.data.data;
   *
   *   // Найти страну по коду
   *   const ukraine = countries.find(c => c.code === 'UA');
   *   console.log('Default currency:', ukraine?.default_currency); // "UAH"
   * }
   * ```
   */
  async getCountries(): Promise<ApiResult<CountryListResponse>> {
    return httpClient.get<CountryListResponse>("/api/countries", {
      skipAuth: true, // Публичный endpoint
    });
  }
}

// Singleton экземпляр для использования по умолчанию
export const referenceSDK = new ReferenceSDK();
