create type public.admin_role as enum ('super_admin', 'admin');
create type public.link_import_kind as enum ('stream', 'download');

create table public.admin_memberships (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.admin_role not null default 'admin',
  permissions jsonb not null default '{}'::jsonb
    check (pg_catalog.jsonb_typeof(permissions) = 'object'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default pg_catalog.now()
);

create unique index admin_memberships_single_super_admin_idx
  on public.admin_memberships (role)
  where role = 'super_admin';

create function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select exists (
    select 1
    from public.admin_memberships as membership
    where membership.user_id = (select auth.uid())
      and membership.role = 'super_admin'
  );
$function$;

create function public.has_admin_permission(permission_name text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select exists (
    select 1
    from public.admin_memberships as membership
    where membership.user_id = (select auth.uid())
      and (
        membership.role = 'super_admin'
        or (
          membership.role = 'admin'
          and permission_name <> 'admin.manage'
          and membership.permissions @> pg_catalog.jsonb_build_object(permission_name, true)
        )
      )
  );
$function$;

revoke all on function public.is_super_admin() from public, anon;
revoke all on function public.has_admin_permission(text)
  from public, anon;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.has_admin_permission(text) to authenticated;

create function public.prevent_last_super_admin_removal()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  if old.role = 'super_admin'
    and (tg_op = 'DELETE' or new.role <> 'super_admin')
    and not exists (
      select 1
      from public.admin_memberships as membership
      where membership.role = 'super_admin'
        and membership.user_id <> old.user_id
    )
  then
    raise exception using
      errcode = '23514',
      message = 'The final Super Admin cannot be removed or demoted.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$;

revoke all on function public.prevent_last_super_admin_removal()
  from public, anon, authenticated;

create trigger admin_memberships_protect_last_super_admin
  before update of role or delete on public.admin_memberships
  for each row execute function public.prevent_last_super_admin_removal();

create table public.streaming_servers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
    check (pg_catalog.char_length(pg_catalog.btrim(name)) between 1 and 80),
  hostname text not null unique
    check (
      hostname = pg_catalog.lower(hostname)
      and hostname ~ '^[a-z0-9]+([.-][a-z0-9]+)*$'
    ),
  enabled boolean not null default true,
  protection_enabled boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create table public.download_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
    check (pg_catalog.char_length(pg_catalog.btrim(name)) between 1 and 80),
  hostname text not null unique
    check (
      hostname = pg_catalog.lower(hostname)
      and hostname ~ '^[a-z0-9]+([.-][a-z0-9]+)*$'
    ),
  enabled boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create table public.streaming_sources (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references public.content (id) on delete cascade,
  episode_id uuid references public.episodes (id) on delete cascade,
  server_id uuid not null references public.streaming_servers (id) on delete restrict,
  embed_url text not null check (pg_catalog.char_length(embed_url) <= 4096),
  enabled boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  check (pg_catalog.num_nonnulls(content_id, episode_id) = 1)
);

create unique index streaming_sources_episode_unique_idx
  on public.streaming_sources (episode_id, server_id, embed_url)
  where episode_id is not null;
create unique index streaming_sources_content_unique_idx
  on public.streaming_sources (content_id, server_id, embed_url)
  where content_id is not null;
create index streaming_sources_server_idx
  on public.streaming_sources (server_id, enabled);

create table public.download_sources (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references public.content (id) on delete cascade,
  episode_id uuid references public.episodes (id) on delete cascade,
  provider_id uuid not null references public.download_providers (id) on delete restrict,
  download_url text not null check (pg_catalog.char_length(download_url) <= 4096),
  quality text check (quality is null or pg_catalog.char_length(quality) <= 40),
  audio_language text check (
    audio_language is null or pg_catalog.char_length(audio_language) <= 40
  ),
  enabled boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  check (pg_catalog.num_nonnulls(content_id, episode_id) = 1)
);

create unique index download_sources_episode_unique_idx
  on public.download_sources (episode_id, provider_id, download_url)
  where episode_id is not null;
create unique index download_sources_content_unique_idx
  on public.download_sources (content_id, provider_id, download_url)
  where content_id is not null;
create index download_sources_provider_idx
  on public.download_sources (provider_id, enabled);

create type public.link_import_status as enum ('completed', 'partial', 'failed');

create table public.import_history (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users (id) on delete restrict,
  import_kind public.link_import_kind not null,
  status public.link_import_status not null,
  records_total integer not null check (records_total >= 0),
  records_imported integer not null check (records_imported >= 0),
  records_skipped integer not null check (records_skipped >= 0),
  records_failed integer not null check (records_failed >= 0),
  created_at timestamptz not null default pg_catalog.now(),
  check (
    records_total = records_imported + records_skipped + records_failed
  )
);

create index import_history_actor_created_idx
  on public.import_history (actor_id, created_at desc);

create function public.validate_streaming_source()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
declare
  allowed_hostname text;
  target_kind public.content_kind;
  url_prefix text;
begin
  if new.episode_id is null then
    select kind into target_kind
    from public.content
    where id = new.content_id;

    if target_kind is distinct from 'movie' then
      raise exception using errcode = '23514',
        message = 'A content-level streaming source must target a movie.';
    end if;
  else
    select parent.kind into target_kind
    from public.episodes as episode
    join public.seasons as season on season.id = episode.season_id
    join public.content as parent on parent.id = season.content_id
    where episode.id = new.episode_id;

    if target_kind is null or target_kind = 'movie' then
      raise exception using errcode = '23514',
        message = 'An episode source must target an episodic title.';
    end if;
  end if;

  select hostname into allowed_hostname
  from public.streaming_servers
  where id = new.server_id and enabled;

  if allowed_hostname is null then
    raise exception using errcode = '23514',
      message = 'The streaming server is missing or disabled.';
  end if;

  url_prefix := 'https://' || allowed_hostname;
  if pg_catalog.left(pg_catalog.lower(new.embed_url), pg_catalog.char_length(url_prefix)) <> url_prefix
    or (
      pg_catalog.char_length(new.embed_url) > pg_catalog.char_length(url_prefix)
      and pg_catalog.substr(new.embed_url, pg_catalog.char_length(url_prefix) + 1, 1)
        not in ('/', '?', '#')
    )
  then
    raise exception using errcode = '23514',
      message = 'The source URL must use HTTPS and the configured server hostname.';
  end if;

  return new;
end;
$function$;

revoke all on function public.validate_streaming_source()
  from public, anon, authenticated;

create trigger streaming_sources_validate
  before insert or update on public.streaming_sources
  for each row execute function public.validate_streaming_source();

create function public.validate_download_source()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
declare
  allowed_hostname text;
  target_kind public.content_kind;
  url_prefix text;
begin
  if new.episode_id is null then
    select kind into target_kind
    from public.content
    where id = new.content_id;

    if target_kind is distinct from 'movie' then
      raise exception using errcode = '23514',
        message = 'A content-level download source must target a movie.';
    end if;
  else
    select parent.kind into target_kind
    from public.episodes as episode
    join public.seasons as season on season.id = episode.season_id
    join public.content as parent on parent.id = season.content_id
    where episode.id = new.episode_id;

    if target_kind is null or target_kind = 'movie' then
      raise exception using errcode = '23514',
        message = 'An episode download source must target an episodic title.';
    end if;
  end if;

  select hostname into allowed_hostname
  from public.download_providers
  where id = new.provider_id and enabled;

  if allowed_hostname is null then
    raise exception using errcode = '23514',
      message = 'The download provider is missing or disabled.';
  end if;

  url_prefix := 'https://' || allowed_hostname;
  if pg_catalog.left(pg_catalog.lower(new.download_url), pg_catalog.char_length(url_prefix)) <> url_prefix
    or (
      pg_catalog.char_length(new.download_url) > pg_catalog.char_length(url_prefix)
      and pg_catalog.substr(new.download_url, pg_catalog.char_length(url_prefix) + 1, 1)
        not in ('/', '?', '#')
    )
  then
    raise exception using errcode = '23514',
      message = 'The download URL must use HTTPS and the configured provider hostname.';
  end if;

  return new;
end;
$function$;

revoke all on function public.validate_download_source()
  from public, anon, authenticated;

create trigger download_sources_validate
  before insert or update on public.download_sources
  for each row execute function public.validate_download_source();

create function public.set_link_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$function$;

revoke all on function public.set_link_updated_at()
  from public, anon, authenticated;

create trigger streaming_servers_set_updated_at
  before update on public.streaming_servers
  for each row execute function public.set_link_updated_at();
create trigger download_providers_set_updated_at
  before update on public.download_providers
  for each row execute function public.set_link_updated_at();
create trigger streaming_sources_set_updated_at
  before update on public.streaming_sources
  for each row execute function public.set_link_updated_at();
create trigger download_sources_set_updated_at
  before update on public.download_sources
  for each row execute function public.set_link_updated_at();

alter table public.admin_memberships enable row level security;
alter table public.streaming_servers enable row level security;
alter table public.download_providers enable row level security;
alter table public.streaming_sources enable row level security;
alter table public.download_sources enable row level security;
alter table public.import_history enable row level security;

revoke all on table
  public.admin_memberships,
  public.streaming_servers,
  public.download_providers,
  public.streaming_sources,
  public.download_sources,
  public.import_history
  from public, anon, authenticated;

grant usage on type public.admin_role, public.link_import_kind, public.link_import_status
  to authenticated;
grant select, insert, update, delete on table public.admin_memberships to authenticated;
grant select on table public.streaming_servers, public.download_providers,
  public.streaming_sources, public.download_sources to anon, authenticated;
grant insert, update, delete on table
  public.streaming_servers, public.download_providers,
  public.streaming_sources, public.download_sources
  to authenticated;
grant select, insert on table public.import_history to authenticated;

create policy admin_memberships_select
  on public.admin_memberships
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_admin_permission('admin.manage')
  );

create policy admin_memberships_insert_admin
  on public.admin_memberships
  for insert
  to authenticated
  with check (
    role = 'admin'
    and created_by = (select auth.uid())
    and public.is_super_admin()
  );

create policy admin_memberships_update_admin
  on public.admin_memberships
  for update
  to authenticated
  using (
    role = 'admin'
    and public.is_super_admin()
  )
  with check (
    role = 'admin'
    and public.is_super_admin()
  );

create policy admin_memberships_delete_admin
  on public.admin_memberships
  for delete
  to authenticated
  using (
    role = 'admin'
    and public.is_super_admin()
  );

create policy content_select_admin_import
  on public.content
  for select
  to authenticated
  using (public.has_admin_permission('links.import'));

create policy seasons_select_admin_import
  on public.seasons
  for select
  to authenticated
  using (public.has_admin_permission('links.import'));

create policy episodes_select_admin_import
  on public.episodes
  for select
  to authenticated
  using (public.has_admin_permission('links.import'));

create policy streaming_servers_select_enabled
  on public.streaming_servers
  for select
  to anon, authenticated
  using (enabled);

create policy streaming_servers_admin_manage
  on public.streaming_servers
  for all
  to authenticated
  using (public.has_admin_permission('streaming.manage'))
  with check (public.has_admin_permission('streaming.manage'));

create policy download_providers_select_enabled
  on public.download_providers
  for select
  to anon, authenticated
  using (enabled);

create policy download_providers_admin_manage
  on public.download_providers
  for all
  to authenticated
  using (public.has_admin_permission('downloads.manage'))
  with check (public.has_admin_permission('downloads.manage'));

create policy streaming_sources_select_published
  on public.streaming_sources
  for select
  to anon, authenticated
  using (
    enabled
    and exists (
      select 1 from public.streaming_servers as server
      where server.id = streaming_sources.server_id and server.enabled
    )
    and (
      exists (
        select 1 from public.content as parent
        where parent.id = streaming_sources.content_id
          and parent.kind = 'movie'
          and parent.publication_status = 'published'
      )
      or exists (
        select 1
        from public.episodes as episode
        join public.seasons as season on season.id = episode.season_id
        join public.content as parent on parent.id = season.content_id
        where episode.id = streaming_sources.episode_id
          and parent.publication_status = 'published'
      )
    )
  );

create policy streaming_sources_admin_manage
  on public.streaming_sources
  for all
  to authenticated
  using (public.has_admin_permission('links.import'))
  with check (public.has_admin_permission('links.import'));

create policy download_sources_select_published
  on public.download_sources
  for select
  to anon, authenticated
  using (
    enabled
    and exists (
      select 1 from public.download_providers as provider
      where provider.id = download_sources.provider_id and provider.enabled
    )
    and (
      exists (
        select 1 from public.content as parent
        where parent.id = download_sources.content_id
          and parent.kind = 'movie'
          and parent.publication_status = 'published'
      )
      or exists (
        select 1
        from public.episodes as episode
        join public.seasons as season on season.id = episode.season_id
        join public.content as parent on parent.id = season.content_id
        where episode.id = download_sources.episode_id
          and parent.publication_status = 'published'
      )
    )
  );

create policy download_sources_admin_manage
  on public.download_sources
  for all
  to authenticated
  using (public.has_admin_permission('links.import'))
  with check (public.has_admin_permission('links.import'));

create policy import_history_select_admin
  on public.import_history
  for select
  to authenticated
  using (public.has_admin_permission('links.import'));

create policy import_history_insert_actor_admin
  on public.import_history
  for insert
  to authenticated
  with check (
    actor_id = (select auth.uid())
    and public.has_admin_permission('links.import')
  );