/**
 * Query Keys для React Query
 * 
 * Централизованное управление ключами кэша.
 * Обеспечивает консистентность между hooks и гарантирует,
 * что инвалидация кэша работает корректно.
 * 
 * @see docs/architecture/CACHE_UPDATE_STRATEGY.md
 */

/**
 * Фабрика ключей для списков сущностей
 */
export const listKeys = {
  /**
   * Базовый ключ для всех списков проекта и типа сущности
   * Используется для инвалидации всех страниц списка
   * 
   * @example
   * // Инвалидировать все страницы списка enterprises в admin
   * queryClient.invalidateQueries({ 
   *   queryKey: listKeys.all('admin', 'enterprises'),
   *   exact: false 
   * });
   */
  all: (projectId: string, serviceType: string) => 
    ['list', projectId, serviceType] as const,
  
  /**
   * Ключ для конкретной страницы списка с параметрами
   * Используется в useQuery для загрузки данных
   * 
   * @example
   * queryKey: listKeys.page('admin', 'enterprises', { page: 1, limit: 20, search: 'test' })
   */
  page: (projectId: string, serviceType: string, params: Record<string, any>) => 
    ['list', projectId, serviceType, params] as const,
};

/**
 * Фабрика ключей для деталей сущности
 */
export const detailKeys = {
  /**
   * Ключ для деталей конкретной сущности
   * 
   * @example
   * queryKey: detailKeys.enterprise(enterpriseId)
   */
  enterprise: (id: string) => ['enterprise', id] as const,
  invoice: (id: string) => ['invoice', id] as const,
  counterparty: (id: string) => ['counterparty', id] as const,
  // Добавляйте другие типы по мере необходимости
};

/**
 * Универсальный генератор ключей для любой сущности
 */
export const entityKeys = {
  detail: (entityType: string, id: string) => [entityType, id] as const,
};
