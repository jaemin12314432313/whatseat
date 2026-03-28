-- Allow multiple closed lunch_sessions per team per calendar day (new round same day after close).
-- Still at most one *open* session per team per day (partial unique index).

alter table public.lunch_sessions
  drop constraint if exists lunch_sessions_team_id_session_date_key;

drop index if exists lunch_sessions_one_open_per_team_date;

create unique index lunch_sessions_one_open_per_team_date
  on public.lunch_sessions (team_id, session_date)
  where (status = 'open');
