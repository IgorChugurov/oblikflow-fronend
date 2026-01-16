/**
 * Auth Handler - обработка авторизации и refresh токена
 */

import { createBrowserSupabaseClient } from '../../../auth-sdk/client/supabase-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequestConfig, ApiResult } from './types';

export class AuthHandler {
  private supabaseClient: SupabaseClient | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  /**
   * Получить текущий JWT токен из Supabase session
   */
  async getToken(): Promise<string | null> {
    const supabase = this.getSupabaseClient();
    if (!supabase) return null;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      return session?.access_token || null;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Обработка 401 ошибки - refresh токена и retry запроса
   */
  async handle401<T>(
    config: RequestConfig,
    executeRequest: (token: string | null) => Promise<ApiResult<T>>
  ): Promise<ApiResult<T>> {
    // Попробовать обновить токен
    const newToken = await this.refreshToken();

    if (!newToken) {
      // Не удалось обновить токен - logout
      this.handleLogout();

      return {
        error: {
          message: 'Session expired. Please login again.',
          code: 'UNAUTHORIZED',
          statusCode: 401,
        },
        status: 401,
      };
    }

    // Повторить оригинальный запрос с новым токеном
    return executeRequest(newToken);
  }

  /**
   * Refresh JWT токена через Supabase
   * Защита от race condition - если уже идет refresh, ждем его
   */
  private async refreshToken(): Promise<string | null> {
    // Если уже идет refresh - ждем его завершения
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Запустить новый refresh
    this.refreshPromise = this.performRefresh();

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      // Очистить promise после завершения
      this.refreshPromise = null;
    }
  }

  /**
   * Выполнить refresh токена
   */
  private async performRefresh(): Promise<string | null> {
    const supabase = this.getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        console.error('Failed to refresh session:', error);
        return null;
      }

      return data.session.access_token;
    } catch (error) {
      console.error('Error during token refresh:', error);
      return null;
    }
  }

  /**
   * Logout пользователя и редирект на /login
   */
  private handleLogout(): void {
    const supabase = this.getSupabaseClient();

    if (supabase) {
      // Logout в Supabase
      supabase.auth.signOut().catch((error) => {
        console.error('Failed to sign out:', error);
      });
    }

    // Редирект на login (только в браузере)
    if (typeof window !== 'undefined') {
      // Сохранить текущий путь для redirect после логина
      const currentPath = window.location.pathname + window.location.search;
      const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`;

      window.location.href = loginUrl;
    }
  }

  /**
   * Получить или создать Supabase клиент
   */
  private getSupabaseClient(): SupabaseClient | null {
    // Работает только в браузере
    if (typeof window === 'undefined') {
      return null;
    }

    // Создать клиент если еще не создан
    if (!this.supabaseClient) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Missing Supabase environment variables');
        return null;
      }

      this.supabaseClient = createBrowserSupabaseClient(
        supabaseUrl,
        supabaseAnonKey
      );
    }

    return this.supabaseClient;
  }

  /**
   * Проверить является ли пользователь авторизованным
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }
}
