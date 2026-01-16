/**
 * Утилиты для middleware
 * Переиспользуемые функции для обработки запросов в middleware
 */

import { NextResponse, type NextRequest } from "next/server";
import type { User } from "../types";

/**
 * Редиректит авторизованных пользователей с auth-страниц
 * Используется для предотвращения доступа к /login, /signup для залогиненных пользователей
 *
 * @param user - Объект пользователя (null если не авторизован)
 * @param pathname - Текущий путь запроса
 * @param request - Next.js request объект
 * @param authPages - Массив страниц, с которых нужно редиректить (по умолчанию ["/login", "/signup"])
 * @param redirectTo - Целевой URL для редиректа (по умолчанию "/")
 * @returns NextResponse с редиректом или null если редирект не нужен
 *
 * @example
 * const redirectResponse = redirectAuthenticatedUsers(user, pathname, request);
 * if (redirectResponse) return redirectResponse;
 */
export function redirectAuthenticatedUsers(
  user: User | null,
  pathname: string,
  request: NextRequest,
  authPages: string[] = ["/login", "/signup"],
  redirectTo: string = "/"
): NextResponse | null {
  if (user && authPages.includes(pathname)) {
    const targetUrl = new URL(redirectTo, request.url);
    const response = NextResponse.redirect(targetUrl);
    response.headers.set("x-pathname", pathname);
    return response;
  }
  return null;
}

/**
 * Редиректит неавторизованных пользователей на страницу логина
 * Сохраняет текущий путь в redirect параметре для возврата после авторизации
 *
 * @param user - Объект пользователя (null если не авторизован)
 * @param pathname - Текущий путь запроса
 * @param request - Next.js request объект
 * @param loginPath - Путь к странице логина (по умолчанию "/login")
 * @returns NextResponse с редиректом или null если редирект не нужен
 *
 * @example
 * const redirectResponse = redirectUnauthenticatedUsers(user, pathname, request);
 * if (redirectResponse) return redirectResponse;
 */
export function redirectUnauthenticatedUsers(
  user: User | null,
  pathname: string,
  request: NextRequest,
  loginPath: string = "/login"
): NextResponse | null {
  if (!user) {
    const redirectPath = `${pathname}${request.nextUrl.search}`;
    const loginUrl = new URL(loginPath, request.url);
    loginUrl.searchParams.set("redirect", redirectPath);

    const response = NextResponse.redirect(loginUrl);
    response.headers.set("x-pathname", pathname);
    return response;
  }
  return null;
}

/**
 * Проверяет является ли путь публичным
 *
 * @param pathname - Текущий путь запроса
 * @param publicRoutes - Массив публичных маршрутов
 * @returns true если маршрут публичный, false в противном случае
 *
 * @example
 * if (isPublicRoute(pathname, ["/", "/about", "/blog/*"])) {
 *   return response;
 * }
 */
export function isPublicRoute(
  pathname: string,
  publicRoutes: string[]
): boolean {
  return publicRoutes.some((route) => {
    if (route.endsWith("/*")) {
      const prefix = route.slice(0, -2);
      return pathname.startsWith(prefix);
    }
    return pathname === route;
  });
}
