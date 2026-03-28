-- Allow authenticated users to remove their own vote while the session is open (api-spec §3.4 DELETE my-vote)
-- Superseded by 20260327140000_remove_rls.sql if applied after; drops are idempotent in that migration.

create policy votes_delete_own on public.votes
for delete to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.lunch_sessions ls
    where ls.id = votes.session_id and ls.status = 'open'
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = ls.team_id and tm.user_id = auth.uid()
    )
  )
);
