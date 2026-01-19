/**
 * DataTableHeader - Заголовок списка
 * 
 * Показывает название страницы, описание и статистику.
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { CardHeader, CardTitle, CardDescription } from 'shared/components/ui/card';

interface DataTableHeaderProps {
  pageTitle: string;
  description?: string;
  statistics?: {
    total: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
  };
}

export function DataTableHeader({
  pageTitle,
  description,
  statistics,
}: DataTableHeaderProps) {
  const t = useTranslations();
  
  return (
    <CardHeader>
      <div className="flex items-start justify-between">
        <div>
          <CardTitle className="text-2xl font-bold">{pageTitle}</CardTitle>
          {description && (
            <CardDescription className="mt-1.5">{description}</CardDescription>
          )}
        </div>
        
        {statistics && statistics.total > 0 && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{statistics.total}</span>{' '}
            {statistics.total === 1 ? t('pagination.record') : t('pagination.records')}
            {statistics.totalPages > 1 && (
              <>
                {' '}
                • {t('pagination.page')}{' '}
                <span className="font-medium">{statistics.currentPage}</span>
                {' '}{t('pagination.of')}{' '}
                <span className="font-medium">{statistics.totalPages}</span>
              </>
            )}
          </div>
        )}
      </div>
    </CardHeader>
  );
}
