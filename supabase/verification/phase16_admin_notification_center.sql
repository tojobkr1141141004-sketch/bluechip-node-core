-- PHASE 16 — non-destructive verification.
select jsonb_build_object(
  'notification_table_rls', (
    select relrowsecurity from pg_class where oid='public.admin_notifications'::regclass
  ),
  'event_table_rls', (
    select relrowsecurity from pg_class where oid='public.admin_notification_events'::regclass
  ),
  'anon_get_execute', has_function_privilege('anon','public.get_admin_notifications(text,integer)','EXECUTE'),
  'auth_get_execute', has_function_privilege('authenticated','public.get_admin_notifications(text,integer)','EXECUTE'),
  'anon_summary_execute', has_function_privilege('anon','public.get_admin_notification_summary()','EXECUTE'),
  'auth_summary_execute', has_function_privilege('authenticated','public.get_admin_notification_summary()','EXECUTE'),
  'anon_ack_execute', has_function_privilege('anon','public.acknowledge_admin_notification(uuid)','EXECUTE'),
  'auth_ack_execute', has_function_privilege('authenticated','public.acknowledge_admin_notification(uuid)','EXECUTE'),
  'anon_resolve_execute', has_function_privilege('anon','public.resolve_admin_notification(uuid)','EXECUTE'),
  'auth_resolve_execute', has_function_privilege('authenticated','public.resolve_admin_notification(uuid)','EXECUTE'),
  'notification_rows', (select count(*) from public.admin_notifications),
  'event_rows', (select count(*) from public.admin_notification_events),
  'refresh_schedule_exists', exists (
    select 1 from cron.job where jobname='apex-matrix-admin-notification-refresh' and active=true
  ),
  'refresh_schedule', (select schedule from cron.job where jobname='apex-matrix-admin-notification-refresh' limit 1),
  'mining_cron_exists', exists (
    select 1 from cron.job where jobname='apex-matrix-mining-calculation' and active=true
  ),
  'unbalanced_ledger', (select count(*) from (
    select lt.id
    from public.ledger_transactions lt
    join public.ledger_entries le on le.transaction_id=lt.id
    group by lt.id
    having coalesce(sum(case when le.direction='debit' then le.amount else 0 end),0)
      <> coalesce(sum(case when le.direction='credit' then le.amount else 0 end),0)
  ) q)
) as phase16_verification;