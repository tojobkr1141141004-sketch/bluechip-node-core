-- PHASE 12 non-destructive verification.

select
  c.relname as object_name,
  c.relkind,
  c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in (
    'mining_calculation_runs',
    'mining_calculation_errors',
    'mining_reward_corrections',
    'user_mining_reward_corrections',
    'admin_mining_reward_corrections'
  )
order by c.relname;

select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and table_name in (
    'mining_calculation_runs',
    'mining_calculation_errors',
    'mining_reward_corrections'
  )
  and grantee in ('anon','authenticated')
order by table_name,grantee,privilege_type;

select
  routine_schema,
  routine_name,
  security_type
from information_schema.routines
where routine_schema='public'
  and routine_name in (
    'recalculate_mining_contract',
    'retry_mining_calculation_error',
    'apply_mining_reward_correction',
    'recover_stale_mining_calculation_runs'
  )
order by routine_name;

begin;

insert into public.mining_calculation_runs(
  started_at,status,run_key,run_type,request_hash
)
values(
  clock_timestamp()-interval '20 minutes',
  'running',
  'phase12-smoke-stale-0001',
  'scheduled',
  md5('phase12-smoke-stale')
);

select private.recover_stale_mining_calculation_runs(clock_timestamp()) as recovered_stale_runs;

select
  status,
  stale_at is not null as has_stale_at,
  finished_at is not null as has_finished_at
from public.mining_calculation_runs
where run_key='phase12-smoke-stale-0001';

rollback;

select jsonb_build_object(
  'running_runs',(select count(*) from public.mining_calculation_runs where status='running'),
  'stale_runs',(select count(*) from public.mining_calculation_runs where status='stale'),
  'open_errors',(select count(*) from public.mining_calculation_errors where status='open'),
  'reward_corrections',(select count(*) from public.mining_reward_corrections),
  'invalid_reward_invariants',(
    select count(*) from public.mining_contracts
    where total_reward_earned <> total_reward_paid + pending_reward
  ),
  'unbalanced_mining_ledger',(
    select count(*) from(
      select lt.id
      from public.ledger_transactions lt
      join public.mining_reward_payments mrp on mrp.ledger_transaction_id=lt.id
      join public.ledger_entries le on le.transaction_id=lt.id
      group by lt.id
      having sum(case when le.direction='debit' then le.amount else 0 end)
        <> sum(case when le.direction='credit' then le.amount else 0 end)
    ) bad
  )
) as final_state;

select jsonb_build_object(
  'phase12_test_runs',(select count(*) from public.mining_calculation_runs where run_key like 'phase12-%'),
  'phase12_test_errors',(select count(*) from public.mining_calculation_errors where error_message like 'phase12-%'),
  'phase12_test_corrections',(select count(*) from public.mining_reward_corrections where idempotency_key like 'phase12-%')
) as test_state;
