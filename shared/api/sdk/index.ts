/**
 * API SDK - Главный экспорт всех SDK модулей
 *
 * Централизованная точка доступа ко всем SDK.
 * Все SDK используют существующий httpClient для запросов.
 *
 * @example
 * ```typescript
 * // Импорт отдельных SDK
 * import { enterprisesSDK, membersSDK, referenceSDK } from '@/shared/api/sdk';
 *
 * // Использование
 * const enterprises = await enterprisesSDK.getAll();
 * const members = await membersSDK.getAll('enterprise-id');
 * const locales = await referenceSDK.getLocales();
 * ```
 */

// SDK классы (для расширения если нужно)
export { EnterprisesSDK } from "./enterprises.sdk";
export { MembersSDK } from "./members.sdk";
export { ReferenceSDK } from "./reference.sdk";

// Singleton экземпляры (для использования по умолчанию)
export { enterprisesSDK } from "./enterprises.sdk";
export { membersSDK } from "./members.sdk";
export { referenceSDK } from "./reference.sdk";
