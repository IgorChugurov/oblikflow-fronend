/**
 * Core типы для HTTP клиента
 */

// ============================================
// REQUEST CONFIGURATION
// ============================================

export interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown;
  headers?: Record<string, string>;
  includeEnterpriseId?: boolean;
  signal?: AbortSignal;
  retryConfig?: RetryConfig;
  skipAuth?: boolean; // Для публичных endpoints
}

export interface RequestOptions {
  headers?: Record<string, string>;
  includeEnterpriseId?: boolean;
  signal?: AbortSignal;
  retryConfig?: RetryConfig;
  skipAuth?: boolean;
}

// ============================================
// RETRY CONFIGURATION
// ============================================

export interface RetryConfig {
  maxRetries: number;      // default: 3
  baseDelay: number;       // default: 1000ms
  maxDelay: number;        // default: 10000ms
  exponential: boolean;    // default: true
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  exponential: true,
};

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResult<T> {
  data?: T;
  error?: ApiError;
  status: number;
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: unknown;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// ============================================
// QUEUE TYPES
// ============================================

export interface QueuedRequest {
  id: string;
  config: RequestConfig;
  resolve: (value: ApiResult<unknown>) => void;
  reject: (reason?: unknown) => void;
  timestamp: number;
  priority?: number;
}

// ============================================
// INTERCEPTOR TYPES
// ============================================

export type RequestInterceptor = (
  config: RequestConfig
) => RequestConfig | Promise<RequestConfig>;

export type ResponseInterceptor = (
  result: ApiResult<unknown>
) => ApiResult<unknown> | Promise<ApiResult<unknown>>;

// ============================================
// HTTP CLIENT CONFIGURATION
// ============================================

export interface HttpClientConfig {
  baseUrl?: string;
  retryConfig?: Partial<RetryConfig>;
  queueEnabled?: boolean;
  queueMaxSize?: number;
}

// ============================================
// ERROR CODES
// ============================================

export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

// ============================================
// HTTP STATUS CODES
// ============================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;
