/**
 * Cache Manager для React Query
 * 
 * Управляет обновлением кэша после мутаций (CREATE/UPDATE/DELETE).
 * Использует стратегию "safe-refetch" - перезагрузка данных с сервера
 * с сохранением позиции пользователя в списке.
 * 
 * @see docs/architecture/CACHE_UPDATE_STRATEGY.md
 */

import { QueryClient } from '@tanstack/react-query';
import { listKeys } from './query-keys';

/**
 * Опции для обновления кэша списка
 */
interface UpdateListCacheOptions {
  /** Query Client инстанс */
  queryClient: QueryClient;
  /** ID проекта (admin, platform, workspace) */
  projectId: string;
  /** Тип сервиса/сущности (enterprises, invoices, и т.д.) */
  serviceType: string;
}

/**
 * Обновляет кэш списка после мутации
 * 
 * Стратегия "safe-refetch":
 * - Перезагружает данные с сервера (точные данные)
 * - Сохраняет позицию пользователя (page, search, filters)
 * - Обновляет только активные запросы (видимые пользователю)
 * - Подходит для всех типов данных (справочники и финансовые документы)
 * 
 * @example
 * // В onSuccess мутации
 * await updateListCache({
 *   queryClient,
 *   projectId: 'admin',
 *   serviceType: 'enterprises',
 * });
 */
export async function updateListCache(options: UpdateListCacheOptions): Promise<void> {
  const { queryClient, projectId, serviceType } = options;
  
  // Получаем базовый ключ для всех страниц списка
  const baseQueryKey = listKeys.all(projectId, serviceType);
  
  // Перезагружаем все активные запросы списка
  // - exact: false - инвалидирует все вариации ключа (разные params)
  // - type: 'active' - только активные (mounted) компоненты
  await queryClient.refetchQueries({ 
    queryKey: baseQueryKey,
    exact: false,
    type: 'active'
  });
}

/**
 * Обновляет кэш деталей сущности
 * 
 * @example
 * // В onSuccess мутации
 * updateDetailCache({
 *   queryClient,
 *   detailKey: ['enterprise', enterpriseId],
 *   data: updatedEnterprise,
 * });
 */
export function updateDetailCache<T>(options: {
  queryClient: QueryClient;
  detailKey: readonly unknown[];
  data: T;
}): void {
  const { queryClient, detailKey, data } = options;
  
  queryClient.setQueryData(detailKey, data);
}

/**
 * Инвалидирует кэш деталей сущности
 * Используйте если данные могли измениться на сервере
 * 
 * @example
 * // После обновления связанной сущности
 * invalidateDetailCache({
 *   queryClient,
 *   detailKey: ['enterprise', enterpriseId],
 * });
 */
export async function invalidateDetailCache(options: {
  queryClient: QueryClient;
  detailKey: readonly unknown[];
}): Promise<void> {
  const { queryClient, detailKey } = options;
  
  await queryClient.invalidateQueries({ 
    queryKey: detailKey,
    exact: true 
  });
}
