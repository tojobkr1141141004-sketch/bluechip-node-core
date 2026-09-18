-- PHASE 17 — Admin session security gate.
create or replace function private.is_recent_admin_session(p_max_age_seconds integer default 86400)
returns boolean
language sql
stable
security definer
set search_path=public,auth,pg_temp
as $function$
  select
    (select auth.uid()) is not null
    and exists (
      select 1 from public.admin_users au
      where au.user_id=(select auth.uid()) and au.status='active'
    )
    and exists (
      select 1 from auth.sessions s
      where s.id::text=(select auth.jwt() ->> 'session_id')
        and s.user_id=(select auth.uid())
        and coalesce(s.not_after,'infinity'::timestamptz)>clock_timestamp()
    )
    and case
      when (select auth.jwt() ->> 'auth_time') ~ '^[0-9]+$'
      then extract(epoch from (clock_timestamp()-to_timestamp(((select auth.jwt() ->> 'auth_time'))::double precision)))
        <= least(greatest(coalesce(p_max_age_seconds,86400),60),604800)
      else false
    end;
$function$;

revoke all on function private.is_recent_admin_session(integer) from public,anon,authenticated;

create or replace function private.require_recent_admin_session(p_max_age_seconds integer default 86400)
returns void
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $function$
begin
  if not private.is_recent_admin_session(p_max_age_seconds) then
    raise exception 'admin reauthentication required';
  end if;
end;
$function$;

revoke all on function private.require_recent_admin_session(integer) from public,anon,authenticated;

create or replace function private.has_admin_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $function$
  select
    private.is_recent_admin_session(86400)
    and exists (
      select 1
      from public.admin_user_roles aur
      join public.admin_role_permissions arp on arp.role_id=aur.role_id
      join public.admin_permissions ap on ap.id=arp.permission_id
      where aur.user_id=(select auth.uid())
        and ap.code=required_permission
    );
$function$;

revoke all on function private.has_admin_permission(text) from public,anon,authenticated;

create or replace function private.get_admin_session_security_status()
returns jsonb
language sql
stable
security definer
set search_path=public,auth,pg_temp
as $function$
  select jsonb_build_object(
    'authenticated',(select auth.uid()) is not null,
    'active_admin',exists(
      select 1 from public.admin_users au
      where au.user_id=(select auth.uid()) and au.status='active'
    ),
    'recent_auth',private.is_recent_admin_session(86400),
    'max_age_seconds',86400,
    'auth_time',(select auth.jwt() ->> 'auth_time'),
    'session_age_seconds',case
      when (select auth.jwt() ->> 'auth_time') ~ '^[0-9]+$'
      then greatest(0,floor(extract(epoch from (clock_timestamp()-to_timestamp(((select auth.jwt() ->> 'auth_time'))::double precision))))::integer)
      else null
    end
  );
$function$;

revoke all on function private.get_admin_session_security_status() from public,anon,authenticated;

create or replace function public.get_admin_session_security_status()
returns jsonb
language sql
security invoker
set search_path=public,auth,pg_temp
as $function$ select private.get_admin_session_security_status(); $function$;

revoke all on function public.get_admin_session_security_status() from public,anon;
grant execute on function public.get_admin_session_security_status() to authenticated;