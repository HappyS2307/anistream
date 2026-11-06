create table public.homepage_sections (
  section_key text primary key check (section_key in ('latest','anime','drama','web_series','movies','discover_banner')),
  title text not null check (pg_catalog.char_length(pg_catalog.btrim(title)) between 1 and 80),
  enabled boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  updated_at timestamptz not null default pg_catalog.now()
);

insert into public.homepage_sections (section_key,title,enabled,sort_order) values
  ('latest','Recently added',true,1),
  ('anime','Anime',true,2),
  ('drama','Drama',true,3),
  ('web_series','Web Series',true,4),
  ('movies','Movies',true,5),
  ('discover_banner','Discover more',true,6)
on conflict (section_key) do nothing;

alter table public.homepage_sections enable row level security;
revoke all on table public.homepage_sections from public, anon, authenticated;
grant select on table public.homepage_sections to anon, authenticated;
grant insert, update, delete on table public.homepage_sections to authenticated;

create policy homepage_sections_public_read
  on public.homepage_sections for select to anon, authenticated
  using (true);

create policy homepage_sections_admin_manage
  on public.homepage_sections for all to authenticated
  using (public.has_admin_permission('content.manage'))
  with check (public.has_admin_permission('content.manage'));

create trigger homepage_sections_set_updated_at
  before update on public.homepage_sections
  for each row execute function public.set_updated_at();
