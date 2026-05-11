-- Shared exercise check-ins for a small crew (e.g. two people).
-- Join via invite code + RPC; members see each other's completions.

create table public.exercise_buddy_crew (
  id uuid primary key,
  slug text not null unique,
  created_at timestamptz not null default now()
);

insert into public.exercise_buddy_crew (id, slug)
values ('11111111-1111-4111-8111-111111111111', 'delmaine-hannah');

create table public.exercise_buddy_invite (
  crew_id uuid not null references public.exercise_buddy_crew (id) on delete cascade,
  code text not null,
  primary key (crew_id)
);

-- Default invite code (change in DB or add new row after rotating).
insert into public.exercise_buddy_invite (crew_id, code)
values ('11111111-1111-4111-8111-111111111111', 'DH-SHARED-2026');

create table public.exercise_buddy_member (
  crew_id uuid not null references public.exercise_buddy_crew (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

create table public.exercise_buddy_completion (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.exercise_buddy_crew (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  completed_at timestamptz not null default now(),
  workout_day date not null,
  constraint exercise_buddy_completion_one_per_day unique (crew_id, user_id, workout_day)
);

create index exercise_buddy_completion_crew_completed_at_idx
  on public.exercise_buddy_completion (crew_id, completed_at desc);

-- Invite codes are not readable from the client; access is only via SECURITY DEFINER RPC.

alter table public.exercise_buddy_crew enable row level security;
alter table public.exercise_buddy_invite enable row level security;
alter table public.exercise_buddy_member enable row level security;
alter table public.exercise_buddy_completion enable row level security;

create policy exercise_buddy_crew_select_member
  on public.exercise_buddy_crew
  for select
  to authenticated
  using (
    id in (
      select m.crew_id
      from public.exercise_buddy_member m
      where m.user_id = (select auth.uid())
    )
  );

create policy exercise_buddy_member_select_crew
  on public.exercise_buddy_member
  for select
  to authenticated
  using (
    crew_id in (
      select m.crew_id
      from public.exercise_buddy_member m
      where m.user_id = (select auth.uid())
    )
  );

create policy exercise_buddy_completion_select_crew
  on public.exercise_buddy_completion
  for select
  to authenticated
  using (
    crew_id in (
      select m.crew_id
      from public.exercise_buddy_member m
      where m.user_id = (select auth.uid())
    )
  );

create policy exercise_buddy_completion_insert_self
  on public.exercise_buddy_completion
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and crew_id in (
      select m.crew_id
      from public.exercise_buddy_member m
      where m.user_id = (select auth.uid())
    )
  );

create policy exercise_buddy_completion_delete_own
  on public.exercise_buddy_completion
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.exercise_buddy_join(p_code text, p_display_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_crew uuid;
  v_name text;
begin
  select i.crew_id into v_crew
  from public.exercise_buddy_invite i
  where i.code = p_code;

  if v_crew is null then
    raise exception 'invalid_invite_code';
  end if;

  v_name := left(trim(coalesce(p_display_name, '')), 64);
  if length(v_name) < 1 then
    raise exception 'display_name_required';
  end if;

  insert into public.exercise_buddy_member (crew_id, user_id, display_name)
  values (v_crew, auth.uid(), v_name)
  on conflict (crew_id, user_id) do update
    set display_name = excluded.display_name;
end;
$$;

revoke all on function public.exercise_buddy_join(text, text) from public;
grant execute on function public.exercise_buddy_join(text, text) to authenticated;

alter publication supabase_realtime add table public.exercise_buddy_completion;
