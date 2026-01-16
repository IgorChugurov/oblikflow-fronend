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

  // Проверка JWT: если нет пользователя → redirect на login
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Пользователь авторизован → пропускаем
  // Backend API сам вернет список предприятий (может быть пустым)
  return response;
}

export async function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
