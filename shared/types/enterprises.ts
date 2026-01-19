/**
 * TypeScript типы для работы с Enterprises API
 *
 * @module shared/types/enterprises
 * @version 1.0.0
 * @date 2026-01-17
 *
 * Основано на backend спецификации:
 * - /docs/FRONTEND/API_CONTRACT.md
 * - /docs/FRONTEND/BACKEND_API_SPEC.md
 * - /docs/api-specifications/openapi/openapi-v1.yaml
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Статус предприятия
 */
export type EnterpriseStatus = "active" | "inactive" | "suspended";

/**
 * Роль пользователя в предприятии
 */
export type UserRole = "owner" | "admin";

/**
 * Статус участника
 */
export type MemberStatus = "active" | "inactive";

// ============================================================================
// Enterprise Entity
// ============================================================================

/**
 * Основная сущность предприятия
 */
export interface Enterprise {
  /** UUID предприятия */
  id: string;

  /** Название предприятия */
  name: string;

  /** Код страны регистрации (ISO 3166-1 alpha-2) */
  country_code: string;

  /** Валюта учета (ISO 4217) */
  default_currency: string;

  /** Язык интерфейса (ISO 639-1), null = использовать DEFAULT_LOCALE из .env */
  default_locale?: string | null;

  /** Статус предприятия */
  status: EnterpriseStatus;

  /** UUID владельца предприятия */
  owner_user_id: string;

  /** Роль текущего пользователя (заполняется API) */
  role?: UserRole;

  /** Является ли текущий пользователь владельцем (заполняется API) */
  is_owner?: boolean;

  /** Дата создания (ISO 8601) */
  created_at: string;

  /** Дата обновления (ISO 8601) */
  updated_at?: string;

  /** UUID создателя */
  created_by?: string;

  /** Дата мягкого удаления (ISO 8601) */
  deleted_at?: string | null;

  /** Дополнительные настройки (JSON) */
  settings_json?: Record<string, any>;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO для создания нового предприятия
 */
export interface CreateEnterpriseDto {
  /** Название предприятия (обязательно, мин. 1 символ) */
  name: string;

  /** Код страны регистрации (обязательно, ISO 3166-1 alpha-2) */
  country_code: string;

  /** Валюта учета (обязательно, ISO 4217) */
  default_currency: string;

  /** Язык интерфейса (опционально, ISO 639-1) */
  default_locale?: string;
}

/**
 * DTO для обновления существующего предприятия
 * Все поля опциональны - обновляются только переданные
 */
export interface UpdateEnterpriseDto {
  /** Новое название предприятия */
  name?: string;

  /** Новая валюта учета */
  default_currency?: string;

  /** Новый язык интерфейса */
  default_locale?: string;
  
  /** Статус предприятия (для soft delete) */
  status?: EnterpriseStatus;
}

// ============================================================================
// Member Entity
// ============================================================================

/**
 * Участник предприятия (owner или admin)
 */
export interface Member {
  /** UUID пользователя */
  user_id: string;

  /** Email пользователя */
  email: string;

  /** Имя пользователя */
  name: string;

  /** Роль в предприятии */
  role: UserRole;

  /** Является ли владельцем */
  is_owner: boolean;

  /** Статус участника */
  status: MemberStatus;

  /** Дата присоединения (ISO 8601) */
  joined_at: string;

  /** UUID пригласившего пользователя */
  invited_by?: string;
}

/**
 * DTO для добавления нового участника (admin)
 */
export interface AddMemberDto {
  /** Email пользователя для приглашения (должен быть зарегистрирован) */
  email: string;
}

// ============================================================================
// API Response Wrappers
// ============================================================================

/**
 * Метаданные ответа API
 */
export interface ApiMeta {
  /** Общее количество записей (для списков) */
  total?: number;

  /** Номер текущей страницы (для пагинации) */
  page?: number;

  /** Количество записей на странице (для пагинации) */
  limit?: number;

  /** Timestamp запроса */
  timestamp?: string;

  /** ID запроса для отладки */
  request_id?: string;
}

/**
 * Обертка успешного ответа API
 */
export interface ApiResponse<T> {
  /** Данные ответа */
  data: T;

  /** Метаданные */
  meta?: ApiMeta;
}

/**
 * Детали ошибки API
 */
export interface ApiErrorDetails {
  /** Код ошибки */
  code: string;

  /** Человекочитаемое сообщение */
  message: string;

  /** Дополнительные детали */
  details?: Record<string, any>;

  /** Поле с ошибкой (для валидации) */
  field?: string;
}

/**
 * Обертка ошибки API
 */
export interface ApiError {
  /** Информация об ошибке */
  error: ApiErrorDetails;

  /** Метаданные */
  meta?: ApiMeta;
}

/**
 * Результат API запроса (успех или ошибка)
 */
export type ApiResult<T> = ApiResponse<T> | ApiError;

// ============================================================================
// Specific Response Types
// ============================================================================

/**
 * Ответ на запрос списка предприятий
 */
export type EnterpriseListResponse = ApiResponse<Enterprise[]>;

/**
 * Ответ на запрос деталей предприятия
 */
export type EnterpriseDetailsResponse = ApiResponse<Enterprise>;

/**
 * Ответ на запрос создания предприятия
 */
export type CreateEnterpriseResponse = ApiResponse<Enterprise>;

/**
 * Ответ на запрос обновления предприятия
 */
export type UpdateEnterpriseResponse = ApiResponse<Enterprise>;

/**
 * Ответ на запрос списка участников
 */
export type MemberListResponse = ApiResponse<Member[]>;

/**
 * Ответ на запрос добавления участника
 */
export type AddMemberResponse = ApiResponse<Member>;

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Типичные коды ошибок API
 */
export enum ApiErrorCode {
  // Авторизация
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",

  // Валидация
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_REQUEST = "INVALID_REQUEST",

  // Ресурсы
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",

  // Бизнес-логика
  CANNOT_REMOVE_OWNER = "CANNOT_REMOVE_OWNER",
  USER_NOT_REGISTERED = "USER_NOT_REGISTERED",
  USER_ALREADY_MEMBER = "USER_ALREADY_MEMBER",
  PERIOD_CLOSED = "PERIOD_CLOSED",

  // Сервер
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Проверка, является ли ответ ошибкой
 */
export function isApiError(response: ApiResult<any>): response is ApiError {
  return "error" in response;
}

/**
 * Проверка, является ли ответ успешным
 */
export function isApiSuccess<T>(
  response: ApiResult<T>
): response is ApiResponse<T> {
  return "data" in response && !("error" in response);
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Опции для запроса списка предприятий
 */
export interface GetEnterprisesOptions {
  /** Включить неактивные предприятия */
  include_inactive?: boolean;

  /** Сортировка */
  sort?: "name" | "created_at" | "-name" | "-created_at";
}

/**
 * Опции для запроса списка участников
 */
export interface GetMembersOptions {
  /** Включить неактивных участников */
  include_inactive?: boolean;

  /** Сортировка */
  sort?: "name" | "joined_at" | "-name" | "-joined_at";
}

// ============================================================================
// Reference Data Types (для форм)
// ============================================================================

/**
 * Язык интерфейса (API entity)
 */
export interface LocaleEntity {
  /** Код языка (ISO 639-1) */
  code: string;

  /** Название на родном языке */
  name_native: string;

  /** Название на английском */
  name_en: string;

  /** Активен ли */
  is_active: boolean;
}

/**
 * Валюта
 */
export interface Currency {
  /** Код валюты (ISO 4217) */
  code: string;

  /** Символ валюты */
  symbol: string;

  /** Название на английском */
  name_en: string;

  /** Название на родном языке */
  name_native?: string;

  /** Количество знаков после запятой */
  decimal_places: number;

  /** Активна ли */
  is_active: boolean;
}

/**
 * Страна
 */
export interface Country {
  /** Код страны (ISO 3166-1 alpha-2) */
  code: string;

  /** Код страны (ISO 3166-1 alpha-3) */
  code_alpha3?: string;

  /** Название на английском */
  name_en: string;

  /** Название на родном языке */
  name_native?: string;

  /** Валюта по умолчанию */
  default_currency?: string;

  /** Телефонный код */
  phone_code?: string;

  /** Активна ли */
  is_active: boolean;
}

/**
 * Ответ на запрос списка локалей
 */
export type LocaleListResponse = ApiResponse<LocaleEntity[]>;

/**
 * Ответ на запрос списка валют
 */
export type CurrencyListResponse = ApiResponse<Currency[]>;

/**
 * Ответ на запрос списка стран
 */
export type CountryListResponse = ApiResponse<Country[]>;
