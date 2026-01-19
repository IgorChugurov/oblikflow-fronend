/**
 * Universal List Types
 * 
 * Типы для универсального компонента списков.
 * НЕ зависят от конкретных SDK или сущностей.
 */

// ============================================================================
// DATA LOADING
// ============================================================================

/**
 * Параметры для загрузки данных
 */
export interface LoadDataParams {
  page: number;
  limit: number;
  search?: string;
  filters?: Record<string, any>;
  filterModes?: Record<string, 'exact' | 'contains' | 'startsWith' | 'endsWith'>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

/**
 * Информация о пагинации
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/**
 * Результат загрузки данных
 */
export interface LoadDataResult<TData = any> {
  data: TData[];
  pagination: PaginationInfo;
}

/**
 * Функция загрузки данных (универсальная)
 * Каждая обертка реализует свою версию
 */
export type LoadDataFn<TData = any> = (
  params: LoadDataParams
) => Promise<LoadDataResult<TData>>;

// ============================================================================
// ROUTING
// ============================================================================

/**
 * Конфигурация URL для навигации
 */
export interface RoutingConfig {
  /** Шаблон URL для создания: "/entities/new" */
  createUrlTemplate?: string;
  
  /** Шаблон URL для редактирования: "/entities/{id}/edit" */
  editUrlTemplate?: string;
  
  /** Шаблон URL для деталей: "/entities/{id}" */
  detailsUrlTemplate?: string;
  
  /** Базовый путь (для Next.js App Router) */
  basePath?: string;
}

/**
 * Параметры для навигации
 */
export interface NavigationParams {
  /** Вернуть limit после создания/редактирования */
  returnLimit?: number;
  
  /** Дополнительные query параметры */
  [key: string]: any;
}

// ============================================================================
// SERVICE TYPE
// ============================================================================

/**
 * Тип сервиса для React Query cache key
 * Для каждой сущности свой тип
 */
export type ServiceType = 
  | 'enterprises' 
  | 'members' 
  | 'projects' 
  | 'tasks'
  | string; // Расширяемый

// ============================================================================
// COLUMN CONFIGURATION
// ============================================================================

/**
 * Тип колонки
 */
export type ColumnType = 
  | 'text'           // Обычный текст
  | 'link'           // Ссылка (кликабельная)
  | 'badge'          // Badge/Tag
  | 'date'           // Дата
  | 'boolean'        // Checkbox (disabled)
  | 'number'         // Число
  | 'currency'       // Валюта
  | 'image'          // Изображение
  | 'custom';        // Кастомный рендерер

/**
 * Конфигурация колонки
 */
export interface ColumnConfig {
  id: string;
  name: string;                    // Имя поля в данных
  label: string;                   // Заголовок колонки
  type: ColumnType;
  displayInTable: boolean;
  displayIndex: number;
  
  // Optional
  width?: string;                  // "40%", "200px"
  sortable?: boolean;
  searchable?: boolean;
  
  // For badges
  variant?: string;                // "default", "secondary", "success", "destructive"
  variantMap?: Record<string, string>;  // { "active": "success", "inactive": "secondary" }
  labelMap?: Record<string, string>;    // { "active": "Активний", "inactive": "Неактивний" }
  
  // For transforms
  transform?: 'booleanToRole' | 'booleanToYesNo' | 'uppercase' | 'lowercase';
  
  // For dates
  format?: string;                 // "dd.MM.yyyy", "dd/MM/yyyy HH:mm"
  
  // For links
  onClick?: (row: any) => void;
  
  description?: string;
}

// ============================================================================
// FILTERS
// ============================================================================

/**
 * Тип фильтра
 */
export type FilterType = 
  | 'select'         // Dropdown
  | 'multiselect'    // Multiple select
  | 'text'           // Text input
  | 'date'           // Date picker
  | 'dateRange'      // Date range
  | 'boolean';       // Checkbox

/**
 * Опция для select фильтра
 */
export interface FilterOption {
  value: string;
  label: string;
}

/**
 * Конфигурация фильтра
 */
export interface FilterSpec {
  id: string;
  name: string;                    // Имя поля для фильтрации
  label: string;
  type: FilterType;
  
  // For select/multiselect
  options?: FilterOption[];
  
  // Optional
  placeholder?: string;
  defaultValue?: any;
}

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Тип действия
 */
export type ActionType = 
  | 'edit'           // Редактирование
  | 'delete'         // Удаление
  | 'link'           // Переход по ссылке
  | 'view'           // Просмотр
  | 'custom';        // Кастомное действие

/**
 * Конфигурация действия
 */
export interface ActionConfig {
  id: string;
  type: ActionType;
  label: string;
  icon?: string;                   // Название иконки из lucide-react
  variant?: 'default' | 'ghost' | 'outline' | 'destructive';
  
  // For link/edit/view
  urlTemplate?: string;            // "/entities/{id}/edit"
  
  // For delete
  confirmDialog?: {
    title: string;
    description: string;           // Может содержать {name} и другие плейсхолдеры
    confirmText: string;
    cancelText: string;
    variant?: 'default' | 'destructive';
  };
  
  // Conditional visibility
  showOnlyFor?: {
    field: string;
    value: any;
  };
  
  description?: string;
}

// ============================================================================
// ROW CLICK
// ============================================================================

/**
 * Конфигурация клика на строку
 */
export interface RowClickConfig {
  action: 'navigate' | 'select' | 'custom';
  urlTemplate?: string;            // "/{id}/workspace"
  
  // Cookie для установки
  setCookie?: {
    name: string;                  // "enterprise_id"
    valueField: string;            // "id"
  };
  
  description?: string;
}

// ============================================================================
// LIST SPEC
// ============================================================================

/**
 * Полная спецификация списка (из config.json)
 */
export interface ListSpec {
  // Header
  pageTitle: string;
  description?: string;
  searchPlaceholder?: string;
  emptyStateTitle: string;
  emptyStateMessages: string[];
  
  // Buttons
  showCreateButton: boolean;
  createButtonText: string;
  
  // Functionality
  showSearch: boolean;
  enablePagination: boolean;
  pageSize: number;
  enableFilters: boolean;
  searchableFields: string[];
  
  // Configuration
  columns: ColumnConfig[];
  filters?: FilterSpec[];
  actions?: ActionConfig[];
  rowClick?: RowClickConfig;
}

// ============================================================================
// UI STATES
// ============================================================================

/**
 * Состояния UI
 */
export interface ListUIState {
  isInitialLoading: boolean;
  isEmpty: boolean;
  isFilteredEmpty: boolean;
  hasData: boolean;
  hasError: boolean;
  errorMessage: string | null;
  isRefreshing: boolean;
}
