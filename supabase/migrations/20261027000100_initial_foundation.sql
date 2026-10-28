create type public.content_kind as enum (
  'anime',
  'drama',
  'web_series',
  'movie'
);

create type public.publication_status as enum (
  'draft',
  'published',
  'archived'
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (
    display_name is null or char_length(display_name) <= 80
  ),
  avatar_url text check (
    avatar_url is null or char_length(avatar_url) <= 2048
  ),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create table public.content (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  kind public.content_kind not null,
  title text not null check (char_length(pg_catalog.btrim(title)) > 0),
  synopsis text,
  artwork_url text,
  publication_status public.publication_status not null default 'draft',
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content (id) on delete cascade,
  season_number integer not null check (season_number > 0),
  title text,
  synopsis text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  unique (content_id, season_number)
);

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  episode_number integer not null check (episode_number > 0),
  title text not null check (char_length(pg_catalog.btrim(title)) > 0),
  synopsis text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  unique (season_id, episode_number)
);

create index content_publication_kind_idx
  on public.content (publication_status, kind, title);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$function$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger content_set_updated_at
  before update on public.content
  for each row execute function public.set_updated_at();
create trigger seasons_set_updated_at
  before update on public.seasons
  for each row execute function public.set_updated_at();
create trigger episodes_set_updated_at
  before update on public.episodes
  for each row execute function public.set_updated_at();

create function public.require_series_content_for_season()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  if not exists (
    select 1
    from public.content as parent
    where parent.id = new.content_id
      and parent.kind in ('anime', 'drama', 'web_series')
  ) then
    raise exception using
      errcode = '23514',
      message = 'A season must belong to episodic content.';
  end if;

  return new;
end;
$function$;

revoke all on function public.require_series_content_for_season()
  from public, anon, authenticated;

create trigger seasons_require_series_content
  before insert or update of content_id on public.seasons
  for each row execute function public.require_series_content_for_season();

create function public.prevent_movie_kind_with_seasons()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  if new.kind = 'movie' and exists (
    select 1
    from public.seasons as child
    where child.content_id = new.id
  ) then
    raise exception using
      errcode = '23514',
      message = 'Content with seasons cannot be changed to a movie.';
  end if;

  return new;
end;
$function$;

revoke all on function public.prevent_movie_kind_with_seasons()
  from public, anon, authenticated;

create trigger content_prevent_movie_kind_with_seasons
  before update of kind on public.content
  for each row execute function public.prevent_movie_kind_with_seasons();

alter table public.profiles enable row level security;
alter table public.content enable row level security;
alter table public.seasons enable row level security;
alter table public.episodes enable row level security;

revoke all on table public.profiles, public.content, public.seasons, public.episodes
  from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant usage on type public.content_kind, public.publication_status
  to anon, authenticated;
grant select on table public.content, public.seasons, public.episodes
  to anon, authenticated;
grant select on table public.profiles to authenticated;
grant insert (user_id, display_name, avatar_url)
  on table public.profiles to authenticated;
grant update (display_name, avatar_url)
  on table public.profiles to authenticated;

create policy content_select_published
  on public.content
  for select
  to anon, authenticated
  using (publication_status = 'published');

create policy seasons_select_published_content
  on public.seasons
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.content as parent
      where parent.id = seasons.content_id
        and parent.publication_status = 'published'
    )
  );

create policy episodes_select_published_content
  on public.episodes
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.seasons as parent_season
      join public.content as parent_content
        on parent_content.id = parent_season.content_id
      where parent_season.id = episodes.season_id
        and parent_content.publication_status = 'published'
    )
  );

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);