/**
 * Workspace Application Proxy/Middleware
 *
 * Проверяет:
 * - Наличие JWT токена (авторизация)
 * - Наличие cookie current_enterprise_id
 * - Доступ к предприятию через Backend API
 *
 * Редиректы:
 * - Нет JWT → /login
 * - Нет cookie → /admin
 * - Нет доступа к предприятию → /admin (очищает cookie)
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createBaseMiddleware } from "shared/auth-sdk/server/middleware";
import { checkEnterpriseAccess } from "shared/auth-sdk/server/backend-api-service";
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

      console.log(`[workspace/proxy] Language switched to: ${langParam}`);
      return response;
    } else {
      // Невалидный язык - игнорируем и удаляем параметр
      console.warn(`[workspace/proxy] Invalid language code: ${langParam}`);
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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oblikflow.com";
    const loginUrl = new URL("/login", siteUrl);
    // Сохраняем полный URL для возврата после авторизации
    loginUrl.searchParams.set("redirect", request.url);
    console.log(
      `[workspace/proxy] Redirecting to site login: ${loginUrl.toString()}`
    );
    return NextResponse.redirect(loginUrl);
  }

  // ============================================================================
  // ШАГ 2: Проверка cookie current_enterprise_id
  // ============================================================================
  const enterpriseId = request.cookies.get("current_enterprise_id")?.value;

  if (!enterpriseId) {
    // Нет выбранного предприятия → redirect на admin для выбора
    const adminUrl =
      process.env.NEXT_PUBLIC_ADMIN_URL || "https://admin.oblikflow.com";
    return NextResponse.redirect(new URL("/", adminUrl));
  }

  // ============================================================================
  // ШАГ 3: Проверка доступа к предприятию через Backend API
  // ============================================================================
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    // Нет токена (не должно произойти, но на всякий случай)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oblikflow.com";
    const loginUrl = new URL("/login", siteUrl);
    loginUrl.searchParams.set("redirect", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const hasAccess = await checkEnterpriseAccess(token, enterpriseId);

  if (!hasAccess) {
    // Нет доступа к предприятию → redirect на admin + очистить cookie
    const adminUrl =
      process.env.NEXT_PUBLIC_ADMIN_URL || "https://admin.oblikflow.com";
    const redirectResponse = NextResponse.redirect(new URL("/", adminUrl));
    redirectResponse.cookies.delete("current_enterprise_id");
    return redirectResponse;
  }

  // ============================================================================
  // ШАГ 4: Все проверки пройдены → пропускаем
  // ============================================================================
  return response;
}

export async function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = {
  // Оптимизированный matcher - исключаем все assets
  // Middleware выполняется только для HTML страниц
  matcher: [
    "/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|ico|woff|woff2|ttf|eot|otf|map|json)$).*)",
  ],
};
