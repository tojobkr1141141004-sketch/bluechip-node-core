-- PHASE 23 verification
-- Expected: public wrappers are SECURITY INVOKER; authenticated can execute them;
-- anon cannot; private privileged implementations remain SECURITY DEFINER and are
-- executable only by postgres. This file is read-only verification.

select
  p.oid::regprocedure::text as signature,
  p.prosecdef as security_definer,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'start_my_mining_contract',
    'mark_my_notification_read',
    'mark_all_my_notifications_read'
  )
order by signature;

select
  p.oid::regprocedure::text as signature,
  p.prosecdef as security_definer,
  has_function_privilege('postgres', p.oid, 'EXECUTE') as postgres_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private'
  and p.proname in (
    'start_my_mining_contract',
    'mark_my_notification_read',
    'mark_all_my_notifications_read'
  )
order by signature;
