-- Fix infinite recursion in exercise_buddy_* RLS:
-- the previous SELECT policy on exercise_buddy_member queried
-- exercise_buddy_member to decide visibility, which recurses through
-- itself (and through any cross-table policy that subqueries it).
-- Solution: a SECURITY DEFINER helper that bypasses RLS to enumerate
-- the caller's crew ids; all visibility policies route through it.

create or replace function public.exercise_buddy_my_crews()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select crew_id
  from public.exercise_buddy_member
  where user_id = auth.uid();
$$;

revoke all on function public.exercise_buddy_my_crews() from public;
grant execute on function public.exercise_buddy_my_crews() to authenticated;

drop policy if exists exercise_buddy_crew_select_member on public.exercise_buddy_crew;
create policy exercise_buddy_crew_select_member
  on public.exercise_buddy_crew
  for select
  to authenticated
  using ( id in (select public.exercise_buddy_my_crews()) );

drop policy if exists exercise_buddy_member_select_crew on public.exercise_buddy_member;
create policy exercise_buddy_member_select_crew
  on public.exercise_buddy_member
  for select
  to authenticated
  using ( crew_id in (select public.exercise_buddy_my_crews()) );

drop policy if exists exercise_buddy_completion_select_crew on public.exercise_buddy_completion;
create policy exercise_buddy_completion_select_crew
  on public.exercise_buddy_completion
  for select
  to authenticated
  using ( crew_id in (select public.exercise_buddy_my_crews()) );

drop policy if exists exercise_buddy_completion_insert_self on public.exercise_buddy_completion;
create policy exercise_buddy_completion_insert_self
  on public.exercise_buddy_completion
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and crew_id in (select public.exercise_buddy_my_crews())
  );
