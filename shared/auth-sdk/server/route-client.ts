/**
 * Supabase client for Next.js route handlers.
 * Writes auth cookies into the provided NextResponse with proper domain.
 */

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function createRouteHandlerSupabaseClient(
  response: NextResponse
): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const cookieDomain =
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_COOKIE_DOMAIN || ".oblikflow.com"
      : undefined;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
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
}
