-- PHASE 7 non-destructive remote verification.

-- Request tables exist and RLS is enabled.
select
  c.relname as object_name,
  c.relkind,
  c.relrowsecurity,
  c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'deposit_requests',
    'withdrawal_requests',
    'user_deposit_requests',
    'user_withdrawal_requests',
    'admin_deposit_requests',
    'admin_withdrawal_requests'
  )
order by c.relname;

-- No direct request-table mutations for application roles.
select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('deposit_requests', 'withdrawal_requests')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- All public PHASE 7 RPC wrappers are SECURITY INVOKER.
select
  routine_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'create_deposit_request',
    'start_deposit_review',
    'approve_deposit_request',
    'reject_deposit_request',
    'cancel_deposit_request',
    'create_withdrawal_request',
    'start_withdrawal_review',
    'approve_withdrawal_request',
    'reject_withdrawal_request',
    'complete_withdrawal_request',
    'fail_withdrawal_request',
    'cancel_withdrawal_request'
  )
order by routine_name;

-- Request idempotency and external-reference uniqueness.
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'deposit_requests_request_key_key',
    'deposit_requests_external_reference_uidx',
    'withdrawal_requests_request_key_key',
    'withdrawal_requests_external_reference_uidx'
  )
order by indexname;

-- Every existing ledger transaction must remain balanced.
select count(*) as unbalanced_transactions
from (
  select lt.id
  from public.ledger_transactions lt
  join public.ledger_entries le on le.transaction_id = lt.id
  group by lt.id
  having sum(case when le.direction = 'debit' then le.amount else 0 end)
      <> sum(case when le.direction = 'credit' then le.amount else 0 end)
) x;

-- Completed/failed workflow rows must have the expected ledger linkage.
select
  (select count(*) from public.deposit_requests
    where status = 'completed' and (completed_at is null or ledger_transaction_id is null)
  ) as invalid_completed_deposits,
  (select count(*) from public.withdrawal_requests
    where status = 'completed'
      and (completed_at is null or reserve_transaction_id is null or completion_transaction_id is null)
  ) as invalid_completed_withdrawals,
  (select count(*) from public.withdrawal_requests
    where status = 'failed'
      and (failed_at is null or reserve_transaction_id is null)
  ) as invalid_failed_withdrawals;

-- No temporary PHASE 7 test data should survive verification.
select
  (select count(*) from public.deposit_requests where request_key like 'phase7-test%') as deposit_test_rows,
  (select count(*) from public.withdrawal_requests where request_key like 'phase7-test%') as withdrawal_test_rows,
  (select count(*) from public.ledger_transactions where idempotency_key like 'phase7-test%') as ledger_test_rows;
