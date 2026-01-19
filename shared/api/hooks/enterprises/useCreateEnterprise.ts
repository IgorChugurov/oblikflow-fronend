/**
 * useCreateEnterprise - React Query mutation для создания предприятия
 * 
 * Создает новое предприятие. Пользователь автоматически становится owner.
 * После успешного создания инвалидирует кеш списка предприятий.
 * 
 * @example
 * ```typescript
 * function CreateEnterpriseForm() {
 *   const router = useRouter();
 *   const createMutation = useCreateEnterprise();
 *   
 *   const handleSubmit = async (data: CreateEnterpriseDto) => {
 *     try {
 *       const result = await createMutation.mutateAsync(data);
 *       
 *       toast.success('Enterprise created!');
 *       router.push(`/enterprises/${result.data.id}`);
 *     } catch (error) {
 *       toast.error(error.message);
 *     }
 *   };
 *   
 *   return (
 *     <Form onSubmit={handleSubmit}>
 *       <Button 
 *         type="submit" 
 *         disabled={createMutation.isPending}
 *       >
 *         {createMutation.isPending ? 'Creating...' : 'Create'}
 *       </Button>
 *     </Form>
 *   );
 * }
 * ```
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { enterprisesSDK } from '../../sdk';
import { updateListCache } from '../../../lib/api/core/cache-manager';
import type { 
  CreateEnterpriseDto,
  CreateEnterpriseResponse,
} from '../../../types/enterprises';

export function useCreateEnterprise(projectId = 'admin') {
  const queryClient = useQueryClient();
  
  return useMutation<CreateEnterpriseResponse, Error, CreateEnterpriseDto>({
    mutationFn: async (data) => {
      const result = await enterprisesSDK.create(data);
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to create enterprise');
      }
      
      return result.data!;
    },
    
    onSuccess: async () => {
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
