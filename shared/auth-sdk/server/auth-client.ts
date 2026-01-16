/**
 * Серверный клиент авторизации
 * Используется в Server Components, API Routes, Server Actions
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "../types";
import { transformSupabaseUser } from "../utils/transform";

export class ServerAuthClient {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Получение текущего пользователя на сервере
   * Возвращает базовую информацию о пользователе из Supabase Auth
   * 
   * Проверки ролей и доступов выполняются:
   * - В middleware через Backend API (для рендеринга приложений)
   * - В Backend API при запросах данных
   */
  async getUser(): Promise<User | null> {
    try {
      const {
        data: { user: supabaseUser },
        error,
      } = await this.supabase.auth.getUser();

      if (error || !supabaseUser) {
        return null;
      }

      const user = transformSupabaseUser(supabaseUser);

      return user;
    } catch (error) {
      console.error("[ServerAuth] Error getting user:", error);
      return null;
    }
  }

  /**
   * Получение access token для использования в API запросах
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const {
        data: { session },
        error,
      } = await this.supabase.auth.getSession();

      if (error || !session?.access_token) {
        return null;
      }

      return session.access_token;
    } catch (error) {
      console.error("[ServerAuth] Error getting access token:", error);
      return null;
    }
  }

  /**
   * Выход из системы
   */
  async signOut(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        console.error("[ServerAuth] Error signing out:", error);
        throw error;
      }
    } catch (error) {
      console.error("[ServerAuth] Error signing out:", error);
      throw error;
    }
  }
}

/**
 * Создание серверного клиента авторизации
 * @param supabase - Supabase клиент (созданный через createServerSupabaseClient)
 * @returns ServerAuthClient
 */
export function createServerAuthClient(supabase: SupabaseClient): ServerAuthClient {
  return new ServerAuthClient(supabase);
}

