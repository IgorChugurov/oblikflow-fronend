/**
 * DataTableHeader - Заголовок списка
 * 
 * Показывает название страницы, описание и статистику.
 */

import React from 'react';
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
            {statistics.total === 1 ? 'запис' : 'записів'}
            {statistics.totalPages > 1 && (
              <>
                {' '}
                • Сторінка{' '}
                <span className="font-medium">{statistics.currentPage}</span>
                {' з '}
                <span className="font-medium">{statistics.totalPages}</span>
              </>
            )}
          </div>
        )}
      </div>
    </CardHeader>
  );
}
