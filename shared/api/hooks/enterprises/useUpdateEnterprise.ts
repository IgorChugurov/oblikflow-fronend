/**
 * useUpdateEnterprise - React Query mutation для обновления предприятия
 * 
 * Обновляет настройки предприятия.
 * Доступно только owner и admin.
 * После успешного обновления инвалидирует кеш.
 * 
 * @param enterpriseId - UUID предприятия для обновления
 * 
 * @example
 * ```typescript
 * function EditEnterpriseForm({ id }: { id: string }) {
 *   const { data: enterpriseData } = useEnterprise(id);
 *   const updateMutation = useUpdateEnterprise(id);
 *   
 *   const handleSubmit = async (updates: UpdateEnterpriseDto) => {
 *     try {
 *       await updateMutation.mutateAsync(updates);
 *       toast.success('Enterprise updated!');
 *     } catch (error) {
 *       toast.error(error.message);
 *     }
 *   };
 *   
 *   return (
 *     <Form
 *       defaultValues={{
 *         name: enterpriseData?.data.name,
 *         default_currency: enterpriseData?.data.default_currency,
 *       }}
 *       onSubmit={handleSubmit}
 *       disabled={updateMutation.isPending}
 *     />
 *   );
 * }
 * ```
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { enterprisesSDK } from '../../sdk';
import { updateListCache, updateDetailCache } from '../../../lib/api/core/cache-manager';
import { detailKeys } from '../../../lib/api/core/query-keys';
import type { 
  UpdateEnterpriseDto,
  UpdateEnterpriseResponse,
} from '../../../types/enterprises';

export function useUpdateEnterprise(enterpriseId: string, projectId = 'admin') {
  const queryClient = useQueryClient();
  
  return useMutation<UpdateEnterpriseResponse, Error, UpdateEnterpriseDto>({
    mutationFn: async (data) => {
      const result = await enterprisesSDK.update(enterpriseId, data);
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to update enterprise');
      }
      
      return result.data!;
    },
    
    onSuccess: async (response) => {
      // Обновляем кэш деталей предприятия
      updateDetailCache({
        queryClient,
        detailKey: detailKeys.enterprise(enterpriseId),
        data: response,
      });
      
      // Обновляем списки предприятий (safe-refetch стратегия)
      // Сохраняет позицию пользователя (page, search, filters)
      await updateListCache({
        queryClient,
        projectId,
        serviceType: 'enterprises',
      });
    },
  });
}
