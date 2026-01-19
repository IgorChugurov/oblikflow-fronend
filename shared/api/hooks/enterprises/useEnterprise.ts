/**
 * useEnterprise - React Query hook для получения деталей предприятия
 * 
 * Получает детали одного предприятия по ID.
 * Автоматически кеширует данные.
 * 
 * @param id - UUID предприятия
 * 
 * @example
 * ```typescript
 * function EnterpriseDetails({ id }: { id: string }) {
 *   const { data, isLoading } = useEnterprise(id);
 *   
 *   if (isLoading) return <Spinner />;
 *   
 *   const enterprise = data?.data;
 *   
 *   return (
 *     <div>
 *       <h1>{enterprise?.name}</h1>
 *       <p>Currency: {enterprise?.default_currency}</p>
 *       <p>Your role: {enterprise?.role}</p>
 *     </div>
 *   );
 * }
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import { enterprisesSDK } from '../../sdk';
import type { EnterpriseDetailsResponse } from '../../../types/enterprises';

interface UseEnterpriseOptions {
  enabled?: boolean;
}

export function useEnterprise(id: string, options?: UseEnterpriseOptions) {
  return useQuery<EnterpriseDetailsResponse, Error>({
    queryKey: ['enterprise', id],
    queryFn: async () => {
      const result = await enterprisesSDK.getById(id);
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to fetch enterprise');
      }
      
      return result.data!;
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!id, // Выполнить запрос только если id есть
    staleTime: 60 * 1000, // 1 минута
    retry: 1,
  });
}
