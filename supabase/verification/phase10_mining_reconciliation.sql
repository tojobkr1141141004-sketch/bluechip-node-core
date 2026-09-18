
-- PHASE 10 non-destructive remote verification.

select
  c.relname as object_name,
  c.relkind,
  c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in (
    'admin_mining_reward_events',
    'admin_mining_calculation_errors',
    'admin_mining_daily_summary',
    'admin_mining_reconciliation_summary'
  )
order by c.relname;

select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and table_name in (
    'mining_contracts',
    'mining_calculation_runs',
    'mining_calculation_errors',
    'mining_reward_accruals',
    'mining_reward_payments'
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
    'create_mining_contract',
    'run_mining_calculation_now',
    'get_mining_member_candidates'
  )
order by routine_name;

select
  (select count(*) from public.mining_contracts
    where capacity <= 0
       or total_reward_earned < 0
       or total_reward_paid < 0
       or pending_reward < 0
       or total_reward_earned <> total_reward_paid + pending_reward
       or scheduled_end_at <= started_at
       or last_calculated_at < started_at
       or last_calculated_at > scheduled_end_at
  ) as invalid_contracts,
  (select count(*) from public.mining_reward_accruals mra
    join public.mining_contracts mc on mc.id=mra.contract_id
    join public.mining_product_versions mpv on mpv.id=mra.product_version_id
    where mra.period_end <= mra.period_start
       or mra.elapsed_seconds <= 0
       or mra.reward_amount < 0
       or mpv.reward_asset_id <> mra.asset_id
       or mc.user_id <> mra.user_id
  ) as invalid_accruals,
  (select count(*) from public.mining_reward_payments mrp
    left join public.mining_reward_accruals mra on mra.id=mrp.accrual_id
    left join public.ledger_transactions lt on lt.id=mrp.ledger_transaction_id
    where mra.id is null
       or lt.id is null
       or lt.transaction_type <> 'mining_reward'
       or lt.reference_type <> 'mining_reward_accrual'
       or lt.reference_id <> mrp.accrual_id::text
  ) as invalid_payments,
  (select count(*) from (
     select lt.id
     from public.ledger_transactions lt
     join public.mining_reward_payments mrp on mrp.ledger_transaction_id=lt.id
     join public.ledger_entries le on le.transaction_id=lt.id
     group by lt.id
     having sum(case when le.direction='debit' then le.amount else 0 end)
         <> sum(case when le.direction='credit' then le.amount else 0 end)
   ) bad) as unbalanced_ledger_transactions,
  (select count(*) from public.mining_reward_accruals mra
     join public.mining_contracts mc on mc.id=mra.contract_id
     join public.mining_products mp on mp.id=mc.product_id
     left join public.mining_reward_payments mrp on mrp.accrual_id=mra.id
     where mrp.id is null
       and mra.reward_amount > 0
  ) as accruals_without_payment;

select
  count(*) as active_cron_jobs
from cron.job
where jobname='apex-matrix-mining-calculation'
  and active;

select jsonb_build_object(
  'summary_rows', (select count(*) from public.admin_mining_reconciliation_summary),
  'daily_summary_rows', (select count(*) from public.admin_mining_daily_summary),
  'reward_event_rows', (select count(*) from public.admin_mining_reward_events),
  'error_rows', (select count(*) from public.admin_mining_calculation_errors),
  'test_products', (select count(*) from public.mining_products where code like 'P10%TEST%'),
  'test_contracts', (select count(*) from public.mining_contracts mc join public.mining_products mp on mp.id=mc.product_id where mp.code like 'P10%TEST%'),
  'test_accruals', (select count(*) from public.mining_reward_accruals mra join public.mining_contracts mc on mc.id=mra.contract_id join public.mining_products mp on mp.id=mc.product_id where mp.code like 'P10%TEST%'),
  'test_payments', (select count(*) from public.mining_reward_payments mrp join public.mining_contracts mc on mc.id=mrp.contract_id join public.mining_products mp on mp.id=mc.product_id where mp.code like 'P10%TEST%'),
  'test_users', (select count(*) from auth.users where email like 'phase10-%@example.invalid')
) as final_state;
