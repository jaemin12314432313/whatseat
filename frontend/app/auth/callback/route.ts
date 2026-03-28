import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSiteUrl } from "@/lib/siteUrl";

/**
 * PKCE 코드 교환(이메일 확인 링크, OAuth 등) 후 세션 쿠키를
 * 리다이렉트 응답에 붙이려면 Route Handler에서 response.cookies에 써야 함.
 */
export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const siteUrl = getSiteUrl(request);
  const code = request.nextUrl.searchParams.get("code");
  const nextRaw = request.nextUrl.searchParams.get("next") ?? "/";
  const nextSafe = nextRaw.startsWith("/") ? nextRaw : "/";

  const toLogin = () => {
    const u = new URL("/login", siteUrl);
    u.searchParams.set("error", "auth");
    return NextResponse.redirect(u);
  };

  if (!url || !anonKey) {
    return toLogin();
  }

  if (!code) {
    return toLogin();
  }

  const okTarget = new URL("/select-team", siteUrl);
  okTarget.searchParams.set("next", nextSafe);

  let response = NextResponse.redirect(okTarget);

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return toLogin();
  }

  return response;
}
