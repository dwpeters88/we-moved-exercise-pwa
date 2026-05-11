-- Profile pictures: Storage bucket + member.avatar_url + RPC to validate URLs.

alter table public.exercise_buddy_member
  add column if not exists avatar_url text;

comment on column public.exercise_buddy_member.avatar_url is
  'Public Supabase Storage URL for bucket exercise_buddy_avatars; set via exercise_buddy_set_avatar_url.';

-- ---------------------------------------------------------------------------
-- Storage (public bucket: URLs are unguessable; uploads scoped to auth.uid())
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise_buddy_avatars',
  'exercise_buddy_avatars',
  true,
  524288,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists exercise_buddy_avatars_select on storage.objects;
drop policy if exists exercise_buddy_avatars_insert_own on storage.objects;
drop policy if exists exercise_buddy_avatars_update_own on storage.objects;
drop policy if exists exercise_buddy_avatars_delete_own on storage.objects;

create policy exercise_buddy_avatars_select
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'exercise_buddy_avatars');

create policy exercise_buddy_avatars_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'exercise_buddy_avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy exercise_buddy_avatars_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'exercise_buddy_avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'exercise_buddy_avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy exercise_buddy_avatars_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'exercise_buddy_avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Only accept URLs pointing at our public bucket (mitigates arbitrary URLs).
-- ---------------------------------------------------------------------------

create or replace function public.exercise_buddy_set_avatar_url(p_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  if p_url is not null and (
    length(p_url) > 2048
    or p_url ~ '[[:space:]]'
    or p_url !~ '^https://[^[:space:]]+/storage/v1/object/public/exercise_buddy_avatars/[^[:space:]]+$'
  ) then
    raise exception 'invalid_avatar_url';
  end if;

  update public.exercise_buddy_member m
  set avatar_url = nullif(trim(p_url), '')
  where m.user_id = auth.uid()
    and m.crew_id in (select public.exercise_buddy_my_crews());

  get diagnostics v_n = row_count;
  if v_n < 1 then
    raise exception 'not_a_member';
  end if;
end;
$$;

revoke all on function public.exercise_buddy_set_avatar_url(text) from public;
grant execute on function public.exercise_buddy_set_avatar_url(text) to authenticated;

-- Partner avatar updates (optional live refresh).
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'exercise_buddy_member'
  ) then
    alter publication supabase_realtime add table public.exercise_buddy_member;
  end if;
end $$;
