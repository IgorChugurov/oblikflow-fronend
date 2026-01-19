/**
 * useMembers - React Query hook для получения списка участников предприятия
 * 
 * Получает список всех участников (owner + admins) предприятия.
 * Автоматически кеширует данные.
 * 
 * @param enterpriseId - UUID предприятия
 * 
 * @example
 * ```typescript
 * function MembersList({ enterpriseId }: { enterpriseId: string }) {
 *   const { data, isLoading } = useMembers(enterpriseId);
 *   
 *   if (isLoading) return <Spinner />;
 *   
 *   const members = data?.data || [];
 *   const owner = members.find(m => m.is_owner);
 *   const admins = members.filter(m => !m.is_owner);
 *   
 *   return (
 *     <div>
 *       <h3>Owner: {owner?.name}</h3>
 *       <h3>Admins: {admins.length}</h3>
 *       {admins.map(admin => (
 *         <MemberCard key={admin.user_id} member={admin} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

import { useQuery } from "@tanstack/react-query";
import { membersSDK } from "../../sdk";
import type { MemberListResponse } from "../../../types/enterprises";

export function useMembers(enterpriseId: string) {
  return useQuery<MemberListResponse, Error>({
    queryKey: ["members", enterpriseId],
    queryFn: async () => {
      const result = await membersSDK.getAll(enterpriseId);

      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch members");
      }

      return result.data!;
    },
    enabled: !!enterpriseId, // Выполнить запрос только если enterpriseId есть
    staleTime: 60 * 1000, // 1 минута
    retry: 1,
  });
}
