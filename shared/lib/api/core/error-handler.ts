/**
 * Error Handler - обработка и маппинг HTTP ошибок
 */

import { ApiError, ErrorCode, HTTP_STATUS } from "./types";

export class ErrorHandler {
  /**
   * Обработать HTTP ошибку и создать ApiError
   */
  handle(status: number, responseBody?: unknown): ApiError {
    // Попытаться извлечь message из body
    const errorMessage = this.extractErrorMessage(responseBody);

    // Маппинг статусов в ошибки
    return this.mapStatusToError(status, errorMessage, responseBody);
  }

  /**
   * Маппинг HTTP статусов в ApiError
   */
  private mapStatusToError(
    status: number,
    message?: string,
    details?: unknown
  ): ApiError {
    switch (status) {
      case HTTP_STATUS.BAD_REQUEST:
        return {
          message: message || "Invalid request",
          code: ErrorCode.VALIDATION_ERROR,
          statusCode: status,
          details,
        };

      case HTTP_STATUS.UNAUTHORIZED:
        return {
          message: message || "Unauthorized. Please login again.",
          code: ErrorCode.UNAUTHORIZED,
          statusCode: status,
          details,
        };

      case HTTP_STATUS.FORBIDDEN:
        return {
          message: message || "Access denied",
          code: ErrorCode.FORBIDDEN,
          statusCode: status,
          details,
        };

      case HTTP_STATUS.NOT_FOUND:
        return {
          message: message || "Resource not found",
          code: ErrorCode.NOT_FOUND,
          statusCode: status,
          details,
        };

      case HTTP_STATUS.CONFLICT:
        return {
          message: message || "Resource already exists",
          code: ErrorCode.CONFLICT,
          statusCode: status,
          details,
        };

      case HTTP_STATUS.VALIDATION_ERROR:
        return {
          message: message || "Validation error",
          code: ErrorCode.VALIDATION_ERROR,
          statusCode: status,
          details,
        };

      case HTTP_STATUS.TOO_MANY_REQUESTS:
        return {
          message: message || "Too many requests. Please try again later.",
          code: ErrorCode.TOO_MANY_REQUESTS,
          statusCode: status,
          details,
        };

      case HTTP_STATUS.SERVER_ERROR:
        return {
          message: message || "Internal server error",
          code: ErrorCode.SERVER_ERROR,
          statusCode: status,
          details,
        };

      case HTTP_STATUS.BAD_GATEWAY:
      case HTTP_STATUS.SERVICE_UNAVAILABLE:
      case HTTP_STATUS.GATEWAY_TIMEOUT:
        return {
          message: message || "Service temporarily unavailable",
          code: ErrorCode.SERVICE_UNAVAILABLE,
          statusCode: status,
          details,
        };

      default:
        // Network error (status = 0)
        if (status === 0) {
          return {
            message: message || "Network error. Please check your connection.",
            code: ErrorCode.NETWORK_ERROR,
            statusCode: 0,
            details,
          };
        }

        // Unknown error
        return {
          message: message || "An unexpected error occurred",
          code: ErrorCode.UNKNOWN,
          statusCode: status,
          details,
        };
    }
  }

  /**
   * Извлечь error message из response body
   */
  private extractErrorMessage(body: unknown): string | undefined {
    if (!body) return undefined;

    // Стандартный формат: { message: "..." }
    if (typeof body === "object" && body !== null) {
      const errorBody = body as Record<string, unknown>;

      // NestJS стандартный формат
      if ("message" in errorBody && typeof errorBody.message === "string") {
        return errorBody.message;
      }

      // Альтернативный формат: { error: { message: "..." } }
      if ("error" in errorBody && typeof errorBody.error === "object") {
        const errorObj = errorBody.error as Record<string, unknown>;
        if ("message" in errorObj && typeof errorObj.message === "string") {
          return errorObj.message;
        }
      }

      // Формат с массивом ошибок (validation errors)
      if ("errors" in errorBody && Array.isArray(errorBody.errors)) {
        const firstError = errorBody.errors[0];
        if (
          typeof firstError === "object" &&
          firstError !== null &&
          "message" in firstError
        ) {
          return (firstError as { message: string }).message;
        }
      }
    }

    return undefined;
  }

  /**
   * Проверить нужен ли retry для данного статуса
   */
  shouldRetry(status: number): boolean {
    // Retry только для временных ошибок
    const retryableStatuses = [
      HTTP_STATUS.TOO_MANY_REQUESTS,
      HTTP_STATUS.SERVER_ERROR,
      HTTP_STATUS.BAD_GATEWAY,
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      HTTP_STATUS.GATEWAY_TIMEOUT,
    ] as const;
    return (retryableStatuses as readonly number[]).includes(status);
  }

  /**
   * Проверить является ли ошибка 401
   */
  isUnauthorized(status: number): boolean {
    return status === HTTP_STATUS.UNAUTHORIZED;
  }
}
