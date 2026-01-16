/**
 * API Client - Public API
 * Экспортирует все необходимые функции и типы
 */

// HTTP Client
export { httpClient, HttpClient } from './http-client';

// Core Types
export type {
  ApiResult,
  ApiError,
  RequestConfig,
  RequestOptions,
  RetryConfig,
  HttpClientConfig,
  RequestInterceptor,
  ResponseInterceptor,
} from './core/types';

export { ErrorCode, HTTP_STATUS } from './core/types';

// Services
export {
  fetchLocales,
  fetchLocalesWithFallback,
  type LocaleDto,
  type LocalesResponse,
} from './services/locale-service';
