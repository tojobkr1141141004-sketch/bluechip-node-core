
-- PHASE 11 non-destructive verification.

select
  c.relname as object_name,
  c.relkind,
  c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in (
    'mining_contracts',
    'mining_contract_cancellations',
    'user_mining_contracts',
    'user_mining_contract_cancellations',
    'admin_mining_contracts',
    'admin_mining_contract_cancellations'
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
    'mining_contract_cancellations'
  )
  and grantee in ('anon','authenticated')
order by table_name,grantee,privilege_type;

select
  routine_schema,
  routine_name,
  security_type
from information_schema.routines
where routine_schema='public'
  and routine_name = 'cancel_mining_contract';

select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema='private'
  and routine_name in (
    'cancel_mining_contract',
    'calculate_mining_contract'
  )
  and grantee in ('public','anon','authenticated')
order by routine_name,grantee;

select
  (select count(*) from public.mining_contracts
    where (status='completed' and completed_at is null)
       or (status='cancelled' and (cancelled_at is null or cancelled_by is null))
       or (status='active' and (completed_at is not null or cancelled_at is not null or cancelled_by is not null))
  ) as invalid_terminal_contracts,
  (select count(*) from public.mining_contract_cancellations mcc
    join public.mining_contracts mc on mc.id=mcc.contract_id
    where mc.status <> 'cancelled'
  ) as orphan_cancellations,
  (select count(*) from public.mining_contract_cancellations mcc
    where mcc.reward_paid_on_cancel < 0
       or mcc.pending_reward_after_cancel < 0
       or char_length(btrim(mcc.reason)) < 3
  ) as invalid_cancellations,
  (select count(*) from public.mining_reward_accruals mra
    join public.mining_contracts mc on mc.id=mra.contract_id
    where mc.status='cancelled'
      and mra.period_end > mc.cancelled_at
  ) as accruals_after_cancel,
  (select count(*) from public.mining_reward_payments mrp
    join public.mining_contracts mc on mc.id=mrp.contract_id
    where mc.status='cancelled'
      and mrp.created_at < mc.started_at
  ) as payments_before_start,
  (select count(*) from (
      select lt.id
      from public.ledger_transactions lt
      join public.mining_reward_payments mrp on mrp.ledger_transaction_id=lt.id
      join public.ledger_entries le on le.transaction_id=lt.id
      group by lt.id
      having sum(case when le.direction='debit' then le.amount else 0 end)
          <> sum(case when le.direction='credit' then le.amount else 0 end)
    ) bad
  ) as unbalanced_mining_ledger,
  (select count(*) from cron.job where jobname='apex-matrix-mining-calculation' and active) as active_mining_cron;

-- No persistent PHASE 11 test data.
select jsonb_build_object(
  'test_products',(select count(*) from public.mining_products where code like 'P11%'),
  'test_contracts',(select count(*) from public.mining_contracts where id in (
    '77777777-7777-7777-7777-777777777777',
    '88888888-8888-8888-8888-888888888888'
  )),
  'test_cancellations',(select count(*) from public.mining_contract_cancellations where idempotency_key like 'phase11-%'),
  'test_users',(select count(*) from auth.users where email like 'phase11-%@example.invalid')
) as final_state;
