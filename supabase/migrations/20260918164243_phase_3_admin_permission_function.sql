create or replace function private.has_admin_permission(required_permission text)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.admin_users au
      join public.admin_user_roles aur on aur.user_id = au.user_id
      join public.admin_role_permissions arp on arp.role_id = aur.role_id
      join public.admin_permissions ap on ap.id = arp.permission_id
      where au.user_id = (select auth.uid())
        and au.status = 'active'
        and ap.code = required_permission
    );
$$;

revoke all on function private.has_admin_permission(text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.has_admin_permission(text) to authenticated;
