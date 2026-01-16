/**
 * Locale Service - работа с локализацией через Backend API
 * Endpoint: GET /api/locales (публичный, не требует авторизации)
 */

import { httpClient } from "../http-client";

/**
 * DTO для одного языка из Backend API
 */
export interface LocaleDto {
  code: string;
  name_native: string;
  name_en: string;
  is_active: boolean;
}

/**
 * Response от /api/locales
 */
export interface LocalesResponse {
  data: LocaleDto[];
  count: number;
}

/**
 * Получить список всех поддерживаемых языков
 *
 * @returns Список активных локалей
 * @throws ApiError если запрос не удался
 *
 * @example
 * ```typescript
 * const locales = await fetchLocales();
 * // [{ code: 'uk', name_native: 'Українська', name_en: 'Ukrainian', is_active: true }, ...]
 * ```
 */
export async function fetchLocales(): Promise<LocaleDto[]> {
  const result = await httpClient.get<LocalesResponse>("/api/locales", {
    skipAuth: true, // Публичный endpoint
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (result.error) {
    console.error("[fetchLocales] API Error:", result.error);
    throw new Error(result.error.message || "Failed to fetch locales");
  }

  if (!result.data?.data) {
    console.error("[fetchLocales] Invalid response format:", result.data);
    throw new Error("Invalid response format from /api/locales");
  }

  // Возвращаем только активные языки
  return result.data.data.filter((locale) => locale.is_active);
}

/**
 * Получить список локалей с fallback на статический список
 * Используется на сервере (в layout.tsx) для надежности
 *
 * @param fallbackLocales - статический список локалей на случай ошибки
 * @returns Список локалей (из API или fallback)
 *
 * @example
 * ```typescript
 * import { locales, localeNames } from 'shared/lib/i18n/config';
 *
 * const staticFallback = locales.map(code => ({
 *   code,
 *   name_native: localeNames[code].native,
 *   name_en: localeNames[code].en,
 *   is_active: true,
 * }));
 *
 * const locales = await fetchLocalesWithFallback(staticFallback);
 * ```
 */
export async function fetchLocalesWithFallback(
  fallbackLocales: LocaleDto[]
): Promise<LocaleDto[]> {
  try {
    return await fetchLocales();
  } catch (error) {
    console.warn("[fetchLocalesWithFallback] Using fallback locales:", error);
    return fallbackLocales;
  }
}
