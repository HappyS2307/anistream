create table public.catalogue_import_jobs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('anime','drama','web_series','movie')),
  status text not null default 'queued' check (status in ('queued','processing','completed','partial','failed','cancelled')),
  total_items integer not null check (total_items between 1 and 5000),
  processed_items integer not null default 0 check (processed_items >= 0),
  imported_items integer not null default 0 check (imported_items >= 0),
  failed_items integer not null default 0 check (failed_items >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.catalogue_import_job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.catalogue_import_jobs(id) on delete cascade,
  tmdb_id bigint not null check (tmdb_id > 0),
  status text not null default 'pending' check (status in ('pending','processing','imported','failed')),
  error_message text,
  attempts integer not null default 0 check (attempts >= 0),
  updated_at timestamptz not null default now(),
  unique(job_id, tmdb_id)
);

create index catalogue_import_jobs_actor_created_idx
  on public.catalogue_import_jobs(actor_id, created_at desc);
create index catalogue_import_job_items_pending_idx
  on public.catalogue_import_job_items(job_id, status, updated_at);

alter table public.catalogue_import_jobs enable row level security;
alter table public.catalogue_import_job_items enable row level security;

revoke all on public.catalogue_import_jobs, public.catalogue_import_job_items from public, anon;
grant select, insert, update, delete on public.catalogue_import_jobs to authenticated;
grant select, insert, update on public.catalogue_import_job_items to authenticated;

create policy catalogue_import_jobs_select_own
  on public.catalogue_import_jobs for select to authenticated
  using (actor_id = (select auth.uid()) and public.has_admin_permission('content.manage'));
create policy catalogue_import_jobs_insert_own
  on public.catalogue_import_jobs for insert to authenticated
  with check (actor_id = (select auth.uid()) and public.has_admin_permission('content.manage'));
create policy catalogue_import_jobs_update_own
  on public.catalogue_import_jobs for update to authenticated
  using (actor_id = (select auth.uid()) and public.has_admin_permission('content.manage'))
  with check (actor_id = (select auth.uid()) and public.has_admin_permission('content.manage'));
create policy catalogue_import_jobs_delete_own
  on public.catalogue_import_jobs for delete to authenticated
  using (actor_id = (select auth.uid()) and public.has_admin_permission('content.manage'));

create policy catalogue_import_items_select_own
  on public.catalogue_import_job_items for select to authenticated
  using (exists (
    select 1 from public.catalogue_import_jobs job
    where job.id = catalogue_import_job_items.job_id
      and job.actor_id = (select auth.uid())
      and public.has_admin_permission('content.manage')
  ));
create policy catalogue_import_items_insert_own
  on public.catalogue_import_job_items for insert to authenticated
  with check (exists (
    select 1 from public.catalogue_import_jobs job
    where job.id = catalogue_import_job_items.job_id
      and job.actor_id = (select auth.uid())
      and public.has_admin_permission('content.manage')
  ));
create policy catalogue_import_items_update_own
  on public.catalogue_import_job_items for update to authenticated
  using (exists (
    select 1 from public.catalogue_import_jobs job
    where job.id = catalogue_import_job_items.job_id
      and job.actor_id = (select auth.uid())
      and public.has_admin_permission('content.manage')
  ))
  with check (exists (
    select 1 from public.catalogue_import_jobs job
    where job.id = catalogue_import_job_items.job_id
      and job.actor_id = (select auth.uid())
      and public.has_admin_permission('content.manage')
  ));
