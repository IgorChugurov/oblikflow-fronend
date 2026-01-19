/**
 * Members SDK
 *
 * SDK для работы с участниками предприятий.
 * Управление командой (добавление/удаление admin).
 *
 * @example
 * ```typescript
 * import { membersSDK } from '@/shared/api/sdk';
 *
 * // Получить список участников
 * const members = await membersSDK.getAll('enterprise-id');
 *
 * // Добавить admin
 * await membersSDK.add('enterprise-id', { email: 'admin@example.com' });
 * ```
 */

import { httpClient } from "../../lib/api/http-client";
import type {
  MemberListResponse,
  AddMemberDto,
  AddMemberResponse,
} from "../../types/enterprises";
import type { ApiResult } from "../../lib/api/core/types";

export class MembersSDK {
  private readonly basePath = "/api/enterprises";

  /**
   * Получить список участников предприятия
   *
   * Доступно только owner и admin.
   * Включает owner предприятия в списке.
   *
   * @param enterpriseId - UUID предприятия
   * @returns Список участников (owner + admins)
   * @throws {Error} При ошибке 403 (нет прав) или 404 (не найдено)
   *
   * @example
   * ```typescript
   * const result = await membersSDK.getAll('550e8400-e29b-41d4-a716-446655440000');
   *
   * if ('error' in result) {
   *   console.error(result.error);
   * } else {
   *   const members = result.data.data;
   *   const owner = members.find(m => m.is_owner);
   *   const admins = members.filter(m => !m.is_owner);
   * }
   * ```
   */
  async getAll(enterpriseId: string): Promise<ApiResult<MemberListResponse>> {
    return httpClient.get<MemberListResponse>(
      `${this.basePath}/${enterpriseId}/members`
    );
  }

  /**
   * Добавить admin в предприятие
   *
   * Приглашает существующего пользователя как admin.
   * Доступно только owner и admin.
   *
   * **Важно:** Пользователь должен быть уже зарегистрирован!
   *
   * @param enterpriseId - UUID предприятия
   * @param data - Email существующего пользователя
   * @returns Добавленный участник
   * @throws {Error}
   *   - 404: Пользователь не найден (не зарегистрирован)
   *   - 409: Пользователь уже участник
   *   - 403: Нет прав
   *
   * @example
   * ```typescript
   * const result = await membersSDK.add(
   *   '550e8400-e29b-41d4-a716-446655440000',
   *   { email: 'newadmin@example.com' }
   * );
   *
   * if ('error' in result) {
   *   if (result.error.code === 'USER_NOT_FOUND') {
   *     console.error('User must register first');
   *   } else if (result.error.code === 'ALREADY_MEMBER') {
   *     console.error('User is already a member');
   *   }
   * } else {
   *   console.log('Added:', result.data.data.name);
   * }
   * ```
   */
  async add(
    enterpriseId: string,
    data: AddMemberDto
  ): Promise<ApiResult<AddMemberResponse>> {
    return httpClient.post<AddMemberResponse>(
      `${this.basePath}/${enterpriseId}/members`,
      data
    );
  }

  /**
   * Удалить admin из предприятия
   *
   * Удаляет участника из команды предприятия.
   * Доступно только owner и admin.
   *
   * **Важно:** Нельзя удалить owner!
   *
   * @param enterpriseId - UUID предприятия
   * @param userId - UUID пользователя для удаления
   * @returns void (204 No Content)
   * @throws {Error}
   *   - 400: Попытка удалить owner
   *   - 404: Пользователь не найден
   *   - 403: Нет прав
   *
   * @example
   * ```typescript
   * const result = await membersSDK.remove(
   *   '550e8400-e29b-41d4-a716-446655440000',
   *   'user-uuid-123'
   * );
   *
   * if ('error' in result) {
   *   if (result.error.code === 'CANNOT_REMOVE_OWNER') {
   *     console.error('Cannot remove owner from enterprise');
   *   } else {
   *     console.error(result.error.message);
   *   }
   * } else {
   *   console.log('Member removed successfully');
   * }
   * ```
   */
  async remove(enterpriseId: string, userId: string): Promise<ApiResult<void>> {
    return httpClient.delete<void>(
      `${this.basePath}/${enterpriseId}/members/${userId}`
    );
  }
}

// Singleton экземпляр для использования по умолчанию
export const membersSDK = new MembersSDK();
