create or replace function public.prevent_last_super_admin_removal()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  if old.role = 'super_admin' then
    if tg_op = 'DELETE' then
      if not exists (
        select 1
        from public.admin_memberships as membership
        where membership.role = 'super_admin'
          and membership.user_id <> old.user_id
      ) then
        raise exception using
          errcode = '23514',
          message = 'The final Super Admin cannot be removed or demoted.';
      end if;
    elsif new.role <> 'super_admin' then
      if not exists (
        select 1
        from public.admin_memberships as membership
        where membership.role = 'super_admin'
          and membership.user_id <> old.user_id
      ) then
        raise exception using
          errcode = '23514',
          message = 'The final Super Admin cannot be removed or demoted.';
      end if;
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$;

revoke all on function public.prevent_last_super_admin_removal()
  from public, anon, authenticated;
