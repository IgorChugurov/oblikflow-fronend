/**
 * Reference Data Hooks - React Query hooks для справочных данных
 * 
 * Hooks для получения локалей, валют и стран.
 * Справочники кешируются агрессивно (24 часа), т.к. редко меняются.
 * 
 * @example
 * ```typescript
 * function EnterpriseForm() {
 *   const { data: locales } = useLocales();
 *   const { data: currencies } = useCurrencies();
 *   const { data: countries } = useCountries();
 *   
 *   return (
 *     <Form>
 *       <Select 
 *         options={locales?.data.map(l => ({ value: l.code, label: l.name_native }))}
 *       />
 *     </Form>
 *   );
 * }
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import { referenceSDK } from '../../sdk';
import type { 
  LocaleListResponse,
  CurrencyListResponse,
  CountryListResponse,
} from '../../../types/enterprises';

/**
 * Hook для получения списка поддерживаемых языков
 * 
 * Кеширование: 24 часа (редко меняется)
 */
export function useLocales() {
  return useQuery<LocaleListResponse, Error>({
    queryKey: ['locales'],
    queryFn: async () => {
      const result = await referenceSDK.getLocales();
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to fetch locales');
      }
      
      return result.data!;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 часа - данные "свежие"
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 дней - кеш жив
    retry: 2, // Две попытки retry (справочники критичны)
  });
}

/**
 * Hook для получения списка валют
 * 
 * Кеширование: 24 часа (редко меняется)
 */
export function useCurrencies() {
  return useQuery<CurrencyListResponse, Error>({
    queryKey: ['currencies'],
    queryFn: async () => {
      const result = await referenceSDK.getCurrencies();
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to fetch currencies');
      }
      
      return result.data!;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 часа
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 дней
    retry: 2,
  });
}

/**
 * Hook для получения списка стран
 * 
 * Кеширование: 24 часа (редко меняется)
 */
export function useCountries() {
  return useQuery<CountryListResponse, Error>({
    queryKey: ['countries'],
    queryFn: async () => {
      const result = await referenceSDK.getCountries();
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to fetch countries');
      }
      
      return result.data!;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 часа
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 дней
    retry: 2,
  });
}
