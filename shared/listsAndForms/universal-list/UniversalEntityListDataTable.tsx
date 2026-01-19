/**
 * UniversalEntityListDataTable - Универсальная таблица данных
 * 
 * Использует TanStack Table для отображения данных.
 * НЕ знает про конкретные SDK - работает только с переданными данными.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  PaginationState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'shared/components/ui/table';
import { Card, CardContent } from 'shared/components/ui/card';
import { Button } from 'shared/components/ui/button';
import { DataTableHeader } from './components/DataTableHeader';
import { DataTableToolbar } from './components/DataTableToolbar';
import { DataTablePagination } from './components/DataTablePagination';
import { useListParams } from './hooks/use-list-params';
import { useListQuery } from './hooks/use-list-query';
import { useListRouting } from './hooks/use-list-routing';
import { useListState } from './hooks/use-list-state';
import type { LoadDataFn, ServiceType, RoutingConfig, ListSpec } from '../types';

interface UniversalEntityListDataTableProps<TData extends { id: string }> {
  columns: ColumnDef<TData>[];
  listSpec: ListSpec;
  projectId: string;
  serviceType: ServiceType;
  onLoadData: LoadDataFn<TData>;
  routing: RoutingConfig;
  onRowClick?: (row: TData) => void;
  readOnly?: boolean;
}

export function UniversalEntityListDataTable<TData extends { id: string }>({
  columns,
  listSpec,
  projectId,
  serviceType,
  onLoadData,
  routing,
  onRowClick,
  readOnly = false,
}: UniversalEntityListDataTableProps<TData>) {
  const { navigateToCreate } = useListRouting({ routing, projectId });
  const pageSize = listSpec.pageSize || 20;

  // ========================================
  // State Management
  // ========================================
  const { params, setParams, searchInput, setSearchInput } = useListParams({
    projectId,
    serviceType,
    pageSize,
  });

  // Data loading
  const { data, pagination: paginationInfo, isLoading, isFetching, error } = useListQuery({
    projectId,
    serviceType,
    params,
    onLoadData,
  });

  // UI states
  const { isInitialLoading, isEmpty, isFilteredEmpty, hasData, hasError, errorMessage, isRefreshing } = useListState({
    data,
    isLoading,
    isFetching,
    error: error || null,
    params,
    searchInput,
  });

  // ========================================
  // TanStack Table Setup
  // ========================================
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: params.page - 1,
    pageSize: params.limit,
  });

  // Sync pagination
  useEffect(() => {
    const newPageIndex = paginationInfo.page - 1;
    const newPageSize = paginationInfo.limit;

    if (pagination.pageIndex !== newPageIndex || pagination.pageSize !== newPageSize) {
      setPagination({
        pageIndex: newPageIndex,
        pageSize: newPageSize,
      });
    }
  }, [paginationInfo.page, paginationInfo.limit]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: paginationInfo.totalPages,
    state: {
      pagination,
    },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newPagination = updater(pagination);
        setPagination(newPagination);
        setParams({
          page: newPagination.pageIndex + 1,
        });
      }
    },
  });

  // ========================================
  // Action Handlers
  // ========================================
  const handleCreate = () => {
    navigateToCreate(params.limit !== pageSize ? { returnLimit: params.limit } : undefined);
  };

  const handleRetry = () => {
    setParams({});
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setParams({ filters: undefined, filterModes: undefined, page: 1 });
  };

  // ========================================
  // RENDERING
  // ========================================

  // ERROR STATE
  if (hasError) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-12 px-4">
          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold mb-2 text-destructive">Помилка завантаження даних</h3>
            <p className="text-muted-foreground mb-4">{errorMessage}</p>
            <Button onClick={handleRetry} variant="outline">
              Спробувати знову
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // INITIAL LOADING
  if (isInitialLoading) {
    return (
      <Card className="w-full">
        <DataTableHeader pageTitle={listSpec.pageTitle} description={listSpec.description} />
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Завантаження...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // EMPTY STATE
  if (isEmpty) {
    return (
      <Card className="w-full">
        <DataTableHeader pageTitle={listSpec.pageTitle} description={listSpec.description} />
        <CardContent className="flex flex-col items-center justify-center py-12 px-4">
          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold mb-2">{listSpec.emptyStateTitle}</h3>
            {listSpec.emptyStateMessages.map((msg, i) => (
              <p key={i} className="text-muted-foreground mb-2">
                {msg}
              </p>
            ))}
            {listSpec.showCreateButton && !readOnly && (
              <Button onClick={handleCreate} className="mt-4">
                {listSpec.createButtonText}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // DATA TABLE
  return (
    <Card className="w-full">
      <DataTableHeader
        pageTitle={listSpec.pageTitle}
        description={listSpec.description}
        statistics={
          listSpec.enablePagination && paginationInfo.total > 0
            ? {
                total: paginationInfo.total,
                currentPage: paginationInfo.page,
                pageSize: paginationInfo.limit,
                totalPages: paginationInfo.totalPages,
              }
            : undefined
        }
      />

      {/* Toolbar */}
      <DataTableToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={listSpec.searchPlaceholder}
        showSearch={listSpec.showSearch}
        enableFilters={listSpec.enableFilters}
        filtersSpec={listSpec.filters}
        filters={params.filters}
        onFiltersChange={(newFilters) => setParams({ filters: newFilters, page: 1 })}
        filterModes={params.filterModes}
        onFilterModesChange={(newModes) => setParams({ filterModes: newModes, page: 1 })}
        showCreateButton={listSpec.showCreateButton && !readOnly}
        createButtonText={listSpec.createButtonText}
        onCreate={handleCreate}
      />

      {/* Filtered Empty */}
      {isFilteredEmpty && (
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">
            {searchInput ? `Нічого не знайдено за запитом "${searchInput}"` : 'Жодного запису не знайдено'}
          </p>
          <Button variant="link" onClick={handleClearFilters} className="mt-2">
            Очистити фільтри
          </Button>
        </CardContent>
      )}

      {/* Table */}
      {hasData && (
        <>
          <CardContent className="relative">
            {/* Loading overlay */}
            {isRefreshing && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Завантаження...</p>
                </div>
              </div>
            )}

            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      onClick={() => onRowClick?.(row.original)}
                      className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : undefined}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      Немає даних
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>

          {/* Pagination */}
          {listSpec.enablePagination && data.length > 0 && !isLoading && (
            <DataTablePagination
              page={paginationInfo.page}
              pageSize={paginationInfo.limit}
              total={paginationInfo.total}
              totalPages={paginationInfo.totalPages}
              hasPreviousPage={paginationInfo.hasPreviousPage}
              hasNextPage={paginationInfo.hasNextPage}
              onPageChange={(newPage) => setParams({ page: newPage })}
              onPageSizeChange={(newPageSize) => setParams({ limit: newPageSize, page: 1 })}
              disabled={isLoading}
            />
          )}
        </>
      )}
    </Card>
  );
}
