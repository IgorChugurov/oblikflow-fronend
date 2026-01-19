/**
 * UniversalEntityListClient - Wrapper для списка с логикой удаления
 * 
 * Добавляет:
 * - Диалог подтверждения удаления
 * - Оптимистичные обновления
 * - Обработку rowClick
 * 
 * НЕ знает про конкретные SDK.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { UniversalEntityListDataTable } from './UniversalEntityListDataTable';
import { generateColumnsFromConfig } from './utils/table-column-generator';
import { updateListCache } from '../../lib/api/core/cache-manager';
import { listKeys } from '../../lib/api/core/query-keys';
import type { ListSpec, ServiceType, RoutingConfig, LoadDataFn, LoadDataResult } from '../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'shared/components/ui/dialog';
import { Button } from 'shared/components/ui/button';

interface UniversalEntityListClientProps<TData extends { id: string }> {
  projectId: string;
  serviceType: ServiceType;
  listSpec: ListSpec;
  routing: RoutingConfig;
  onLoadData: LoadDataFn<TData>;
  onDelete: (id: string) => Promise<void>;
  readOnly?: boolean;
}

export function UniversalEntityListClient<TData extends { id: string }>({
  projectId,
  serviceType,
  listSpec,
  routing,
  onLoadData,
  onDelete,
  readOnly = false,
}: UniversalEntityListClientProps<TData>) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations();

  // ========================================
  // Delete Dialog State
  // ========================================
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string | null;
    itemName: string | null;
  }>({
    open: false,
    id: null,
    itemName: null,
  });

  // ========================================
  // Get Item Name from Cache
  // ========================================
  const getItemName = useCallback(
    (id: string): string => {
      const queries = queryClient.getQueriesData<LoadDataResult<TData>>({
        queryKey: listKeys.all(projectId, serviceType),
      });

      for (const [, queryData] of queries) {
        if (queryData?.data) {
          const item = queryData.data.find((item) => item.id === id);
          if (item) {
            // Try to get name from common fields
            const possibleNameFields = ['name', 'title', 'label', 'key'];
            for (const field of possibleNameFields) {
              if ((item as any)[field]) {
                return String((item as any)[field]);
              }
            }
          }
        }
      }

      return t('common.thisRecord');
    },
    [queryClient, projectId, serviceType, t]
  );

  // ========================================
  // Delete Mutation
  // ========================================
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await onDelete(id);
      return { id, serviceType };
    },
    
    // Optimistic update - удаляем из кэша сразу
    onMutate: async (id) => {
      const baseQueryKey = listKeys.all(projectId, serviceType);
      
      await queryClient.cancelQueries({
        queryKey: baseQueryKey,
      });

      const previousQueries = queryClient.getQueriesData({
        queryKey: baseQueryKey,
      });

      queryClient.setQueriesData<LoadDataResult<TData>>(
        { queryKey: baseQueryKey },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((item) => item.id !== id),
            pagination: {
              ...old.pagination,
              total: Math.max(0, old.pagination.total - 1),
            },
          };
        }
      );

      return { previousQueries };
    },
    
    // Rollback on error
    onError: (error, id, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      alert(`${t('common.deleteError')}: ${error.message}`);
    },
    
    // Обновляем список после успешного удаления (safe-refetch)
    onSuccess: async () => {
      await updateListCache({
        queryClient,
        projectId,
        serviceType,
      });
    },
  });

  // ========================================
  // Delete Handlers
  // ========================================
  const handleDeleteRequest = useCallback(
    (id: string) => {
      const itemName = getItemName(id);
      setDeleteDialog({
        open: true,
        id,
        itemName,
      });
    },
    [getItemName]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog.id) return;

    try {
      await deleteMutation.mutateAsync(deleteDialog.id);
      setDeleteDialog({ open: false, id: null, itemName: null });
    } catch (error) {
      console.error('Delete error:', error);
    }
  }, [deleteDialog.id, deleteMutation]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialog({ open: false, id: null, itemName: null });
  }, []);

  // ========================================
  // Navigation Handler
  // ========================================
  const handleNavigate = useCallback(
    (url: string, row: TData) => {
      router.push(url);
    },
    [router]
  );

  // ========================================
  // Row Click Handler
  // ========================================
  const handleRowClick = useCallback(
    (row: TData) => {
      const config = listSpec.rowClick;
      if (!config) return;

      if (config.action === 'navigate') {
        // Replace placeholders
        let url = config.urlTemplate || '';
        Object.keys(row).forEach((key) => {
          url = url.replace(`{${key}}`, String((row as any)[key]));
        });

        // Set cookie if configured
        if (config.setCookie) {
          const value = (row as any)[config.setCookie.valueField];
          if (value) {
            document.cookie = `${config.setCookie.name}=${value}; path=/`;
          }
        }

        // Navigate
        router.push(url);
      }
    },
    [listSpec.rowClick, router]
  );

  // ========================================
  // Generate Columns
  // ========================================
  const columns = generateColumnsFromConfig<TData>(
    listSpec.columns,
    listSpec.actions || [],
    handleNavigate,
    handleDeleteRequest,
    readOnly,
    t
  );

  // ========================================
  // Delete Dialog Config
  // ========================================
  const deleteDialogConfig = listSpec.actions?.find((a) => a.type === 'delete')?.confirmDialog || {
    title: 'Видалити запис?',
    description: 'Ви впевнені, що хочете видалити "{name}"? Цю дію не можна буде скасувати.',
    confirmText: 'Видалити',
    cancelText: 'Скасувати',
    variant: 'destructive' as const,
  };

  // Replace {name} placeholder
  const dialogDescription = deleteDialogConfig.description.replace('{name}', deleteDialog.itemName || 'цей запис');

  return (
    <>
      <UniversalEntityListDataTable<TData>
        columns={columns}
        listSpec={listSpec}
        projectId={projectId}
        serviceType={serviceType}
        onLoadData={onLoadData}
        routing={routing}
        onRowClick={listSpec.rowClick ? handleRowClick : undefined}
        readOnly={readOnly}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && handleDeleteCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deleteDialogConfig.title}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel} disabled={deleteMutation.isPending}>
              {deleteDialogConfig.cancelText}
            </Button>
            <Button
              variant={deleteDialogConfig.variant === 'destructive' ? 'destructive' : 'default'}
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t('common.deleting') : deleteDialogConfig.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
