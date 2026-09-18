-- PHASE 9 non-destructive remote verification.

-- New mining engine tables/views must exist with RLS.
select
  c.relname as object_name,
  c.relkind,
  c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in (
    'mining_contracts',
    'mining_calculation_runs',
    'mining_calculation_errors',
    'mining_reward_accruals',
    'mining_reward_payments',
    'user_mining_contracts',
    'user_mining_reward_history',
    'user_mining_reward_payments',
    'admin_mining_contracts',
    'admin_mining_calculation_runs'
  )
order by c.relname;

-- Application roles may read engine records but cannot directly write them.
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

-- Public wrappers stay SECURITY INVOKER.
select routine_name,security_type
from information_schema.routines
where routine_schema='public'
  and routine_name in (
    'create_mining_contract',
    'run_mining_calculation_now',
    'get_mining_member_candidates'
  )
order by routine_name;

-- Internal entry points must not be anonymously executable.
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema='private'
  and routine_name in (
    'post_ledger_transaction_core',
    'calculate_mining_contract',
    'ensure_user_asset_account_internal',
    'ensure_mining_reward_account'
  )
  and grantee in ('public','anon','authenticated')
order by routine_name,grantee;

-- Contract invariants.
select count(*) as invalid_contracts
from public.mining_contracts
where capacity <= 0
   or capacity <> round(capacity,18)
   or total_reward_earned < 0
   or total_reward_paid < 0
   or pending_reward < 0
   or total_reward_earned <> total_reward_paid + pending_reward
   or scheduled_end_at <= started_at
   or last_calculated_at < started_at
   or last_calculated_at > scheduled_end_at;

-- Contract product/version relationships remain intact and pinned.
select count(*) as invalid_contract_references
from public.mining_contracts mc
left join public.mining_products mp on mp.id=mc.product_id
left join public.mining_product_versions mpv on mpv.id=mc.product_version_id
where mp.id is null
   or mpv.id is null
   or mpv.product_id <> mc.product_id;

-- Every accrual is a positive, non-overflowing time slice tied to the contract asset.
select count(*) as invalid_accruals
from public.mining_reward_accruals mra
join public.mining_contracts mc on mc.id=mra.contract_id
join public.mining_product_versions mpv on mpv.id=mra.product_version_id
where mra.period_end <= mra.period_start
   or mra.elapsed_seconds <= 0
   or mra.reward_amount < 0
   or mra.reward_amount <> round(mra.reward_amount,18)
   or mpv.reward_asset_id <> mra.asset_id
   or mc.user_id <> mra.user_id;

-- Every payment has exactly one accrual and an underlying balanced Ledger transaction.
select count(*) as invalid_payments
from public.mining_reward_payments mrp
left join public.mining_reward_accruals mra on mra.id=mrp.accrual_id
left join public.ledger_transactions lt on lt.id=mrp.ledger_transaction_id
where mra.id is null
   or lt.id is null
   or lt.transaction_type <> 'mining_reward'
   or lt.reference_type <> 'mining_reward_accrual'
   or lt.reference_id <> mrp.accrual_id::text
   or mrp.amount <= 0
   or mrp.amount <> round(mrp.amount,18);

select count(*) as unbalanced_mining_ledger_transactions
from (
  select lt.id
  from public.ledger_transactions lt
  join public.mining_reward_payments mrp on mrp.ledger_transaction_id=lt.id
  join public.ledger_entries le on le.transaction_id=lt.id
  group by lt.id
  having sum(case when le.direction='debit' then le.amount else 0 end)
      <> sum(case when le.direction='credit' then le.amount else 0 end)
) bad;

-- Unique constraints protect duplicate periods, accrual payments, and idempotency.
select
  count(*) filter (where dup='accrual_period') as duplicate_accrual_periods,
  count(*) filter (where dup='payment_accrual') as duplicate_payments
from (
  select 'accrual_period'::text as dup
  from public.mining_reward_accruals
  group by contract_id,period_start,period_end
  having count(*)>1
  union all
  select 'payment_accrual'
  from public.mining_reward_payments
  group by accrual_id
  having count(*)>1
) d;

-- Calculation runs/errors have valid counts and references.
select count(*) as invalid_runs
from public.mining_calculation_runs
where processed_contracts < 0
   or rewarded_contracts < 0
   or error_count < 0
   or (finished_at is not null and finished_at < started_at);

select count(*) as invalid_errors
from public.mining_calculation_errors mce
left join public.mining_calculation_runs mcr on mcr.id=mce.calculation_run_id
where mcr.id is null;

-- Cron schedule is installed and active.
select jobid,jobname,schedule,command,active
from cron.job
where jobname='apex-matrix-mining-calculation';

-- Reward source accounts for current active assets.
select a.code,la.code as account_code,la.allow_negative,b.balance
from public.assets a
join public.ledger_accounts la
  on la.asset_id=a.id
 and la.code='SYSTEM_'||a.code||'_MINING_REWARDS'
join public.ledger_account_balances b on b.account_id=la.id
where a.is_active
order by a.code;

-- Phase 9 test data must never remain.
select
  (select count(*) from public.mining_products where code='P9_ITEST') as test_products,
  (select count(*) from public.mining_contracts mc join public.mining_products mp on mp.id=mc.product_id where mp.code='P9_ITEST') as test_contracts,
  (select count(*) from public.mining_reward_accruals mra join public.mining_contracts mc on mc.id=mra.contract_id join public.mining_products mp on mp.id=mc.product_id where mp.code='P9_ITEST') as test_accruals,
  (select count(*) from public.mining_reward_payments mrp join public.mining_contracts mc on mc.id=mrp.contract_id join public.mining_products mp on mp.id=mc.product_id where mp.code='P9_ITEST') as test_payments,
  (select count(*) from auth.users where email like 'phase9-%@example.invalid') as test_users;