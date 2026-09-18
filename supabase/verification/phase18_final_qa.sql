-- PHASE 18 — final read-only production QA.
-- Run with a privileged database connection. This script does not create,
-- modify, or delete application/test data.

with
public_tables as (
  select count(*)::int as n from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relkind='r'
),
public_rls_disabled as (
  select count(*)::int as n from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relkind='r'
    and not c.relrowsecurity
),
ledger_imbalance as (
  select count(*)::int as n
  from (
    select lt.id
    from public.ledger_transactions lt
    left join public.ledger_entries le on le.transaction_id=lt.id
    group by lt.id
    having coalesce(sum(case when le.direction='debit' then le.amount else 0 end),0)
      <> coalesce(sum(case when le.direction='credit' then le.amount else 0 end),0)
      or count(le.id)=0
  ) q
),
public_security_definer as (
  select count(*)::int as n
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prosecdef
),
public_anon_exec as (
  select count(*)::int as n
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and has_function_privilege('anon',p.oid,'EXECUTE')
),
private_definer_without_search_path as (
  select count(*)::int as n
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private'
    and p.prosecdef
    and not exists (
      select 1
      from unnest(coalesce(p.proconfig,'{}'::text[])) cfg
      where cfg like 'search_path=%'
    )
),
trigger_helper_anon_exec as (
  select count(*)::int as n
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private'
    and p.proname in (
      'audit_member_status_change',
      'sync_member_directory_from_auth_users',
      'touch_updated_at'
    )
    and has_function_privilege('anon',p.oid,'EXECUTE')
),
protected_admin_rls as (
  select count(*)::int as n
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relname in (
      'admin_users','admin_roles','admin_user_roles','admin_role_permissions'
    )
    and c.relrowsecurity
),
orphan_finance_events as (
  select count(*)::int as n
  from public.finance_request_events e
  where (e.request_type='deposit' and not exists(select 1 from public.deposit_requests d where d.id=e.request_id))
     or (e.request_type='withdrawal' and not exists(select 1 from public.withdrawal_requests w where w.id=e.request_id))
),
orphan_notification_events as (
  select count(*)::int as n
  from public.admin_notification_events e
  where not exists(select 1 from public.admin_notifications n where n.id=e.notification_id)
),
bad_contract_invariants as (
  select count(*)::int as n
  from public.mining_contracts
  where total_reward_earned < 0
     or total_reward_paid < 0
     or pending_reward < 0
     or total_reward_earned <> total_reward_paid + pending_reward
),
bad_runs as (
  select count(*)::int as n
  from public.mining_calculation_runs
  where processed_contracts < 0
     or rewarded_contracts < 0
     or error_count < 0
     or (status='running' and finished_at is not null)
     or (status in ('completed','failed','stale','recovered') and finished_at is null)
),
active_crons as (
  select count(*)::int as n
  from cron.job
  where jobname in (
    'apex-matrix-mining-calculation',
    'apex-matrix-admin-notification-refresh'
  )
  and active
),
recent_cron_failures as (
  select count(*)::int as n
  from cron.job_run_details
  where start_time > clock_timestamp() - interval '15 minutes'
    and status <> 'succeeded'
),
open_critical as (
  select count(*)::int as n
  from public.mining_calculation_errors
  where status='open'
),
stale_runs as (
  select count(*)::int as n
  from public.mining_calculation_runs
  where status='stale'
),
open_notifications as (
  select count(*)::int as n
  from public.admin_notifications
  where status in ('open','acknowledged')
)
select jsonb_build_object(
  'public_base_tables',(select n from public_tables),
  'public_rls_disabled',(select n from public_rls_disabled),
  'ledger_imbalance',(select n from ledger_imbalance),
  'public_security_definer',(select n from public_security_definer),
  'public_anon_execute',(select n from public_anon_exec),
  'private_definer_without_search_path',(select n from private_definer_without_search_path),
  'private_trigger_helper_anon_execute',(select n from trigger_helper_anon_exec),
  'protected_admin_tables_with_rls',(select n from protected_admin_rls),
  'authenticated_has_admin_permission_exec',
    has_function_privilege('authenticated','private.has_admin_permission(text)','EXECUTE'),
  'authenticated_recent_session_direct_exec',
    has_function_privilege('authenticated','private.is_recent_admin_session(integer)','EXECUTE'),
  'anonymous_admin_status_exec',
    has_function_privilege('anon','public.get_admin_session_security_status()','EXECUTE'),
  'orphan_finance_events',(select n from orphan_finance_events),
  'orphan_notification_events',(select n from orphan_notification_events),
  'bad_contract_invariants',(select n from bad_contract_invariants),
  'bad_mining_runs',(select n from bad_runs),
  'open_mining_errors',(select n from open_critical),
  'stale_mining_runs',(select n from stale_runs),
  'open_notifications',(select n from open_notifications),
  'active_required_crons',(select n from active_crons),
  'recent_cron_failures_15m',(select n from recent_cron_failures),
  'users',(select count(*)::int from auth.users),
  'admin_users',(select count(*)::int from public.admin_users),
  'calculation_enabled',(select calculation_enabled from public.mining_settings where id=1)
) as phase18_final_qa;