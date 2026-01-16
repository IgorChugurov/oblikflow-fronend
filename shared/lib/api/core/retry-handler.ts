/**
 * Retry Handler - retry логика с exponential backoff
 */

import type { RetryConfig, ApiResult, DEFAULT_RETRY_CONFIG } from './types';

export class RetryHandler {
  private defaultConfig: RetryConfig;

  constructor(defaultConfig?: Partial<RetryConfig>) {
    this.defaultConfig = {
      maxRetries: defaultConfig?.maxRetries ?? 3,
      baseDelay: defaultConfig?.baseDelay ?? 1000,
      maxDelay: defaultConfig?.maxDelay ?? 10000,
      exponential: defaultConfig?.exponential ?? true,
    };
  }

  /**
   * Выполнить запрос с retry логикой
   */
  async executeWithRetry<T>(
    executor: () => Promise<ApiResult<T>>,
    retryConfig?: RetryConfig,
    shouldRetryFn?: (status: number, attempt: number) => boolean
  ): Promise<ApiResult<T>> {
    const config = retryConfig || this.defaultConfig;
    let lastResult: ApiResult<T> | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      // Выполнить запрос
      const result = await executor();

      // Успешный запрос
      if (!result.error) {
        return result;
      }

      // Сохранить результат
      lastResult = result;

      // Проверить нужен ли retry
      const shouldRetry = shouldRetryFn
        ? shouldRetryFn(result.status, attempt)
        : this.shouldRetry(result.status, attempt, config.maxRetries);

      if (!shouldRetry) {
        // Не нужен retry - вернуть ошибку
        return result;
      }

      // Вычислить задержку перед следующей попыткой
      const delay = this.calculateDelay(attempt, config);

      // Подождать перед следующей попыткой
      await this.sleep(delay);
    }

    // Вернуть последний результат
    return lastResult!;
  }

  /**
   * Проверить нужен ли retry для данной ошибки
   */
  private shouldRetry(
    status: number,
    attempt: number,
    maxRetries: number
  ): boolean {
    // Достигли максимального количества попыток
    if (attempt >= maxRetries) {
      return false;
    }

    // Retry только для временных ошибок
    // 408 Request Timeout
    // 429 Too Many Requests
    // 500 Internal Server Error
    // 502 Bad Gateway
    // 503 Service Unavailable
    // 504 Gateway Timeout
    const retryableStatuses = [408, 429, 500, 502, 503, 504];

    return retryableStatuses.includes(status);
  }

  /**
   * Вычислить задержку для exponential backoff
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    if (!config.exponential) {
      // Фиксированная задержка
      return config.baseDelay;
    }

    // Exponential backoff: baseDelay * (2 ^ attempt)
    const exponentialDelay = config.baseDelay * Math.pow(2, attempt);

    // Добавить jitter (случайность) для избежания thundering herd
    const jitter = Math.random() * 0.3 * exponentialDelay; // ±30%

    // Применить max delay cap
    const delay = Math.min(exponentialDelay + jitter, config.maxDelay);

    return delay;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Получить конфигурацию retry по умолчанию
   */
  getDefaultConfig(): RetryConfig {
    return { ...this.defaultConfig };
  }

  /**
   * Обновить конфигурацию retry по умолчанию
   */
  updateDefaultConfig(config: Partial<RetryConfig>): void {
    this.defaultConfig = {
      ...this.defaultConfig,
      ...config,
    };
  }
}
