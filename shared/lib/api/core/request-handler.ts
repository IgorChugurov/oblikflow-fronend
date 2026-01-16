/**
 * Request Handler - обработка HTTP запросов
 * Отвечает за формирование headers и выполнение fetch
 */

import type { RequestConfig, ApiResult } from './types';

export class RequestHandler {
  constructor(private baseUrl: string) {}

  /**
   * Выполнить fetch запрос
   */
  async execute<T>(
    config: RequestConfig,
    token: string | null
  ): Promise<ApiResult<T>> {
    const url = this.buildUrl(config.url);
    const headers = this.buildHeaders(config, token);
    const body = this.serializeBody(config.body);

    try {
      const response = await fetch(url, {
        method: config.method,
        headers,
        body,
        signal: config.signal,
      });

      const responseData = await this.parseResponse(response);

      return {
        data: responseData as T,
        status: response.status,
      };
    } catch (error) {
      // Network errors, timeouts, etc.
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            error: {
              message: 'Request was cancelled',
              code: 'CANCELLED',
              statusCode: 0,
            },
            status: 0,
          };
        }

        return {
          error: {
            message: error.message || 'Network error',
            code: 'NETWORK_ERROR',
            statusCode: 0,
          },
          status: 0,
        };
      }

      return {
        error: {
          message: 'Unknown error',
          code: 'UNKNOWN',
          statusCode: 0,
        },
        status: 0,
      };
    }
  }

  /**
   * Построить полный URL
   */
  private buildUrl(endpoint: string): string {
    // Если endpoint уже полный URL - использовать как есть
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }

    // Убрать начальный слеш если есть
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    return `${this.baseUrl}${cleanEndpoint}`;
  }

  /**
   * Построить headers для запроса
   */
  private buildHeaders(
    config: RequestConfig,
    token: string | null
  ): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    // Добавить Authorization header если есть токен
    if (token && !config.skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Добавить X-Enterprise-ID если нужно
    if (config.includeEnterpriseId) {
      const enterpriseId = this.getEnterpriseId();
      if (enterpriseId) {
        headers['X-Enterprise-ID'] = enterpriseId;
      }
    }

    return headers;
  }

  /**
   * Получить Enterprise ID из cookie/localStorage
   */
  private getEnterpriseId(): string | null {
    if (typeof window === 'undefined') return null;

    // Production: cookie
    if (process.env.NODE_ENV === 'production') {
      const cookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('current_enterprise_id='));
      return cookie ? cookie.split('=')[1] : null;
    }

    // Development: localStorage
    return localStorage.getItem('current_enterprise_id');
  }

  /**
   * Сериализовать body для отправки
   */
  private serializeBody(body: unknown): string | undefined {
    if (!body) return undefined;

    if (typeof body === 'string') {
      return body;
    }

    try {
      return JSON.stringify(body);
    } catch (error) {
      console.error('Failed to serialize request body:', error);
      return undefined;
    }
  }

  /**
   * Парсинг response body
   */
  private async parseResponse(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type');

    // No content
    if (response.status === 204) {
      return null;
    }

    // JSON response
    if (contentType?.includes('application/json')) {
      try {
        return await response.json();
      } catch (error) {
        console.error('Failed to parse JSON response:', error);
        return null;
      }
    }

    // Text response
    if (contentType?.includes('text/')) {
      return await response.text();
    }

    // Default to text
    return await response.text();
  }
}
