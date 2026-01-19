/**
 * Reference Hooks - React Query hooks для справочных данных
 *
 * @example
 * ```typescript
 * import {
 *   useLocales,
 *   useCurrencies,
 *   useCountries,
 *   useSelectOptions,
 *   useAutoSelectCurrency,
 * } from '@/shared/api/hooks/reference';
 * ```
 */

export { useLocales, useCurrencies, useCountries } from "./useReferenceData";

export { useSelectOptions, useAutoSelectCurrency } from "./useSelectOptions";

export type { SelectOption } from "./useSelectOptions";
