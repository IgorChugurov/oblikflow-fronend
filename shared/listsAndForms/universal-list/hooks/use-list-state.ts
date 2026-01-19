/**
 * useListState - Определение UI состояний списка
 * 
 * Анализирует данные и определяет, какое состояние показывать:
 * - Initial loading
 * - Empty state
 * - Filtered empty state
 * - Has data
 * - Error
 * - Refreshing
 */

import { useMemo } from 'react';
import type { LoadDataParams, ListUIState } from '../../types';

interface UseListStateOptions<TData> {
  data: TData[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  params: LoadDataParams;
  searchInput: string;
}

export function useListState<TData>({
  data,
  isLoading,
  isFetching,
  error,
  params,
  searchInput,
}: UseListStateOptions<TData>): ListUIState {
  return useMemo(() => {
    // ========================================
    // ERROR
    // ========================================
    const hasError = !!error;
    const errorMessage = error?.message || null;

    // ========================================
    // LOADING STATES
    // ========================================
    const isInitialLoading = isLoading && !data.length;
    const isRefreshing = isFetching && !isLoading;

    // ========================================
    // EMPTY STATES
    // ========================================
    const hasActiveFilters = !!(
      params.filters && Object.keys(params.filters).length > 0
    );
    const hasSearch = !!searchInput;
    const hasAnyFiltering = hasActiveFilters || hasSearch;

    const isEmpty = !isLoading && !data.length && !hasAnyFiltering;
    const isFilteredEmpty = !isLoading && !data.length && hasAnyFiltering;

    // ========================================
    // DATA STATE
    // ========================================
    const hasData = !isLoading && data.length > 0;

    return {
      isInitialLoading,
      isEmpty,
      isFilteredEmpty,
      hasData,
      hasError,
      errorMessage,
      isRefreshing,
    };
  }, [data, isLoading, isFetching, error, params.filters, searchInput]);
}
