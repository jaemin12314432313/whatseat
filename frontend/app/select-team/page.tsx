import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { SelectTeamClient } from "./SelectTeamClient";

export default async function SelectTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: nextRaw } = await searchParams;
  const nextSafe =
    typeof nextRaw === "string" && nextRaw.startsWith("/") ? nextRaw : "/";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginNext = `/select-team?next=${encodeURIComponent(nextSafe)}`;
    redirect(`/login?next=${encodeURIComponent(loginNext)}`);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          시작하기
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          팀 선택
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          소속된 팀이 여러 개면 아래에서 하나만 골라 주세요. (넓은 화면에서는 한 줄에
          최대 5개까지 나란히 보여요.)
        </p>
      </div>
      <SelectTeamClient nextHref={nextSafe} />
    </div>
  );
}
