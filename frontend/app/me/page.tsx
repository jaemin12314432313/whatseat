import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { MePageClient } from "./MePageClient";

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
