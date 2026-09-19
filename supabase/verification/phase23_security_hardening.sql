-- PHASE 23 verification
-- Expected:
--   public USER wrappers: SECURITY INVOKER; authenticated execute=true; anon execute=false
--   private implementations: SECURITY DEFINER; authenticated execute=true; anon execute=false
-- The private schema is intentionally not an API surface; wrappers derive actor identity
-- from auth.uid() and private functions validate the same identity again.

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

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.mark_all_my_notifications_read() as all_read_count;
select public.mark_my_notification_read('00000000-0000-0000-0000-000000000002') as one_read_count;
rollback;
