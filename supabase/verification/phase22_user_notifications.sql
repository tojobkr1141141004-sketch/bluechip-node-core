-- PHASE 22 verification: USER notification center
select
  exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'user_notifications'
      and c.relrowsecurity
  ) as rls_enabled,
  exists (
    select 1 from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'user_notifications'
      and p.polname = 'user_notifications_select_own'
  ) as own_select_policy,
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.mining_contracts'::regclass
      and tgname = 'mining_contract_started_user_notification'
      and not tgisinternal
  ) as mining_notification_trigger;

select
  coalesce(bool_or(privilege_type = 'SELECT'), false) as authenticated_select,
  coalesce(bool_or(privilege_type = 'INSERT'), false) as authenticated_insert,
  coalesce(bool_or(privilege_type = 'UPDATE'), false) as authenticated_update,
  coalesce(bool_or(privilege_type = 'DELETE'), false) as authenticated_delete
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'user_notifications'
  and grantee = 'authenticated';

select routine_schema, routine_name, security_type
from information_schema.routines
where routine_schema in ('public', 'private')
  and routine_name in (
    'create_user_notification',
    'mark_my_notification_read',
    'mark_all_my_notifications_read',
    'notify_mining_contract_started'
  )
order by routine_schema, routine_name;

select count(*)::bigint as user_notification_rows
from public.user_notifications;
