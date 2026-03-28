-- Lunch MVP: RLS 정책 제거 및 RLS 비활성화
-- (기존 마이그레이션에서 정의된 정책·20260327130000 votes_delete 포함)

drop policy if exists teams_select_visible on public.teams;
drop policy if exists teams_insert_with_creator on public.teams;
drop policy if exists teams_select_member on public.teams;
drop policy if exists teams_insert_authenticated on public.teams;

drop policy if exists profiles_self on public.profiles;

drop policy if exists team_members_select on public.team_members;
drop policy if exists team_members_insert_self on public.team_members;

drop policy if exists lunch_sessions_select on public.lunch_sessions;
drop policy if exists lunch_sessions_insert on public.lunch_sessions;

drop policy if exists menu_suggestions_select on public.menu_suggestions;
drop policy if exists menu_suggestions_insert on public.menu_suggestions;

drop policy if exists votes_select on public.votes;
drop policy if exists votes_insert on public.votes;
drop policy if exists votes_update_own on public.votes;
drop policy if exists votes_delete_own on public.votes;

drop policy if exists session_results_select on public.session_results;

alter table public.teams disable row level security;
alter table public.profiles disable row level security;
alter table public.team_members disable row level security;
alter table public.lunch_sessions disable row level security;
alter table public.menu_suggestions disable row level security;
alter table public.votes disable row level security;
alter table public.session_results disable row level security;
