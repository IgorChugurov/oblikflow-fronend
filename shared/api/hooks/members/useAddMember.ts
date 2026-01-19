/**
 * useAddMember - React Query mutation для добавления admin в предприятие
 * 
 * Добавляет существующего пользователя как admin.
 * После успешного добавления инвалидирует кеш списка участников.
 * 
 * **Важно:** Пользователь должен быть уже зарегистрирован!
 * 
 * @param enterpriseId - UUID предприятия
 * 
 * @example
 * ```typescript
 * function InviteMemberDialog({ enterpriseId }: { enterpriseId: string }) {
 *   const addMutation = useAddMember(enterpriseId);
 *   const [email, setEmail] = useState('');
 *   
 *   const handleSubmit = async (e: FormEvent) => {
 *     e.preventDefault();
 *     
 *     try {
 *       const result = await addMutation.mutateAsync({ email });
 *       
 *       toast.success(`${result.data.name} added as admin`);
 *       setEmail('');
 *     } catch (error) {
 *       if (error.message.includes('USER_NOT_FOUND')) {
 *         toast.error('User must register first');
 *       } else if (error.message.includes('ALREADY_MEMBER')) {
 *         toast.error('User is already a member');
 *       } else {
 *         toast.error(error.message);
 *       }
 *     }
 *   };
 *   
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <Input 
 *         type="email"
 *         value={email}
 *         onChange={e => setEmail(e.target.value)}
 *         placeholder="admin@example.com"
 *         disabled={addMutation.isPending}
 *       />
 *       <Button type="submit" disabled={addMutation.isPending}>
 *         {addMutation.isPending ? 'Adding...' : 'Add Admin'}
 *       </Button>
 *     </form>
 *   );
 * }
 * ```
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { membersSDK } from "../../sdk";
import type { AddMemberDto, AddMemberResponse } from "../../../types/enterprises";

export function useAddMember(enterpriseId: string) {
  const queryClient = useQueryClient();

  return useMutation<AddMemberResponse, Error, AddMemberDto>({
    mutationFn: async (data) => {
      const result = await membersSDK.add(enterpriseId, data);

      if (result.error) {
        throw new Error(result.error.message || "Failed to add member");
      }

      return result.data!;
    },

    onSuccess: () => {
      // Инвалидировать список участников после добавления
      queryClient.invalidateQueries({ queryKey: ["members", enterpriseId] });
    },
  });
}
