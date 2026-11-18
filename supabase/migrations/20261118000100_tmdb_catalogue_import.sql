-- TMDB identity and atomic, admin-only catalogue import.
alter table public.content add column if not exists tmdb_id bigint;
create unique index if not exists content_tmdb_id_unique_idx
  on public.content (tmdb_id) where tmdb_id is not null;

create or replace function public.import_tmdb_catalogue(p_content jsonb, p_seasons jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  actor uuid := auth.uid();
  content_id uuid;
  season_row jsonb;
  episode_row jsonb;
  season_id uuid;
  processed_seasons integer := 0;
  processed_episodes integer := 0;
begin
  if actor is null or not public.has_admin_permission('content.manage') then
    raise exception using errcode = '42501', message = 'Content management permission required.';
  end if;
  if jsonb_typeof(p_content) <> 'object' or jsonb_typeof(p_seasons) <> 'array' then
    raise exception using errcode = '22023', message = 'Invalid catalogue import payload.';
  end if;
  if coalesce((p_content->>'tmdb_id')::bigint, 0) <= 0 then
    raise exception using errcode = '22023', message = 'A valid TMDB ID is required.';
  end if;
  if length(btrim(coalesce(p_content->>'title',''))) = 0
     or length(p_content->>'title') > 240 then
    raise exception using errcode = '22023', message = 'A valid title is required.';
  end if;

  insert into public.content (
    tmdb_id, slug, kind, title, synopsis, original_title, poster_url, banner_url,
    release_date, release_year, end_date, rating, genres, studios, country_codes,
    language_codes, content_status, runtime_minutes, total_episodes, trailer_url,
    publication_status
  ) values (
    (p_content->>'tmdb_id')::bigint,
    lower(regexp_replace(regexp_replace(btrim(p_content->>'title'), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
      || '-' || (p_content->>'tmdb_id'),
    p_content->>'kind', btrim(p_content->>'title'), nullif(p_content->>'synopsis',''),
    nullif(p_content->>'original_title',''), nullif(p_content->>'poster_url',''),
    nullif(p_content->>'banner_url',''), nullif(p_content->>'release_date','')::date,
    nullif(p_content->>'release_year','')::smallint, nullif(p_content->>'end_date','')::date,
    nullif(p_content->>'rating','')::numeric,
    array(select jsonb_array_elements_text(coalesce(p_content->'genres','[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_content->'studios','[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_content->'country_codes','[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_content->'language_codes','[]'::jsonb))),
    nullif(p_content->>'content_status',''), nullif(p_content->>'runtime_minutes','')::integer,
    nullif(p_content->>'total_episodes','')::integer, nullif(p_content->>'trailer_url',''),
    'draft'
  )
  on conflict (tmdb_id) where tmdb_id is not null do update set
    title = excluded.title, synopsis = excluded.synopsis, original_title = excluded.original_title,
    poster_url = excluded.poster_url, banner_url = excluded.banner_url,
    release_date = excluded.release_date, release_year = excluded.release_year,
    end_date = excluded.end_date, rating = excluded.rating, genres = excluded.genres,
    studios = excluded.studios, country_codes = excluded.country_codes,
    language_codes = excluded.language_codes, content_status = excluded.content_status,
    runtime_minutes = excluded.runtime_minutes, total_episodes = excluded.total_episodes,
    trailer_url = excluded.trailer_url, updated_at = now()
  returning id into content_id;

  for season_row in select value from jsonb_array_elements(p_seasons)
  loop
    insert into public.seasons(content_id, season_number, title, synopsis)
    values (content_id, (season_row->>'season_number')::integer,
      nullif(season_row->>'title',''), nullif(season_row->>'synopsis',''))
    on conflict (content_id, season_number) do update set
      title = excluded.title, synopsis = excluded.synopsis, updated_at = now()
    returning id into season_id;

    for episode_row in select value from jsonb_array_elements(coalesce(season_row->'episodes','[]'::jsonb))
    loop
      insert into public.episodes(season_id, episode_number, title, synopsis)
      values (season_id, (episode_row->>'episode_number')::integer,
        coalesce(nullif(episode_row->>'title',''), 'Episode ' || (episode_row->>'episode_number')),
        nullif(episode_row->>'synopsis',''))
      on conflict (season_id, episode_number) do update set
        title = excluded.title, synopsis = excluded.synopsis, updated_at = now();
      processed_episodes := processed_episodes + 1;
    end loop;
    processed_seasons := processed_seasons + 1;
  end loop;

  return jsonb_build_object('content_id', content_id, 'seasons_processed', processed_seasons,
    'episodes_processed', processed_episodes, 'publication_status', 'draft');
end;
$function$;

revoke all on function public.import_tmdb_catalogue(jsonb, jsonb) from public, anon;
grant execute on function public.import_tmdb_catalogue(jsonb, jsonb) to authenticated;
