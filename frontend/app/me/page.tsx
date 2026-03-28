import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { MePageClient } from "./MePageClient";

/** 빌드 시 env 없이도 프리렌더하지 않음 (Vercel 등 CI에서 필수) */
export const dynamic = "force-dynamic";

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/me");
  }

  const selectTeamHref = `/select-team?next=${encodeURIComponent("/me")}`;

  return <MePageClient selectTeamHref={selectTeamHref} />;
}
