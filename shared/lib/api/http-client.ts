/**
 * HTTP Client - главный фасад для работы с Backend API
 * Объединяет все модули и предоставляет удобный API
 */

import { RequestHandler } from "./core/request-handler";
import { ErrorHandler } from "./core/error-handler";
import { AuthHandler } from "./core/auth-handler";
import { RetryHandler } from "./core/retry-handler";
import { QueueHandler } from "./core/queue-handler";
import type {
  HttpClientConfig,
  RequestConfig,
  RequestOptions,
  ApiResult,
  RequestInterceptor,
  ResponseInterceptor,
} from "./core/types";

const DEFAULT_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3054";

export class HttpClient {
  private requestHandler: RequestHandler;
  private errorHandler: ErrorHandler;
  private authHandler: AuthHandler;
  private retryHandler: RetryHandler;
  private queueHandler: QueueHandler;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor(config: HttpClientConfig = {}) {
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;

    this.requestHandler = new RequestHandler(baseUrl);
    this.errorHandler = new ErrorHandler();
    this.authHandler = new AuthHandler();
    this.retryHandler = new RetryHandler(config.retryConfig);

    const queueMaxSize = config.queueMaxSize || 50;
    this.queueHandler = new QueueHandler(queueMaxSize);
  }

  /**
   * Универсальный метод для выполнения запросов
   */
  async request<T>(config: RequestConfig): Promise<ApiResult<T>> {
    // Применить request interceptors
    let modifiedConfig = config;
    for (const interceptor of this.requestInterceptors) {
      modifiedConfig = await interceptor(modifiedConfig);
    }

    // Проверить offline режим
    if (this.queueHandler.isOffline() && config.method !== "GET") {
      // Для не-GET запросов добавить в очередь
      return this.queueHandler.enqueue(modifiedConfig, () =>
        this.executeRequest<T>(modifiedConfig)
      );
    }

    // Выполнить запрос
    let result = await this.executeRequest<T>(modifiedConfig);

    // Применить response interceptors
    for (const interceptor of this.responseInterceptors) {
      result = (await interceptor(result)) as ApiResult<T>;
    }

    return result;
  }

  /**
   * Выполнить запрос с retry логикой
   */
  private async executeRequest<T>(
    config: RequestConfig
  ): Promise<ApiResult<T>> {
    // Выполнить с retry
    return this.retryHandler.executeWithRetry(
      async () => {
        // Получить токен
        const token = config.skipAuth
          ? null
          : await this.authHandler.getToken();

        // Выполнить запрос
        const result = await this.requestHandler.execute<T>(config, token);

        // Проверить на ошибки
        if (result.status >= 400) {
          // Обработать 401 - refresh токена
          if (
            this.errorHandler.isUnauthorized(result.status) &&
            !config.skipAuth
          ) {
            return this.authHandler.handle401(config, (newToken) =>
              this.requestHandler.execute<T>(config, newToken)
            );
          }

          // Создать ApiError для других ошибок
          const error = this.errorHandler.handle(result.status, result.data);

          return {
            error,
            status: result.status,
          };
        }

        return result;
      },
      config.retryConfig,
      (status, attempt) => this.errorHandler.shouldRetry(status)
    );
  }

  /**
   * GET запрос
   */
  async get<T>(url: string, options?: RequestOptions): Promise<ApiResult<T>> {
    return this.request<T>({
      url,
      method: "GET",
      ...options,
    });
  }

  /**
   * POST запрос
   */
  async post<T>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResult<T>> {
    return this.request<T>({
      url,
      method: "POST",
      body,
      ...options,
    });
  }

  /**
   * PATCH запрос
   */
  async patch<T>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResult<T>> {
    return this.request<T>({
      url,
      method: "PATCH",
      body,
      ...options,
    });
  }

  /**
   * PUT запрос
   */
  async put<T>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResult<T>> {
    return this.request<T>({
      url,
      method: "PUT",
      body,
      ...options,
    });
  }

  /**
   * DELETE запрос
   */
  async delete<T>(
    url: string,
    options?: RequestOptions
  ): Promise<ApiResult<T>> {
    return this.request<T>({
      url,
      method: "DELETE",
      ...options,
    });
  }

  /**
   * Создать AbortController для отмены запроса
   */
  createAbortController(): AbortController {
    return new AbortController();
  }

  /**
   * Добавить request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Добавить response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Удалить все interceptors
   */
  clearInterceptors(): void {
    this.requestInterceptors = [];
    this.responseInterceptors = [];
  }

  /**
   * Получить статус online/offline
   */
  isOnline(): boolean {
    return !this.queueHandler.isOffline();
  }

  /**
   * Получить размер очереди
   */
  getQueueSize(): number {
    return this.queueHandler.getQueueSize();
  }

  /**
   * Очистить очередь запросов
   */
  clearQueue(): void {
    this.queueHandler.clearQueue();
  }
}

// Singleton instance для использования по умолчанию
export const httpClient = new HttpClient();
