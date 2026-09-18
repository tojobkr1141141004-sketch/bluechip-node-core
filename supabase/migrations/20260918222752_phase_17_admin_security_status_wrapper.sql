-- PHASE 17 — security status public wrapper must run with controlled definer privileges.
create or replace function public.get_admin_session_security_status()
returns jsonb
language sql
security definer
set search_path=public,auth,pg_temp
as $function$
  select private.get_admin_session_security_status();
$function$;

revoke all on function public.get_admin_session_security_status() from public,anon;
grant execute on function public.get_admin_session_security_status() to authenticated;