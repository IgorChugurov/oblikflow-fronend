/**
 * Создание Supabase клиента для браузера
 */

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Создание Supabase клиента для браузера
 * @param supabaseUrl - URL Supabase проекта
 * @param supabaseAnonKey - Anon ключ Supabase
 * @returns Supabase клиент
 */
export function createBrowserSupabaseClient(
  supabaseUrl: string,
  supabaseAnonKey: string
): SupabaseClient {
  // Проверка что мы в браузере
  if (typeof window === 'undefined') {
    throw new Error('createBrowserSupabaseClient can only be used in browser environment');
  }

  // Настраиваем cookies с правильным domain для работы между поддоменами
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        // Читаем cookie из document.cookie
        const value = document.cookie
          .split('; ')
          .find(row => row.startsWith(`${name}=`))
          ?.split('=')[1];
        return value;
      },
      set(name: string, value: string, options: any) {
        // Устанавливаем cookie с domain для всех поддоменов
        const cookieDomain = process.env.NODE_ENV === 'production'
          ? process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.oblikflow.com'
          : undefined;
        
        let cookie = `${name}=${value}; path=${options?.path || '/'}`;
        
        // Добавляем domain только в production
        if (cookieDomain) {
          cookie += `; domain=${cookieDomain}`;
        }
        
        // Добавляем maxAge если указан
        if (options?.maxAge) {
          cookie += `; max-age=${options.maxAge}`;
        }
        
        // Добавляем sameSite
        cookie += `; samesite=${options?.sameSite || 'lax'}`;
        
        // Добавляем secure в production
        if (process.env.NODE_ENV === 'production') {
          cookie += '; secure';
        }
        
        document.cookie = cookie;
      },
      remove(name: string, options: any) {
        // Удаляем cookie с тем же domain
        const cookieDomain = process.env.NODE_ENV === 'production'
          ? process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.oblikflow.com'
          : undefined;
        
        let cookie = `${name}=; path=${options?.path || '/'}; max-age=0`;
        
        if (cookieDomain) {
          cookie += `; domain=${cookieDomain}`;
        }
        
        document.cookie = cookie;
      }
    }
  });
}

