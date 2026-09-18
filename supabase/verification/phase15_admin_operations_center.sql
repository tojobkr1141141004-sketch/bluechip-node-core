-- PHASE 15 non-destructive verification for the integrated admin operations center.
select jsonb_build_object(
  'function_exists', to_regprocedure('public.get_admin_operations_center()') is not null,
  'anon_execute', has_function_privilege('anon','public.get_admin_operations_center()','EXECUTE'),
  'authenticated_execute', has_function_privilege('authenticated','public.get_admin_operations_center()','EXECUTE'),
  'private_public_execute', has_function_privilege('public','private.get_admin_operations_center()','EXECUTE'),
  'public_search_path', (select proconfig from pg_proc where oid='public.get_admin_operations_center()'::regprocedure),
  'private_search_path', (select proconfig from pg_proc where oid='private.get_admin_operations_center()'::regprocedure),
  'users', (select count(*) from auth.users),
  'members', (select count(*) from public.profiles),
  'pending_deposits', (select count(*) from public.deposit_requests where status in ('pending','reviewing')),
  'pending_withdrawals', (select count(*) from public.withdrawal_requests where status in ('pending','reviewing','processing')),
  'active_contracts', (select count(*) from public.mining_contracts where status='active'),
  'open_mining_errors', (select count(*) from public.mining_calculation_errors where status='open'),
  'stale_runs', (select count(*) from public.mining_calculation_runs where status='stale'),
  'unbalanced_ledger', (select count(*) from (
     select lt.id from public.ledger_transactions lt
     join public.ledger_entries le on le.transaction_id=lt.id
     group by lt.id
     having coalesce(sum(case when le.direction='debit' then le.amount else 0 end),0)
         <> coalesce(sum(case when le.direction='credit' then le.amount else 0 end),0)
  ) q),
  'security_event_rows', (select count(*) from public.finance_request_events)
) snapshot;