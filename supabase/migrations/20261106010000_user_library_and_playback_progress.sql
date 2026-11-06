create table public.user_saved_titles (
  user_id uuid not null references auth.users (id) on delete cascade,
  content_id uuid not null references public.content (id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (user_id, content_id)
);

create index user_saved_titles_user_created_idx
  on public.user_saved_titles (user_id, created_at desc);

create table public.playback_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content_id uuid references public.content (id) on delete cascade,
  episode_id uuid references public.episodes (id) on delete cascade,
  position_seconds integer not null default 0 check (position_seconds >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  completed boolean not null default false,
  updated_at timestamptz not null default pg_catalog.now(),
  check (pg_catalog.num_nonnulls(content_id, episode_id) = 1),
  check (not completed or duration_seconds is null or position_seconds <= duration_seconds)
);

create unique index playback_progress_user_content_unique_idx
  on public.playback_progress (user_id, content_id)
  where content_id is not null;

create unique index playback_progress_user_episode_unique_idx
  on public.playback_progress (user_id, episode_id)
  where episode_id is not null;

create index playback_progress_user_updated_idx
  on public.playback_progress (user_id, updated_at desc);

create trigger playback_progress_set_updated_at
  before update on public.playback_progress
  for each row execute function public.set_updated_at();

alter table public.user_saved_titles enable row level security;
alter table public.playback_progress enable row level security;

revoke all on table public.user_saved_titles, public.playback_progress
  from public, anon, authenticated;

grant select, insert, delete on table public.user_saved_titles to authenticated;
grant select, insert, update, delete on table public.playback_progress to authenticated;

create policy user_saved_titles_select_own
  on public.user_saved_titles
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy user_saved_titles_insert_own
  on public.user_saved_titles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy user_saved_titles_delete_own
  on public.user_saved_titles
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy playback_progress_select_own
  on public.playback_progress
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy playback_progress_insert_own
  on public.playback_progress
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy playback_progress_update_own
  on public.playback_progress
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy playback_progress_delete_own
  on public.playback_progress
  for delete to authenticated
  using ((select auth.uid()) = user_id);
