-- PHASE 17 final hardening — keep exposed RPC invoker, use private definer internally.
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
      then greatest(
        0,
        floor(
          extract(
            epoch from (
              clock_timestamp() -
              to_timestamp(((select auth.jwt() ->> 'auth_time'))::double precision)
            )
          )
        )::integer
      )
      else null
    end
  );
$function$;

revoke all on function private.get_admin_session_security_status() from public,anon;
grant execute on function private.get_admin_session_security_status() to authenticated;

create or replace function public.get_admin_session_security_status()
returns jsonb
language sql
stable
security invoker
set search_path=public,auth,pg_temp
as $function$
  select private.get_admin_session_security_status();
$function$;

revoke all on function public.get_admin_session_security_status() from public,anon;
grant execute on function public.get_admin_session_security_status() to authenticated;