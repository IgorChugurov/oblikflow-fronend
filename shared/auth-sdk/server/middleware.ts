/**
 * Middleware функция для Next.js
 * Обновляет сессию Supabase и проверяет авторизацию
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { transformSupabaseUser } from "../utils/transform";
import type { User, MiddlewareConfig } from "../types";
import { getPreferredLocale, isValidLocale } from "../../lib/i18n/config";
import { redirectAuthenticatedUsers } from "./middleware-utils";

/**
 * Результат обновления сессии
 */
export interface UpdateSessionResult {
  response: NextResponse;
  user: User | null;
  supabaseUser: SupabaseUser | null;
}

export interface BaseMiddlewareConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  localeCookieName?: string;
  localeCookieOptions?: {
    path?: string;
    maxAge?: number;
    sameSite?: "lax" | "strict" | "none";
    secure?: boolean;
    domain?: string;
  };
}

export interface BaseMiddlewareResult {
  response: NextResponse;
  user: User | null;
  supabaseUser: SupabaseUser | null;
  locale: string;
  supabase: ReturnType<typeof createServerClient>;
}

const DEFAULT_LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const DEFAULT_LOCALE_COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

/**
 * Обновление сессии Supabase в middleware
 * Автоматически обновляет истекшие токены
 */
export async function updateSession(
  request: NextRequest,
  config: {
    supabaseUrl: string;
    supabaseAnonKey: string;
  }
): Promise<UpdateSessionResult> {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          const cookieDomain =
            process.env.NODE_ENV === "production"
              ? process.env.NEXT_PUBLIC_COOKIE_DOMAIN || ".oblikflow.com"
              : undefined;

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              domain: cookieDomain,
            });
          });
        },
      },
    }
  );

  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = transformSupabaseUser(supabaseUser);

  return { response, user, supabaseUser };
}

export function createBaseMiddleware(config: BaseMiddlewareConfig) {
  return async (request: NextRequest): Promise<BaseMiddlewareResult> => {
    const response = NextResponse.next({ request });

    const supabase = createServerClient(
      config.supabaseUrl,
      config.supabaseAnonKey,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            const cookieDomain =
              process.env.NODE_ENV === "production"
                ? process.env.NEXT_PUBLIC_COOKIE_DOMAIN || ".oblikflow.com"
                : undefined;

            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, {
                ...options,
                domain: cookieDomain,
              });
            });
          },
        },
      }
    );

    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    const user = transformSupabaseUser(supabaseUser);

    const localeCookieName =
      config.localeCookieName || DEFAULT_LOCALE_COOKIE_NAME;
    const cookieLocale = request.cookies.get(localeCookieName)?.value;
    const acceptLanguage = request.headers.get("accept-language");
    const browserLocale = acceptLanguage?.split(",")[0];
    const locale = getPreferredLocale(cookieLocale, browserLocale);

    const shouldSetLocaleCookie = !cookieLocale || !isValidLocale(cookieLocale);
    if (shouldSetLocaleCookie) {
      response.cookies.set(localeCookieName, locale, {
        ...DEFAULT_LOCALE_COOKIE_OPTIONS,
        ...config.localeCookieOptions,
      });
    }

    response.headers.set("x-next-intl-locale", locale);
    response.headers.set("x-pathname", request.nextUrl.pathname);
    if (user?.id) {
      response.headers.set("x-user-id", user.id);
    }

    return { response, user, supabaseUser, locale, supabase };
  };
}

/**
 * @deprecated Используйте createBaseMiddleware() и создавайте кастомную логику в proxy.ts
 * Эта функция содержала легаси логику с RPC проверками ролей
 */
