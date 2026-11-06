create index if not exists admin_memberships_created_by_idx
  on public.admin_memberships (created_by)
  where created_by is not null;

create index if not exists download_providers_created_by_idx
  on public.download_providers (created_by)
  where created_by is not null;

create index if not exists download_sources_created_by_idx
  on public.download_sources (created_by)
  where created_by is not null;

create index if not exists playback_progress_content_id_idx
  on public.playback_progress (content_id)
  where content_id is not null;

create index if not exists playback_progress_episode_id_idx
  on public.playback_progress (episode_id)
  where episode_id is not null;

create index if not exists streaming_servers_created_by_idx
  on public.streaming_servers (created_by)
  where created_by is not null;

create index if not exists streaming_sources_created_by_idx
  on public.streaming_sources (created_by)
  where created_by is not null;

create index if not exists user_saved_titles_content_id_idx
  on public.user_saved_titles (content_id);
