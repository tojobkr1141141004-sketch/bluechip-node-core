-- PHASE 12 reconciliation hardening: include append-only reward corrections
-- in accrued/paid/unpaid reconciliation totals.

create or replace view public.admin_mining_reconciliation_summary
with (security_invoker=true)
as
with contract_rollup as (
  select
    count(*) filter(where status='active')::integer as active_contracts,
    count(*) filter(where status='completed')::integer as completed_contracts,
    count(*) filter(where status='cancelled')::integer as cancelled_contracts,
    count(*) filter(
      where status='active'
        and last_calculated_at<scheduled_end_at
        and last_calculated_at<clock_timestamp()-make_interval(
          secs=>(select calculation_interval_seconds from public.mining_settings where id=1)
        )
    )::integer as overdue_contracts,
    count(*) filter(
      where capacity<=0
        or total_reward_earned<0
        or total_reward_paid<0
        or pending_reward<0
        or total_reward_earned<>total_reward_paid+pending_reward
        or scheduled_end_at<=started_at
        or last_calculated_at<started_at
        or last_calculated_at>scheduled_end_at
        or(status='completed' and completed_at is null)
        or(status='cancelled' and cancelled_at is null)
    )::integer as invalid_contracts
  from public.mining_contracts
),
base_accrual_rollup as (
  select
    count(*)::integer as accrual_count,
    coalesce(sum(reward_amount),0)::numeric(38,18) as accrued_amount
  from public.mining_reward_accruals
),
base_payment_rollup as (
  select
    count(*)::integer as payment_count,
    coalesce(sum(amount),0)::numeric(38,18) as paid_amount
  from public.mining_reward_payments
),
correction_rollup as (
  select
    coalesce(sum(
      case when correction_type in ('additional_paid','additional_pending')
           then amount else -amount end
    ),0)::numeric(38,18) as accrued_correction_amount,
    coalesce(sum(
      case when correction_type='additional_paid'
           then amount else 0 end
    ),0)::numeric(38,18) as paid_correction_amount
  from public.mining_reward_corrections
),
error_rollup as (
  select
    count(*)::integer as error_count,
    count(*) filter(where status='open')::integer as open_error_count
  from public.mining_calculation_errors
),
run_rollup as (
  select
    count(*) filter(where status='stale')::integer as stale_run_count,
    max(started_at) filter(where status='completed') as last_successful_run_at
  from public.mining_calculation_runs
),
ledger_rollup as (
  select count(*)::integer as unbalanced_ledger_count
  from(
    select lt.id
    from public.ledger_transactions lt
    join public.mining_reward_payments mrp on mrp.ledger_transaction_id=lt.id
    join public.ledger_entries le on le.transaction_id=lt.id
    group by lt.id
    having sum(case when le.direction='debit' then le.amount else 0 end)
      <> sum(case when le.direction='credit' then le.amount else 0 end)
  ) bad
)
select
  c.active_contracts,
  c.completed_contracts,
  c.cancelled_contracts,
  c.overdue_contracts,
  c.invalid_contracts,
  a.accrual_count,
  (a.accrued_amount+cr.accrued_correction_amount)::numeric(38,18) as accrued_amount,
  p.payment_count,
  (p.paid_amount+cr.paid_correction_amount)::numeric(38,18) as paid_amount,
  (
    (a.accrued_amount+cr.accrued_correction_amount)
    -(p.paid_amount+cr.paid_correction_amount)
  )::numeric(38,18) as unpaid_amount,
  e.error_count,
  l.unbalanced_ledger_count,
  case
    when c.invalid_contracts=0
      and l.unbalanced_ledger_count=0
      and e.open_error_count=0
      and r.stale_run_count=0
      and(
        (
          (a.accrued_amount+cr.accrued_correction_amount)
          -(p.paid_amount+cr.paid_correction_amount)
        )=
        (select coalesce(sum(pending_reward),0)::numeric(38,18)
         from public.mining_contracts)
      )
    then 'healthy'
    else 'attention'
  end as reconciliation_status,
  e.open_error_count,
  r.stale_run_count,
  r.last_successful_run_at
from contract_rollup c
cross join base_accrual_rollup a
cross join base_payment_rollup p
cross join correction_rollup cr
cross join error_rollup e
cross join run_rollup r
cross join ledger_rollup l;

grant select on public.admin_mining_reconciliation_summary to authenticated;
revoke all on public.admin_mining_reconciliation_summary from anon;
