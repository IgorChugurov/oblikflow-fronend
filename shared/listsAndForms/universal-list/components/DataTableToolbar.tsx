/**
 * DataTableToolbar - Toolbar для списка
 * 
 * Содержит: поиск, фильтры, кнопку создания.
 */

import React from 'react';
import { Plus, Search, X } from 'lucide-react';
import { Button } from 'shared/components/ui/button';
import { Input } from 'shared/components/ui/input';
import type { FilterSpec } from '../../types';

interface DataTableToolbarProps {
  // Search
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  showSearch: boolean;
  
  // Filters
  enableFilters: boolean;
  filtersSpec?: FilterSpec[];
  filters?: Record<string, any>;
  onFiltersChange?: (filters: Record<string, any>) => void;
  filterModes?: Record<string, 'exact' | 'contains' | 'startsWith' | 'endsWith'>;
  onFilterModesChange?: (modes: Record<string, 'exact' | 'contains' | 'startsWith' | 'endsWith'>) => void;
  
  // Create button
  showCreateButton: boolean;
  createButtonText: string;
  onCreate: () => void;
}

export function DataTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Пошук...',
  showSearch,
  enableFilters,
  filtersSpec = [],
  filters = {},
  onFiltersChange,
  filterModes = {},
  onFilterModesChange,
  showCreateButton,
  createButtonText,
  onCreate,
}: DataTableToolbarProps) {
  const hasActiveFilters = filters && Object.keys(filters).length > 0;

  const handleClearSearch = () => {
    onSearchChange('');
  };

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4 border-b">
      {/* Left side: Search and Filters */}
      <div className="flex flex-1 items-center gap-2">
        {/* Search */}
        {showSearch && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchValue && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground"
                aria-label="Очистити пошук"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        
        {/* Filters - TODO: Implement in future if needed */}
        {enableFilters && filtersSpec.length > 0 && hasActiveFilters && (
          <div className="text-sm text-muted-foreground">
            Активні фільтри: {Object.keys(filters).length}
          </div>
        )}
      </div>
      
      {/* Right side: Create Button */}
      {showCreateButton && (
        <Button onClick={onCreate} size="default">
          <Plus className="mr-2 h-4 w-4" />
          {createButtonText}
        </Button>
      )}
    </div>
  );
}
