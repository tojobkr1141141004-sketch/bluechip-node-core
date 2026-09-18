
-- PHASE 10: mining reconciliation and settlement observability.
-- Read-only operational views. No financial mutation is introduced here.

create or replace view public.admin_mining_reward_events
with (security_invoker = true)
as
select
  mra.id as accrual_id,
  mra.contract_id,
  mra.calculation_run_id,
  mra.user_id,
  mra.product_version_id,
  mp.code as product_code,
  mp.name as product_name,
  mra.asset_id,
  a.code as asset_code,
  a.name as asset_name,
  mra.period_start,
  mra.period_end,
  mra.elapsed_seconds,
  mra.reward_amount as accrued_amount,
  mrp.id as payment_id,
  mrp.amount as paid_amount,
  mrp.ledger_transaction_id,
  mrp.created_at as paid_at,
  mra.created_at as accrued_at
from public.mining_reward_accruals mra
join public.mining_contracts mc on mc.id = mra.contract_id
join public.mining_products mp on mp.id = mc.product_id
join public.mining_product_versions mpv on mpv.id = mra.product_version_id
join public.assets a on a.id = mra.asset_id
left join public.mining_reward_payments mrp on mrp.accrual_id = mra.id;

grant select on public.admin_mining_reward_events to authenticated;
revoke all on public.admin_mining_reward_events from anon;

create or replace view public.admin_mining_calculation_errors
with (security_invoker = true)
as
select
  mce.id,
  mce.calculation_run_id,
  mce.contract_id,
  mc.user_id,
  md.email,
  p.display_name,
  p.username,
  mp.code as product_code,
  mp.name as product_name,
  mce.sqlstate,
  mce.error_message,
  mce.created_at
from public.mining_calculation_errors mce
left join public.mining_contracts mc on mc.id = mce.contract_id
left join public.mining_products mp on mp.id = mc.product_id
left join public.member_directory md on md.user_id = mc.user_id
left join public.profiles p on p.id = mc.user_id;

grant select on public.admin_mining_calculation_errors to authenticated;
revoke all on public.admin_mining_calculation_errors from anon;

create or replace view public.admin_mining_daily_summary
with (security_invoker = true)
as
select
  (mra.period_end at time zone 'Asia/Seoul')::date as summary_date,
  mra.asset_id,
  a.code as asset_code,
  a.name as asset_name,
  count(*)::integer as accrual_count,
  count(distinct mra.contract_id)::integer as contract_count,
  count(distinct mra.user_id)::integer as user_count,
  sum(mra.reward_amount)::numeric(38,18) as accrued_amount,
  coalesce(sum(mrp.amount), 0)::numeric(38,18) as paid_amount,
  (
    sum(mra.reward_amount) - coalesce(sum(mrp.amount), 0)
  )::numeric(38,18) as unpaid_amount
from public.mining_reward_accruals mra
join public.assets a on a.id = mra.asset_id
left join public.mining_reward_payments mrp on mrp.accrual_id = mra.id
group by
  (mra.period_end at time zone 'Asia/Seoul')::date,
  mra.asset_id,
  a.code,
  a.name;

grant select on public.admin_mining_daily_summary to authenticated;
revoke all on public.admin_mining_daily_summary from anon;

create or replace view public.admin_mining_reconciliation_summary
with (security_invoker = true)
as
with contract_rollup as (
  select
    count(*) filter (where status = 'active')::integer as active_contracts,
    count(*) filter (where status = 'completed')::integer as completed_contracts,
    count(*) filter (where status = 'cancelled')::integer as cancelled_contracts,
    count(*) filter (
      where status = 'active'
        and last_calculated_at < scheduled_end_at
        and last_calculated_at < clock_timestamp()
          - make_interval(seconds => (
              select calculation_interval_seconds
              from public.mining_settings
              where id = 1
          ))
    )::integer as overdue_contracts,
    count(*) filter (
      where capacity <= 0
        or total_reward_earned < 0
        or total_reward_paid < 0
        or pending_reward < 0
        or total_reward_earned <> total_reward_paid + pending_reward
        or scheduled_end_at <= started_at
        or last_calculated_at < started_at
        or last_calculated_at > scheduled_end_at
    )::integer as invalid_contracts
  from public.mining_contracts
),
accrual_rollup as (
  select
    count(*)::integer as accrual_count,
    coalesce(sum(reward_amount), 0)::numeric(38,18) as accrued_amount
  from public.mining_reward_accruals
),
payment_rollup as (
  select
    count(*)::integer as payment_count,
    coalesce(sum(amount), 0)::numeric(38,18) as paid_amount
  from public.mining_reward_payments
),
error_rollup as (
  select count(*)::integer as error_count
  from public.mining_calculation_errors
),
ledger_rollup as (
  select count(*)::integer as unbalanced_ledger_count
  from (
    select lt.id
    from public.ledger_transactions lt
    join public.mining_reward_payments mrp
      on mrp.ledger_transaction_id = lt.id
    join public.ledger_entries le
      on le.transaction_id = lt.id
    group by lt.id
    having sum(case when le.direction = 'debit' then le.amount else 0 end)
        <> sum(case when le.direction = 'credit' then le.amount else 0 end)
  ) bad
)
select
  c.active_contracts,
  c.completed_contracts,
  c.cancelled_contracts,
  c.overdue_contracts,
  c.invalid_contracts,
  a.accrual_count,
  a.accrued_amount,
  p.payment_count,
  p.paid_amount,
  (a.accrued_amount - p.paid_amount)::numeric(38,18) as unpaid_amount,
  e.error_count,
  l.unbalanced_ledger_count,
  case
    when c.invalid_contracts = 0
     and l.unbalanced_ledger_count = 0
     and (
       a.accrued_amount - p.paid_amount
       =
       (select coalesce(sum(pending_reward), 0)::numeric(38,18)
        from public.mining_contracts)
     )
    then 'healthy'
    else 'attention'
  end as reconciliation_status;

grant select on public.admin_mining_reconciliation_summary to authenticated;
revoke all on public.admin_mining_reconciliation_summary from anon;

create index if not exists mining_reward_accruals_period_asset_idx
  on public.mining_reward_accruals (period_end desc, asset_id, contract_id);

-- Keep error lookups and daily aggregation efficient for the admin console.
create index if not exists mining_calculation_errors_created_idx
  on public.mining_calculation_errors (created_at desc, calculation_run_id, contract_id);

create index if not exists mining_reward_payments_accrual_created_idx
  on public.mining_reward_payments (accrual_id, created_at desc);
