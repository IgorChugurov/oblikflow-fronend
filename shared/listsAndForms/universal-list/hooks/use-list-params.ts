/**
 * useListParams - Управление параметрами списка
 * 
 * Единый источник истины для параметров (page, limit, search, filters).
 * Синхронизирует state и URL query params.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { LoadDataParams } from '../../types';

interface UseListParamsOptions {
  projectId: string;
  serviceType: string;
  pageSize: number;
}

export function useListParams({ projectId, serviceType, pageSize }: UseListParamsOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ========================================
  // Parse URL params on mount
  // ========================================
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialLimit = parseInt(searchParams.get('limit') || String(pageSize), 10);
  const initialSearch = searchParams.get('search') || '';

  // ========================================
  // State (single source of truth)
  // ========================================
  const [params, setParamsState] = useState<LoadDataParams>({
    page: initialPage,
    limit: initialLimit,
    search: initialSearch,
  });

  // Search input separate state (for debouncing)
  const [searchInput, setSearchInput] = useState(initialSearch);

  // ========================================
  // Update URL when params change
  // ========================================
  useEffect(() => {
    const queryParams = new URLSearchParams();
    
    if (params.page > 1) {
      queryParams.set('page', String(params.page));
    }
    
    if (params.limit !== pageSize) {
      queryParams.set('limit', String(params.limit));
    }
    
    if (params.search) {
      queryParams.set('search', params.search);
    }
    
    if (params.filters && Object.keys(params.filters).length > 0) {
      queryParams.set('filters', JSON.stringify(params.filters));
    }
    
    const queryString = queryParams.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    
    // Update URL without causing re-render
    if (newUrl !== `${pathname}${window.location.search}`) {
      router.replace(newUrl, { scroll: false });
    }
  }, [params, pathname, pageSize, router]);

  // ========================================
  // Debounced search
  // ========================================
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== params.search) {
        setParamsState(prev => ({
          ...prev,
          search: searchInput,
          page: 1, // Reset to first page on search
        }));
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchInput, params.search]);

  // ========================================
  // Update params (merge with existing)
  // ========================================
  const setParams = useCallback((updates: Partial<LoadDataParams>) => {
    setParamsState(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // ========================================
  // Return
  // ========================================
  return {
    params,
    setParams,
    searchInput,
    setSearchInput,
  };
}
