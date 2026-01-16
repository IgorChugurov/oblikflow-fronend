import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createBaseMiddleware } from "shared/auth-sdk/server/middleware";
import {
  redirectAuthenticatedUsers,
  redirectUnauthenticatedUsers,
  isPublicRoute as checkPublicRoute,
} from "shared/auth-sdk/server/middleware-utils";
import { isValidLocale } from "shared/lib/i18n/config";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Обработка смены языка через query параметр ?lang=
  const langParam = request.nextUrl.searchParams.get("lang");
  if (langParam) {
    // Валидируем язык
    if (isValidLocale(langParam)) {
      // Создаем URL без query параметра lang
      const url = request.nextUrl.clone();
      url.searchParams.delete("lang");
      
      // Создаем response с редиректом
      const response = NextResponse.redirect(url);
      
      // Устанавливаем cookie с новым языком (используем NEXT_LOCALE как стандарт next-intl)
      const cookieDomain = process.env.NODE_ENV === "production"
        ? process.env.NEXT_PUBLIC_COOKIE_DOMAIN || ".oblikflow.com"
        : undefined;
      
      response.cookies.set("NEXT_LOCALE", langParam, {
        path: "/",
        domain: cookieDomain,
        maxAge: 31536000, // 1 год
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      
      console.log(`[proxy] Language switched to: ${langParam}`);
      return response;
    } else {
      // Невалидный язык - игнорируем и удаляем параметр
      console.warn(`[proxy] Invalid language code: ${langParam}`);
      const url = request.nextUrl.clone();
      url.searchParams.delete("lang");
      return NextResponse.redirect(url);
    }
  }

  const { response, user } = await baseMiddleware(request);

  console.log("user", user);
  console.log("pathname", pathname);

  // Редирект авторизованных пользователей с auth-страниц на главную
  const authRedirect = redirectAuthenticatedUsers(user, pathname, request);
  if (authRedirect) return authRedirect;

  // Публичные маршруты
  if (checkPublicRoute(pathname, publicRoutes)) {
    return response;
  }

  // Редирект неавторизованных на login
  const loginRedirect = redirectUnauthenticatedUsers(user, pathname, request);
  if (loginRedirect) return loginRedirect;

  return response;
}

const baseMiddleware = createBaseMiddleware({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
});

export async function middleware(request: NextRequest) {
  return proxy(request);
}

const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/reset-password",
  "/reset-password/confirm",
  "/auth/callback",
  "/auth/verify",
  "/legal/privacy",
  "/legal/terms",
  "/contact",
  "/pricing",
  "/features",
  "/about",
  "/blog",
  "/blog/*",
];

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
