import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * OAuth(Google 등) 콜백 — Supabase가 붙인 `code` 교환
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const nextSafe = next.startsWith("/") ? next : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const q = new URLSearchParams({ next: nextSafe });
      return NextResponse.redirect(`${origin}/select-team?${q.toString()}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
