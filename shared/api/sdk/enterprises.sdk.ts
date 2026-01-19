/**
 * Enterprises SDK
 *
 * SDK для работы с API предприятий.
 * Использует существующий httpClient для всех запросов.
 *
 * @example
 * ```typescript
 * import { enterprisesSDK } from '@/shared/api/sdk';
 *
 * // Получить список предприятий
 * const result = await enterprisesSDK.getAll();
 *
 * // Создать предприятие
 * const newEnterprise = await enterprisesSDK.create({
 *   name: "My Company",
 *   country_code: "UA",
 *   default_currency: "UAH",
 * });
 * ```
 */

import { httpClient } from "../../lib/api/http-client";
import type {
  EnterpriseListResponse,
  EnterpriseDetailsResponse,
  CreateEnterpriseDto,
  CreateEnterpriseResponse,
  UpdateEnterpriseDto,
  UpdateEnterpriseResponse,
} from "../../types/enterprises";
import type { ApiResult } from "../../lib/api/core/types";

export class EnterprisesSDK {
  private readonly basePath = "/api/enterprises";

  /**
   * Получить список всех предприятий текущего пользователя
   *
   * @returns Список предприятий с ролями
   * @throws {Error} При ошибке сети или 401/403
   *
   * @example
   * ```typescript
   * const result = await enterprisesSDK.getAll();
   *
   * if ('error' in result) {
   *   console.error(result.error);
   * } else {
   *   console.log(result.data.data); // Enterprise[]
   * }
   * ```
   */
  async getAll(): Promise<ApiResult<EnterpriseListResponse>> {
    return httpClient.get<EnterpriseListResponse>(this.basePath);
  }

  /**
   * Получить детали одного предприятия
   *
   * @param id - UUID предприятия
   * @returns Детали предприятия с ролью текущего пользователя
   * @throws {Error} При ошибке 404 (не найдено) или 403 (нет доступа)
   *
   * @example
   * ```typescript
   * const result = await enterprisesSDK.getById('550e8400-e29b-41d4-a716-446655440000');
   *
   * if ('error' in result) {
   *   console.error(result.error);
   * } else {
   *   console.log(result.data.data.name);
   * }
   * ```
   */
  async getById(id: string): Promise<ApiResult<EnterpriseDetailsResponse>> {
    return httpClient.get<EnterpriseDetailsResponse>(`${this.basePath}/${id}`);
  }

  /**
   * Создать новое предприятие
   *
   * Пользователь автоматически становится owner.
   * Создаются роли owner/admin с полными правами.
   *
   * @param data - Данные для создания предприятия
   * @returns Созданное предприятие
   * @throws {Error} При ошибке валидации (400/422)
   *
   * @example
   * ```typescript
   * const result = await enterprisesSDK.create({
   *   name: "ФОП Іванов",
   *   country_code: "UA",
   *   default_currency: "UAH",
   *   default_locale: "uk",
   * });
   *
   * if ('error' in result) {
   *   console.error('Failed to create:', result.error.message);
   * } else {
   *   console.log('Created with ID:', result.data.data.id);
   * }
   * ```
   */
  async create(
    data: CreateEnterpriseDto
  ): Promise<ApiResult<CreateEnterpriseResponse>> {
    return httpClient.post<CreateEnterpriseResponse>(this.basePath, data);
  }

  /**
   * Обновить настройки предприятия
   *
   * Доступно только owner и admin.
   * Нельзя изменить owner_user_id и country_code.
   *
   * @param id - UUID предприятия
   * @param data - Данные для обновления (только измененные поля)
   * @returns Обновленное предприятие
   * @throws {Error} При ошибке 403 (нет прав) или 404 (не найдено)
   *
   * @example
   * ```typescript
   * const result = await enterprisesSDK.update(
   *   '550e8400-e29b-41d4-a716-446655440000',
   *   { name: "Новое название" }
   * );
   *
   * if ('error' in result) {
   *   console.error('Failed to update:', result.error.message);
   * } else {
   *   console.log('Updated:', result.data.data.name);
   * }
   * ```
   */
  async update(
    id: string,
    data: UpdateEnterpriseDto
  ): Promise<ApiResult<UpdateEnterpriseResponse>> {
    return httpClient.patch<UpdateEnterpriseResponse>(
      `${this.basePath}/${id}`,
      data
    );
  }
}

// Singleton экземпляр для использования по умолчанию
export const enterprisesSDK = new EnterprisesSDK();
