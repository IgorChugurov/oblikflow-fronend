/**
 * API Hooks - Главный экспорт всех React Query hooks
 *
 * Централизованная точка доступа ко всем hooks для работы с API.
 *
 * @example
 * ```typescript
 * // Импорт отдельных категорий hooks
 * import * as enterprisesHooks from '@/shared/api/hooks/enterprises';
 * import * as referenceHooks from '@/shared/api/hooks/reference';
 *
 * // Или импорт конкретных hooks
 * import { useEnterprises, useCreateEnterprise } from '@/shared/api/hooks';
 * ```
 */

// Enterprises hooks
export * from "./enterprises";

// Members hooks
export * from "./members";

// Reference hooks
export * from "./reference";
