/**
 * useListQuery - React Query для загрузки данных списка
 * 
 * Универсальный хук для загрузки данных через переданную функцию onLoadData.
 * НЕ знает про конкретные SDK.
 */

import { useQuery } from '@tanstack/react-query';
import type { LoadDataParams, LoadDataFn, LoadDataResult } from '../../types';

interface UseListQueryOptions<TData> {
  projectId: string;
  serviceType: string;
  params: LoadDataParams;
  onLoadData: LoadDataFn<TData>;
}

export function useListQuery<TData extends { id: string }>({
  projectId,
  serviceType,
  params,
  onLoadData,
}: UseListQueryOptions<TData>) {
  const query = useQuery<LoadDataResult<TData>, Error>({
    queryKey: ['list', projectId, serviceType, params],
    queryFn: () => onLoadData(params),
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });

  return {
    data: query.data?.data || [],
    pagination: query.data?.pagination || {
      page: params.page,
      limit: params.limit,
      total: 0,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
  };
}
