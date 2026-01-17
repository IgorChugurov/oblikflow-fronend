import { NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient } from "shared/auth-sdk/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  // Redirect to site after OAuth
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const response = NextResponse.redirect(siteUrl);

  if (code) {
    const supabase = await createRouteHandlerSupabaseClient(response);
    await supabase.auth.exchangeCodeForSession(code);
  }

  return response;
}
