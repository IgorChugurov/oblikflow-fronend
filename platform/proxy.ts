/**
 * Platform Application Proxy/Middleware
 *
 * Проверяет:
 * - Наличие JWT токена (авторизация)
 * - SuperAdmin статус через Backend API
 *
 * Редиректы:
 * - Нет JWT → /login
 * - Не superAdmin → /admin
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createBaseMiddleware } from "shared/auth-sdk/server/middleware";
import { checkSuperAdmin } from "shared/auth-sdk/server/backend-api-service";
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

      console.log(`[platform/proxy] Language switched to: ${langParam}`);
      return response;
    } else {
      // Невалидный язык - игнорируем и удаляем параметр
      console.warn(`[platform/proxy] Invalid language code: ${langParam}`);
      const url = request.nextUrl.clone();
      url.searchParams.delete("lang");
      return NextResponse.redirect(url);
    }
  }

  const { response, user, supabase } = await baseMiddleware(request);

  // ============================================================================
  // ШАГ 1: Проверка JWT
  // ============================================================================
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ============================================================================
  // ШАГ 2: Проверка superAdmin через Backend API
  // ============================================================================
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    // Нет токена (не должно произойти, но на всякий случай)
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const isSuperAdmin = await checkSuperAdmin(token);

  if (!isSuperAdmin) {
    // Не superAdmin → redirect на admin
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // ============================================================================
  // ШАГ 3: Все проверки пройдены → пропускаем
  // ============================================================================
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
