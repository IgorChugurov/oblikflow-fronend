/**
 * Backend API Service для проверки доступов в middleware
 * Используется для вызовов к NestJS Backend API
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

/**
 * Проверка superAdmin статуса для platform middleware
 * 
 * @param token - JWT токен из Supabase Auth
 * @returns true если пользователь superAdmin, false иначе
 * 
 * @example
 * const isSuperAdmin = await checkSuperAdmin(token);
 * if (!isSuperAdmin) {
 *   return NextResponse.redirect(new URL('/admin', request.url));
 * }
 */
export async function checkSuperAdmin(token: string): Promise<boolean> {
  if (!BACKEND_URL) {
    console.error('[Backend API] NEXT_PUBLIC_BACKEND_URL not configured');
    return false;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/check-superadmin`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store', // Не кэшировать проверки доступа
    });

    return response.ok; // 200 = superAdmin, 403 = нет доступа
  } catch (error) {
    console.error('[Backend API] Error checking superAdmin:', error);
    return false; // fail-safe: при ошибке запрещаем доступ
  }
}

/**
 * Проверка доступа к предприятию для workspace middleware
 * 
 * @param token - JWT токен из Supabase Auth
 * @param enterpriseId - ID предприятия из cookie current_enterprise_id
 * @returns true если пользователь имеет доступ к предприятию, false иначе
 * 
 * @example
 * const enterpriseId = request.cookies.get('current_enterprise_id')?.value;
 * const hasAccess = await checkEnterpriseAccess(token, enterpriseId);
 * if (!hasAccess) {
 *   return NextResponse.redirect(new URL('/admin', request.url));
 * }
 */
export async function checkEnterpriseAccess(
  token: string,
  enterpriseId: string
): Promise<boolean> {
  if (!BACKEND_URL) {
    console.error('[Backend API] NEXT_PUBLIC_BACKEND_URL not configured');
    return false;
  }

  if (!enterpriseId) {
    console.warn('[Backend API] enterpriseId is required for checkEnterpriseAccess');
    return false;
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/auth/check-enterprise-access?enterpriseId=${enterpriseId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        cache: 'no-store', // Не кэшировать проверки доступа
      }
    );

    return response.ok; // 200 = есть доступ, 403 = нет доступа
  } catch (error) {
    console.error('[Backend API] Error checking enterprise access:', error);
    return false; // fail-safe: при ошибке запрещаем доступ
  }
}
