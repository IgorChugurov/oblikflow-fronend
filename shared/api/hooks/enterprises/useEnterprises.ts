/**
 * useEnterprises - React Query hook для получения списка предприятий
 *
 * Получает список всех предприятий текущего пользователя.
 * Автоматически кеширует данные и обновляет при изменениях.
 *
 * @example
 * ```typescript
 * function EnterprisesPage() {
 *   const { data, isLoading, error } = useEnterprises();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return (
 *     <div>
 *       {data?.data.map(enterprise => (
 *         <EnterpriseCard key={enterprise.id} enterprise={enterprise} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

import { useQuery } from "@tanstack/react-query";
import { enterprisesSDK } from "../../sdk";
import type { EnterpriseListResponse } from "../../../types/enterprises";

export function useEnterprises() {
  return useQuery<EnterpriseListResponse, Error>({
    queryKey: ["enterprises"],
    queryFn: async () => {
      const result = await enterprisesSDK.getAll();

      // httpClient возвращает ApiResult<T>
      // Нужно проверить на ошибку и выбросить её для React Query
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch enterprises");
      }

      // result.data это EnterpriseListResponse
      return result.data!;
    },
    staleTime: 60 * 1000, // 1 минута - данные "свежие"
    retry: 1, // Одна попытка retry при ошибке
  });
}
