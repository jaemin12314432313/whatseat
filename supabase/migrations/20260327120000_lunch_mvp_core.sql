-- Lunch MVP: tables + auth profile trigger + close_session + RLS
-- Applied to project via Supabase MCP execute_sql (apply_migration endpoint unavailable).

create extension if not exists "pgcrypto";

-- teams (created_by: bootstrap SELECT after INSERT … RETURNING)
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists public.lunch_sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  session_date date not null,
  status text not null check (status in ('open', 'closed')),
  closes_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (team_id, session_date)
);

create index if not exists idx_lunch_sessions_team_id on public.lunch_sessions (team_id);
create index if not exists idx_lunch_sessions_session_date on public.lunch_sessions (session_date);

create table if not exists public.menu_suggestions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lunch_sessions (id) on delete cascade,
  label text not null,
  suggested_by_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_menu_suggestions_session_id on public.menu_suggestions (session_id);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lunch_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  suggestion_id uuid not null references public.menu_suggestions (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create index if not exists idx_votes_session_id on public.votes (session_id);
create index if not exists idx_votes_suggestion_id on public.votes (suggestion_id);

create table if not exists public.session_results (
  session_id uuid primary key references public.lunch_sessions (id) on delete cascade,
  winning_suggestion_ids uuid[] not null default '{}',
  winning_labels text[] not null default '{}',
  closed_at timestamptz not null,
  is_tie boolean not null default false,
  note text
);

-- New auth user → profile row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 마감·집계: 클라이언트가 lunch_sessions.status 를 직접 closed 로 바꾸지 못하게 하고 RPC 로만 처리
create or replace function public.close_lunch_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_status text;
  v_now timestamptz := now();
  v_max bigint;
  v_suggestion_count int;
begin
  select team_id, status into v_team_id, v_status
  from public.lunch_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if v_status <> 'open' then
    raise exception 'ALREADY_CLOSED';
  end if;

  if not exists (
    select 1 from public.team_members tm
    where tm.team_id = v_team_id and tm.user_id = auth.uid()
  ) then
    raise exception 'FORBIDDEN';
  end if;

  select count(*) into v_suggestion_count from public.menu_suggestions where session_id = p_session_id;

  if v_suggestion_count = 0 then
    insert into public.session_results (session_id, winning_suggestion_ids, winning_labels, closed_at, is_tie, note)
    values (p_session_id, '{}', '{}', v_now, false, '후보가 없어 오늘 메뉴는 미정이에요.');
    update public.lunch_sessions set status = 'closed' where id = p_session_id;
    return;
  end if;

  select coalesce(max(vote_count), 0) into v_max
  from (
    select count(v.id)::bigint as vote_count
    from public.menu_suggestions ms
    left join public.votes v on v.suggestion_id = ms.id and v.session_id = p_session_id
    where ms.session_id = p_session_id
    group by ms.id, ms.label, ms.created_at
  ) t;

  if v_max = 0 then
    insert into public.session_results (session_id, winning_suggestion_ids, winning_labels, closed_at, is_tie, note)
    values (p_session_id, '{}', array['미정']::text[], v_now, false, '득표가 없어 오늘 메뉴는 미정이에요.');
    update public.lunch_sessions set status = 'closed' where id = p_session_id;
    return;
  end if;

  insert into public.session_results (session_id, winning_suggestion_ids, winning_labels, closed_at, is_tie, note)
  with counts as (
    select ms.id, ms.label, ms.created_at,
           count(v.id)::bigint as vote_count
    from public.menu_suggestions ms
    left join public.votes v on v.suggestion_id = ms.id and v.session_id = p_session_id
    where ms.session_id = p_session_id
    group by ms.id, ms.label, ms.created_at
  ),
  mx as (
    select coalesce(max(vote_count), 0) as max_c from counts
  ),
  win as (
    select c.id, c.label, c.created_at
    from counts c
    cross join mx m
    where c.vote_count = m.max_c
  )
  select
    p_session_id,
    coalesce(array_agg(id order by created_at asc), '{}'),
    coalesce(array_agg(label order by created_at asc), '{}'),
    v_now,
    count(*) > 1,
    null::text
  from win;

  update public.lunch_sessions set status = 'closed' where id = p_session_id;
end;
$$;

grant execute on function public.close_lunch_session(uuid) to authenticated;

alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.team_members enable row level security;
alter table public.lunch_sessions enable row level security;
alter table public.menu_suggestions enable row level security;
alter table public.votes enable row level security;
alter table public.session_results enable row level security;

drop policy if exists teams_select_visible on public.teams;
drop policy if exists teams_insert_with_creator on public.teams;
drop policy if exists teams_select_member on public.teams;
drop policy if exists teams_insert_authenticated on public.teams;

create policy teams_select_visible on public.teams
for select to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1 from public.team_members tm
    where tm.team_id = teams.id and tm.user_id = auth.uid()
  )
);

create policy teams_insert_with_creator on public.teams
for insert to authenticated
with check (created_by = auth.uid());

create policy profiles_self on public.profiles
for all to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy team_members_select on public.team_members
for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.team_members tm
    where tm.team_id = team_members.team_id and tm.user_id = auth.uid()
  )
);

create policy team_members_insert_self on public.team_members
for insert to authenticated
with check (user_id = auth.uid());

create policy lunch_sessions_select on public.lunch_sessions
for select to authenticated
using (
  exists (
    select 1 from public.team_members tm
    where tm.team_id = lunch_sessions.team_id and tm.user_id = auth.uid()
  )
);

create policy lunch_sessions_insert on public.lunch_sessions
for insert to authenticated
with check (
  status = 'open'
  and exists (
    select 1 from public.team_members tm
    where tm.team_id = lunch_sessions.team_id and tm.user_id = auth.uid()
  )
);

create policy menu_suggestions_select on public.menu_suggestions
for select to authenticated
using (
  exists (
    select 1 from public.lunch_sessions ls
    join public.team_members tm on tm.team_id = ls.team_id
    where ls.id = menu_suggestions.session_id and tm.user_id = auth.uid()
  )
);

create policy menu_suggestions_insert on public.menu_suggestions
for insert to authenticated
with check (
  suggested_by_user_id = auth.uid()
  and exists (
    select 1 from public.lunch_sessions ls
    join public.team_members tm on tm.team_id = ls.team_id
    where ls.id = session_id and ls.status = 'open' and tm.user_id = auth.uid()
  )
);

create policy votes_select on public.votes
for select to authenticated
using (
  exists (
    select 1 from public.lunch_sessions ls
    join public.team_members tm on tm.team_id = ls.team_id
    where ls.id = votes.session_id and tm.user_id = auth.uid()
  )
);

create policy votes_insert on public.votes
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.lunch_sessions ls
    where ls.id = session_id and ls.status = 'open'
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = ls.team_id and tm.user_id = auth.uid()
    )
  )
);

create policy votes_update_own on public.votes
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.lunch_sessions ls
    where ls.id = session_id and ls.status = 'open'
  )
);

create policy session_results_select on public.session_results
for select to authenticated
using (
  exists (
    select 1 from public.lunch_sessions ls
    join public.team_members tm on tm.team_id = ls.team_id
    where ls.id = session_results.session_id and tm.user_id = auth.uid()
  )
);
