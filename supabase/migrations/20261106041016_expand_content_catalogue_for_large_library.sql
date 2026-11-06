alter table public.content
  add column if not exists original_title text,
  add column if not exists alternative_titles text[] not null default '{}',
  add column if not exists poster_url text,
  add column if not exists banner_url text,
  add column if not exists logo_url text,
  add column if not exists trailer_url text,
  add column if not exists release_year smallint,
  add column if not exists release_date date,
  add column if not exists end_date date,
  add column if not exists content_status text,
  add column if not exists rating numeric(3,1),
  add column if not exists age_rating text,
  add column if not exists runtime_minutes integer,
  add column if not exists total_episodes integer,
  add column if not exists country_codes text[] not null default '{}',
  add column if not exists language_codes text[] not null default '{}',
  add column if not exists genres text[] not null default '{}',
  add column if not exists tags text[] not null default '{}',
  add column if not exists studios text[] not null default '{}',
  add column if not exists view_count bigint not null default 0,
  add column if not exists is_featured boolean not null default false,
  add column if not exists search_document tsvector;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='content_release_year_check' and conrelid='public.content'::regclass) then
    alter table public.content add constraint content_release_year_check check (release_year is null or release_year between 1900 and 2200);
  end if;
  if not exists (select 1 from pg_constraint where conname='content_rating_check' and conrelid='public.content'::regclass) then
    alter table public.content add constraint content_rating_check check (rating is null or rating between 0 and 10);
  end if;
  if not exists (select 1 from pg_constraint where conname='content_runtime_check' and conrelid='public.content'::regclass) then
    alter table public.content add constraint content_runtime_check check (runtime_minutes is null or runtime_minutes > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname='content_total_episodes_check' and conrelid='public.content'::regclass) then
    alter table public.content add constraint content_total_episodes_check check (total_episodes is null or total_episodes >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname='content_view_count_check' and conrelid='public.content'::regclass) then
    alter table public.content add constraint content_view_count_check check (view_count >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname='content_status_check' and conrelid='public.content'::regclass) then
    alter table public.content add constraint content_status_check check (content_status is null or content_status in ('upcoming','ongoing','completed','hiatus'));
  end if;
end $$;

create or replace function public.refresh_content_search_document()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.search_document :=
    setweight(to_tsvector('simple'::regconfig, coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(new.original_title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(array_to_string(new.alternative_titles, ' '), '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(new.synopsis, '')), 'C') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(array_to_string(new.genres, ' '), '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(array_to_string(new.tags, ' '), '')), 'D');
  return new;
end;
$$;

drop trigger if exists content_search_document_refresh on public.content;
create trigger content_search_document_refresh
before insert or update of title, original_title, alternative_titles, synopsis, genres, tags
on public.content
for each row execute function public.refresh_content_search_document();

update public.content set search_document =
    setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(original_title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(array_to_string(alternative_titles, ' '), '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(synopsis, '')), 'C') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(array_to_string(genres, ' '), '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(array_to_string(tags, ' '), '')), 'D');
alter table public.content alter column search_document set not null;

create index if not exists content_search_document_gin_idx on public.content using gin (search_document);
create index if not exists content_genres_gin_idx on public.content using gin (genres);
create index if not exists content_tags_gin_idx on public.content using gin (tags);
create index if not exists content_published_catalogue_cursor_idx on public.content (kind, created_at desc, id desc) where publication_status = 'published';
create index if not exists content_published_popularity_idx on public.content (view_count desc, id desc) where publication_status = 'published';
create index if not exists content_published_release_year_idx on public.content (release_year desc, id desc) where publication_status = 'published';
create index if not exists streaming_sources_content_enabled_idx on public.streaming_sources (content_id, created_at desc) where enabled and content_id is not null;
create index if not exists streaming_sources_episode_enabled_idx on public.streaming_sources (episode_id, created_at desc) where enabled and episode_id is not null;
create index if not exists download_sources_content_enabled_idx on public.download_sources (content_id, created_at desc) where enabled and content_id is not null;
create index if not exists download_sources_episode_enabled_idx on public.download_sources (episode_id, created_at desc) where enabled and episode_id is not null;
