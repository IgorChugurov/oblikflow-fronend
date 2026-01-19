/**
 * useRemoveMember - React Query mutation для удаления admin из предприятия
 * 
 * Удаляет участника из команды предприятия.
 * После успешного удаления инвалидирует кеш списка участников.
 * 
 * **Важно:** Нельзя удалить owner!
 * 
 * @param enterpriseId - UUID предприятия
 * 
 * @example
 * ```typescript
 * function MemberCard({ member, enterpriseId }: Props) {
 *   const removeMutation = useRemoveMember(enterpriseId);
 *   
 *   const handleRemove = async () => {
 *     if (!confirm(`Remove ${member.name}?`)) return;
 *     
 *     try {
 *       await removeMutation.mutateAsync(member.user_id);
 *       toast.success(`${member.name} removed`);
 *     } catch (error) {
 *       if (error.message.includes('CANNOT_REMOVE_OWNER')) {
 *         toast.error('Cannot remove owner from enterprise');
 *       } else {
 *         toast.error(error.message);
 *       }
 *     }
 *   };
 *   
 *   return (
 *     <div>
 *       <h4>{member.name}</h4>
 *       <p>{member.email}</p>
 *       {!member.is_owner && (
 *         <Button 
 *           variant="destructive"
 *           onClick={handleRemove}
 *           disabled={removeMutation.isPending}
 *         >
 *           {removeMutation.isPending ? 'Removing...' : 'Remove'}
 *         </Button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { membersSDK } from "../../sdk";

export function useRemoveMember(enterpriseId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (userId) => {
      const result = await membersSDK.remove(enterpriseId, userId);

      if (result.error) {
        throw new Error(result.error.message || "Failed to remove member");
      }
    },

    onSuccess: () => {
      // Инвалидировать список участников после удаления
      queryClient.invalidateQueries({ queryKey: ["members", enterpriseId] });
    },
  });
}
