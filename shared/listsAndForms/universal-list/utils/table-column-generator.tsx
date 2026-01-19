/**
 * table-column-generator - Генерация колонок TanStack Table из конфигурации
 * 
 * Универсальный генератор, который создает колонки на основе ColumnConfig.
 * НЕ знает про конкретные сущности - работает только с конфигурацией.
 */

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Badge } from 'shared/components/ui/badge';
import { Button } from 'shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'shared/components/ui/dropdown-menu';
import type { ColumnConfig, ActionConfig } from '../../types';
import { cn } from 'shared/lib/utils';

/**
 * Generate columns from configuration
 */
export function generateColumnsFromConfig<TData extends { id: string }>(
  columnsConfig: ColumnConfig[],
  actions: ActionConfig[] = [],
  onNavigate: (url: string, row: TData) => void,
  onDelete: (id: string) => void,
  readOnly: boolean = false
): ColumnDef<TData>[] {
  // Filter only visible columns
  const visibleColumns = columnsConfig
    .filter((col) => col.displayInTable)
    .sort((a, b) => a.displayIndex - b.displayIndex);

  // Generate data columns
  const dataColumns: ColumnDef<TData>[] = visibleColumns.map((colConfig) => {
    return generateColumnFromConfig(colConfig, onNavigate);
  });

  // Generate actions column (if not readOnly and has actions)
  const actionsColumn: ColumnDef<TData> | null =
    !readOnly && actions.length > 0
      ? generateActionsColumn(actions, onNavigate, onDelete)
      : null;

  return actionsColumn ? [...dataColumns, actionsColumn] : dataColumns;
}

/**
 * Generate single column from config
 */
function generateColumnFromConfig<TData extends { id: string }>(
  colConfig: ColumnConfig,
  onNavigate: (url: string, row: TData) => void
): ColumnDef<TData> {
  return {
    id: colConfig.id,
    accessorKey: colConfig.name,
    header: colConfig.label,
    
    cell: ({ row }) => {
      const value = row.getValue(colConfig.name) as any;
      
      // Transform value if needed
      const displayValue = transformValue(value, colConfig.transform, row.original);
      
      // Render based on type
      switch (colConfig.type) {
        case 'link':
          return renderLink(displayValue, row.original, colConfig, onNavigate);
        
        case 'badge':
          return renderBadge(displayValue, value, colConfig);
        
        case 'date':
          return renderDate(displayValue, colConfig.format);
        
        case 'boolean':
          return renderBoolean(value);
        
        case 'number':
        case 'currency':
          return renderNumber(value, colConfig.type);
        
        case 'text':
        default:
          return <div className="max-w-[500px] truncate">{String(displayValue || '')}</div>;
      }
    },
    
    size: colConfig.width ? parseInt(colConfig.width) : undefined,
  };
}

/**
 * Generate actions column
 */
function generateActionsColumn<TData extends { id: string }>(
  actions: ActionConfig[],
  onNavigate: (url: string, row: TData) => void,
  onDelete: (id: string) => void
): ColumnDef<TData> {
  return {
    id: 'actions',
    header: () => <div className="text-right">Дії</div>,
    cell: ({ row }) => {
      const rowData = row.original;
      
      // Filter actions based on visibility rules
      const visibleActions = actions.filter((action) => {
        if (!action.showOnlyFor) return true;
        
        const fieldValue = (rowData as any)[action.showOnlyFor.field];
        return fieldValue === action.showOnlyFor.value;
      });
      
      if (visibleActions.length === 0) {
        return null;
      }
      
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Відкрити меню</span>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Дії</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {visibleActions.map((action, index) => {
                const IconComponent = action.icon
                  ? (LucideIcons as any)[action.icon] || null
                  : null;
                
                return (
                  <DropdownMenuItem
                    key={action.id || index}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActionClick(action, rowData, onNavigate, onDelete);
                    }}
                    className={cn(
                      action.type === 'delete' && 'text-destructive focus:text-destructive'
                    )}
                  >
                    {IconComponent && <IconComponent className="mr-2 h-4 w-4" />}
                    {action.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
    size: 60,
  };
}

/**
 * Handle action click
 */
function handleActionClick<TData extends { id: string }>(
  action: ActionConfig,
  row: TData,
  onNavigate: (url: string, row: TData) => void,
  onDelete: (id: string) => void
) {
  switch (action.type) {
    case 'edit':
    case 'link':
    case 'view':
      if (action.urlTemplate) {
        let url = action.urlTemplate;
        // Replace all placeholders
        Object.keys(row).forEach((key) => {
          url = url.replace(`{${key}}`, String((row as any)[key]));
        });
        onNavigate(url, row);
      }
      break;
    
    case 'delete':
      // Delete will be handled by parent component with confirmation dialog
      onDelete(row.id);
      break;
    
    case 'custom':
      // Custom actions can be handled by parent
      console.warn('Custom action not implemented:', action.id);
      break;
  }
}

// ============================================================================
// RENDERERS
// ============================================================================

function renderLink<TData>(
  value: any,
  row: TData,
  colConfig: ColumnConfig,
  onNavigate: (url: string, row: TData) => void
) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Custom onClick handler (legacy)
    if (colConfig.onClick) {
      colConfig.onClick(row);
      return;
    }
    
    // URL template navigation
    if (colConfig.urlTemplate) {
      let url = colConfig.urlTemplate;
      
      // Replace all placeholders {field} with actual values
      Object.keys(row as Record<string, any>).forEach((key) => {
        url = url.replace(`{${key}}`, String((row as any)[key]));
      });
      
      // External navigation (cross-domain)
      if (colConfig.external && colConfig.externalBaseUrl) {
        const baseUrl = getExternalBaseUrl(colConfig.externalBaseUrl);
        const fullUrl = `${baseUrl}${url}`;
        window.location.href = fullUrl;
      } else {
        // Internal navigation
        onNavigate(url, row);
      }
    }
  };
  
  return (
    <button
      onClick={handleClick}
      className="text-primary hover:underline font-medium max-w-[500px] truncate block text-left"
    >
      {String(value || '')}
    </button>
  );
}

/**
 * Get external base URL from environment variables
 */
function getExternalBaseUrl(type: 'WORKSPACE' | 'ADMIN' | 'PLATFORM' | 'SITE'): string {
  if (typeof window === 'undefined') {
    // Server-side
    switch (type) {
      case 'WORKSPACE':
        return process.env.NEXT_PUBLIC_WORKSPACE_URL || 'http://localhost:3002';
      case 'ADMIN':
        return process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';
      case 'PLATFORM':
        return process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3003';
      case 'SITE':
        return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      default:
        return '';
    }
  } else {
    // Client-side - читаем из process.env (Next.js заменит на compile time)
    switch (type) {
      case 'WORKSPACE':
        return process.env.NEXT_PUBLIC_WORKSPACE_URL || 'http://localhost:3002';
      case 'ADMIN':
        return process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';
      case 'PLATFORM':
        return process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3003';
      case 'SITE':
        return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      default:
        return '';
    }
  }
}

function renderBadge(displayValue: any, originalValue: any, colConfig: ColumnConfig) {
  const valueKey = String(originalValue);
  
  // Get variant from map or default
  const variant = colConfig.variantMap?.[valueKey] || colConfig.variant || 'default';
  
  // Get label from map or use display value
  const label = colConfig.labelMap?.[valueKey] || displayValue;
  
  return (
    <Badge variant={variant as any} className="whitespace-nowrap">
      {String(label || '')}
    </Badge>
  );
}

function renderDate(value: any, format?: string) {
  if (!value) return null;
  
  try {
    const date = new Date(value);
    
    // Simple formatting (can be replaced with date-fns or similar)
    if (format === 'dd.MM.yyyy') {
      return (
        <div className="whitespace-nowrap">
          {date.toLocaleDateString('uk-UA')}
        </div>
      );
    }
    
    return (
      <div className="whitespace-nowrap">
        {date.toLocaleString('uk-UA')}
      </div>
    );
  } catch (error) {
    return <div>{String(value)}</div>;
  }
}

function renderBoolean(value: any) {
  return (
    <div className="flex items-center">
      {value ? (
        <Badge variant="success">Так</Badge>
      ) : (
        <Badge variant="secondary">Ні</Badge>
      )}
    </div>
  );
}

function renderNumber(value: any, type: 'number' | 'currency') {
  if (value === null || value === undefined) return null;
  
  const num = Number(value);
  
  if (isNaN(num)) return <div>{String(value)}</div>;
  
  if (type === 'currency') {
    return (
      <div className="text-right font-medium whitespace-nowrap">
        {num.toLocaleString('uk-UA', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    );
  }
  
  return (
    <div className="text-right whitespace-nowrap">
      {num.toLocaleString('uk-UA')}
    </div>
  );
}

// ============================================================================
// TRANSFORMERS
// ============================================================================

function transformValue(value: any, transform: string | undefined, row: any): any {
  if (!transform) return value;
  
  switch (transform) {
    case 'booleanToRole':
      return value ? 'Власник' : 'Адміністратор';
    
    case 'booleanToYesNo':
      return value ? 'Так' : 'Ні';
    
    case 'uppercase':
      return String(value || '').toUpperCase();
    
    case 'lowercase':
      return String(value || '').toLowerCase();
    
    default:
      return value;
  }
}
