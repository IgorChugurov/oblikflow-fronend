/**
 * Admin Application Proxy/Middleware
 *
 * Проверяет:
 * - Наличие JWT токена (авторизация)
 *
 * НЕ проверяет:
 * - Роли (все авторизованные пользователи могут войти)
 * - Доступ к предприятиям (страница сама получит список через Backend API)
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createBaseMiddleware } from "shared/auth-sdk/server/middleware";
import { isValidLocale } from "shared/lib/i18n/config";

const baseMiddleware = createBaseMiddleware({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
});

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // DEBUG: Логируем ВСЕ запросы проходящие через middleware
  console.log(`[admin/proxy] 🔵 MIDDLEWARE HIT: ${pathname}`);

  // ============================================================================
  // ШАГ 0: Обработка смены языка через query параметр ?lang=
  // ============================================================================
  const langParam = request.nextUrl.searchParams.get("lang");
  if (langParam) {
    // Валидируем язык
    if (isValidLocale(langParam)) {
      // Создаем URL без query параметра lang
      const url = request.nextUrl.clone();
      url.searchParams.delete("lang");

      // Создаем response с редиректом
      const response = NextResponse.redirect(url);

      // Устанавливаем cookie с новым языком
      const cookieDomain =
        process.env.NODE_ENV === "production"
          ? process.env.NEXT_PUBLIC_COOKIE_DOMAIN || ".oblikflow.com"
          : undefined;

      response.cookies.set("NEXT_LOCALE", langParam, {
        path: "/",
        domain: cookieDomain,
        maxAge: 31536000, // 1 год
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      console.log(`[admin/proxy] Language switched to: ${langParam}`);
      return response;
    } else {
      // Невалидный язык - игнорируем и удаляем параметр
      console.warn(`[admin/proxy] Invalid language code: ${langParam}`);
      const url = request.nextUrl.clone();
      url.searchParams.delete("lang");
      return NextResponse.redirect(url);
    }
  }

  const { response, user } = await baseMiddleware(request);

  console.log(
    "[admin/proxy] User after baseMiddleware:",
    user ? `${user.id} (${user.email})` : "null"
  );

  // Проверка JWT: если нет пользователя → redirect на site для авторизации
  if (!user) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oblikflow.com";
    const loginUrl = new URL("/login", siteUrl);
    // Сохраняем полный URL для возврата после авторизации
    loginUrl.searchParams.set("redirect", request.url);
    console.log(
      `[admin/proxy] No user found! Redirecting to site login: ${loginUrl.toString()}`
    );
    return NextResponse.redirect(loginUrl);
  }

  console.log("[admin/proxy] User authenticated, allowing access");
  // Пользователь авторизован → пропускаем
  // Backend API сам вернет список предприятий (может быть пустым)
  return response;
}

export async function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = {
  // Очень агрессивный matcher - middleware ТОЛЬКО для корневых HTML страниц
  // Исключаем абсолютно все: _next, api, и любые файлы с точкой в имени
  matcher: [
    /*
     * Match:
     * - / (root)
     * - /any-page
     * - /nested/page
     * 
     * NOT match:
     * - /_next/* (Next.js internals)
     * - /api/* (API routes)
     * - /*.* (any file with extension)
     */
    "/((?!api/|_next/|.*\\..*).*)",
  ],
};
