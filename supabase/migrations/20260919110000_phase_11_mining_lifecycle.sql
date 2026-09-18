
-- PHASE 11: mining contract lifecycle and controlled cancellation.
-- Idempotent migration: safe to apply after live SQL changes or during deployment.

alter table public.mining_contracts
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id) on delete restrict;

update public.mining_contracts
set completed_at = coalesce(completed_at, scheduled_end_at)
where status = 'completed' and completed_at is null;

update public.mining_contracts
set cancelled_at = coalesce(cancelled_at, updated_at)
where status = 'cancelled' and cancelled_at is null;

alter table public.mining_contracts
  drop constraint if exists mining_contracts_terminal_fields_chk;

alter table public.mining_contracts
  add constraint mining_contracts_terminal_fields_chk
  check (
    (status = 'completed' and completed_at is not null and cancelled_at is null and cancelled_by is null)
    or
    (status = 'cancelled' and cancelled_at is not null and completed_at is null)
    or
    (status in ('active') and completed_at is null and cancelled_at is null and cancelled_by is null)
  );

create index if not exists mining_contracts_cancelled_idx
  on public.mining_contracts (cancelled_at desc, cancelled_by, id);

create table if not exists public.mining_contract_cancellations (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null unique references public.mining_contracts(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  calculation_run_id uuid not null references public.mining_calculation_runs(id) on delete restrict,
  calculated_until timestamptz not null,
  reward_paid_on_cancel numeric(38,18) not null default 0,
  pending_reward_after_cancel numeric(38,18) not null default 0,
  reason text not null,
  idempotency_key text not null unique,
  request_hash text not null,
  created_at timestamptz not null default now(),
  constraint mining_contract_cancellations_reason_chk
    check (char_length(btrim(reason)) between 3 and 1000),
  constraint mining_contract_cancellations_amount_chk
    check (
      reward_paid_on_cancel >= 0
      and reward_paid_on_cancel = round(reward_paid_on_cancel,18)
      and pending_reward_after_cancel >= 0
      and pending_reward_after_cancel = round(pending_reward_after_cancel,18)
    ),
  constraint mining_contract_cancellations_idempotency_chk
    check (char_length(btrim(idempotency_key)) between 8 and 128),
  constraint mining_contract_cancellations_hash_chk
    check (request_hash ~ '^[0-9a-f]{32}$')
);

create index if not exists mining_contract_cancellations_user_created_idx
  on public.mining_contract_cancellations (user_id, created_at desc, id);

create index if not exists mining_contract_cancellations_actor_created_idx
  on public.mining_contract_cancellations (actor_user_id, created_at desc, id);

create index if not exists mining_contract_cancellations_run_idx
  on public.mining_contract_cancellations (calculation_run_id, created_at desc, id);

create index if not exists mining_contract_cancellations_contract_created_idx
  on public.mining_contract_cancellations (contract_id, created_at desc, id);

revoke all on public.mining_contract_cancellations from anon, authenticated;
grant select on public.mining_contract_cancellations to authenticated;
alter table public.mining_contract_cancellations enable row level security;

drop policy if exists mining_contract_cancellations_select_policy on public.mining_contract_cancellations;
create policy mining_contract_cancellations_select_policy
  on public.mining_contract_cancellations
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_admin_permission('mining.read')
  );

create or replace view public.user_mining_contract_cancellations
with (security_invoker = true)
as
select
  mcc.id as cancellation_id,
  mcc.contract_id,
  mcc.calculation_run_id,
  mcc.calculated_until,
  mcc.reward_paid_on_cancel,
  mcc.pending_reward_after_cancel,
  mcc.reason,
  mcc.created_at
from public.mining_contract_cancellations mcc
where mcc.user_id = (select auth.uid());

grant select on public.user_mining_contract_cancellations to authenticated;
revoke all on public.user_mining_contract_cancellations from anon;

create or replace view public.admin_mining_contract_cancellations
with (security_invoker = true)
as
select
  mcc.id as cancellation_id,
  mcc.contract_id,
  mcc.user_id,
  md.email,
  p.display_name,
  p.username,
  mcc.actor_user_id,
  mcc.calculation_run_id,
  mp.code as product_code,
  mp.name as product_name,
  mcc.calculated_until,
  mcc.reward_paid_on_cancel,
  mcc.pending_reward_after_cancel,
  mcc.reason,
  mcc.idempotency_key,
  mcc.created_at
from public.mining_contract_cancellations mcc
join public.mining_contracts mc on mc.id = mcc.contract_id
join public.mining_products mp on mp.id = mc.product_id
left join public.member_directory md on md.user_id = mcc.user_id
left join public.profiles p on p.id = mcc.user_id;

grant select on public.admin_mining_contract_cancellations to authenticated;
revoke all on public.admin_mining_contract_cancellations from anon;

create or replace view public.user_mining_contracts
with (security_invoker = true)
as
select
  mc.id as contract_id,
  mc.product_id,
  mp.code as product_code,
  mp.name as product_name,
  mc.product_version_id,
  mpv.version,
  mc.capacity,
  mpv.capacity_unit,
  mpv.reward_per_unit_per_day,
  mc.status,
  mc.started_at,
  mc.scheduled_end_at,
  mc.last_calculated_at,
  mc.total_reward_earned,
  mc.total_reward_paid,
  mc.pending_reward,
  mpv.reward_asset_id,
  a.code as reward_asset_code,
  a.name as reward_asset_name,
  a.decimals as reward_asset_decimals,
  mc.created_at,
  mc.completed_at,
  mc.cancelled_at
from public.mining_contracts mc
join public.mining_products mp on mp.id = mc.product_id
join public.mining_product_versions mpv on mpv.id = mc.product_version_id
join public.assets a on a.id = mpv.reward_asset_id
where mc.user_id = (select auth.uid());

grant select on public.user_mining_contracts to authenticated;
revoke all on public.user_mining_contracts from anon;

create or replace view public.admin_mining_contracts
with (security_invoker = true)
as
select
  mc.id as contract_id,
  mc.user_id,
  md.email,
  p.display_name,
  p.username,
  mc.product_id,
  mp.code as product_code,
  mp.name as product_name,
  mc.product_version_id,
  mpv.version,
  mc.capacity,
  mpv.capacity_unit,
  mpv.reward_per_unit_per_day,
  mc.status,
  mc.started_at,
  mc.scheduled_end_at,
  mc.last_calculated_at,
  mc.total_reward_earned,
  mc.total_reward_paid,
  mc.pending_reward,
  a.code as reward_asset_code,
  a.name as reward_asset_name,
  mc.created_at,
  mc.completed_at,
  mc.cancelled_at,
  mc.cancelled_by
from public.mining_contracts mc
join public.mining_products mp on mp.id = mc.product_id
join public.mining_product_versions mpv on mpv.id = mc.product_version_id
join public.assets a on a.id = mpv.reward_asset_id
left join public.member_directory md on md.user_id = mc.user_id
left join public.profiles p on p.id = mc.user_id;

grant select on public.admin_mining_contracts to authenticated;
revoke all on public.admin_mining_contracts from anon;

create or replace function private.calculate_mining_contract(
  p_contract_id uuid,
  p_calculation_run_id uuid,
  p_now timestamptz,
  p_reward_precision smallint
)
returns boolean
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $function$
declare
  v_contract record;
  v_asset_decimals smallint;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_elapsed_seconds numeric(38,6);
  v_earned numeric(38,18);
  v_new_pending numeric(38,18);
  v_payable numeric(38,18);
  v_user_account_id uuid;
  v_reward_account_id uuid;
  v_accrual_id uuid;
  v_payment_id uuid;
  v_ledger_transaction_id uuid;
  v_payment_idempotency_key text;
begin
  select
    mc.id,
    mc.user_id,
    mc.product_id,
    mc.product_version_id,
    mc.capacity,
    mc.status,
    mc.started_at,
    mc.scheduled_end_at,
    mc.last_calculated_at,
    mc.total_reward_earned,
    mc.total_reward_paid,
    mc.pending_reward,
    mpv.reward_asset_id,
    mpv.reward_per_unit_per_day,
    mpv.capacity_unit
  into v_contract
  from public.mining_contracts mc
  join public.mining_product_versions mpv on mpv.id = mc.product_version_id
  where mc.id = p_contract_id
  for update;

  if not found then
    raise exception 'mining contract not found';
  end if;

  if v_contract.status <> 'active' then
    return false;
  end if;

  select decimals into v_asset_decimals
  from public.assets
  where id = v_contract.reward_asset_id
    and is_active;

  if v_asset_decimals is null then
    raise exception 'reward asset not found or inactive';
  end if;

  v_period_start := greatest(v_contract.last_calculated_at, v_contract.started_at);
  v_period_end := least(p_now, v_contract.scheduled_end_at);

  if v_period_end <= v_period_start then
    if p_now >= v_contract.scheduled_end_at then
      update public.mining_contracts
      set
        status = 'completed',
        completed_at = coalesce(completed_at, scheduled_end_at),
        last_calculated_at = v_contract.scheduled_end_at,
        updated_at = now()
      where id = v_contract.id;
    end if;
    return false;
  end if;

  v_elapsed_seconds := extract(epoch from (v_period_end - v_period_start))::numeric(38,6);

  v_earned := round(
    (
      v_contract.capacity
      * v_contract.reward_per_unit_per_day
      * v_elapsed_seconds
      / 86400::numeric
    ),
    greatest(0, least(18, p_reward_precision::integer))
  )::numeric(38,18);

  v_new_pending := (v_contract.pending_reward + v_earned)::numeric(38,18);

  v_payable := trunc(v_new_pending, v_asset_decimals)::numeric(38,18);

  insert into public.mining_reward_accruals (
    calculation_run_id,
    contract_id,
    user_id,
    product_version_id,
    asset_id,
    period_start,
    period_end,
    elapsed_seconds,
    reward_amount
  )
  values (
    p_calculation_run_id,
    v_contract.id,
    v_contract.user_id,
    v_contract.product_version_id,
    v_contract.reward_asset_id,
    v_period_start,
    v_period_end,
    v_elapsed_seconds,
    v_earned
  )
  returning id into v_accrual_id;

  if v_payable > 0 then
    v_user_account_id := private.ensure_user_asset_account_internal(
      v_contract.user_id,
      v_contract.reward_asset_id
    );

    v_reward_account_id := private.ensure_mining_reward_account(
      v_contract.reward_asset_id
    );

    v_payment_idempotency_key := 'mining_reward:' || v_accrual_id::text;

    v_ledger_transaction_id := private.post_ledger_transaction_core(
      v_contract.reward_asset_id,
      'mining_reward',
      v_payment_idempotency_key,
      jsonb_build_array(
        jsonb_build_object(
          'account_id', v_reward_account_id,
          'direction', 'debit',
          'amount', v_payable
        ),
        jsonb_build_object(
          'account_id', v_user_account_id,
          'direction', 'credit',
          'amount', v_payable
        )
      ),
      '자동 채굴 보상 지급',
      'mining_reward_accrual',
      v_accrual_id::text,
      null,
      null,
      false,
      true
    );

    insert into public.mining_reward_payments (
      calculation_run_id,
      accrual_id,
      contract_id,
      user_id,
      asset_id,
      amount,
      ledger_transaction_id,
      idempotency_key
    )
    values (
      p_calculation_run_id,
      v_accrual_id,
      v_contract.id,
      v_contract.user_id,
      v_contract.reward_asset_id,
      v_payable,
      v_ledger_transaction_id,
      v_payment_idempotency_key
    )
    returning id into v_payment_id;

    v_new_pending := (v_new_pending - v_payable)::numeric(38,18);
  end if;

  update public.mining_contracts
  set
    last_calculated_at = v_period_end,
    total_reward_earned = (total_reward_earned + v_earned)::numeric(38,18),
    total_reward_paid = (total_reward_paid + v_payable)::numeric(38,18),
    pending_reward = v_new_pending,
    status = case
      when v_period_end >= scheduled_end_at then 'completed'
      else 'active'
    end,
    completed_at = case
      when v_period_end >= scheduled_end_at then coalesce(completed_at, scheduled_end_at)
      else completed_at
    end,
    updated_at = now()
  where id = v_contract.id;

  insert into public.audit_logs (
    actor_user_id,
    target_user_id,
    event_type,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    null,
    v_contract.user_id,
    'mining',
    'mining_reward_calculated',
    'mining_contract',
    v_contract.id::text,
    jsonb_build_object(
      'calculation_run_id', p_calculation_run_id,
      'period_start', v_period_start,
      'period_end', v_period_end,
      'elapsed_seconds', v_elapsed_seconds,
      'reward_earned', v_earned,
      'reward_paid', v_payable,
      'pending_reward', v_new_pending,
      'asset_id', v_contract.reward_asset_id
    )
  );

  return v_payable > 0;
end;
$function$;

revoke all on function private.calculate_mining_contract(uuid, uuid, timestamptz, smallint)
  from public, anon, authenticated;

create or replace function private.cancel_mining_contract(
  p_actor_user_id uuid,
  p_contract_id uuid,
  p_reason text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $function$
declare
  v_contract public.mining_contracts%rowtype;
  v_existing public.mining_contract_cancellations%rowtype;
  v_request_hash text;
  v_now timestamptz := clock_timestamp();
  v_run_id uuid;
  v_rewarded boolean;
begin
  if p_actor_user_id is null or p_actor_user_id <> (select auth.uid()) then
    raise exception 'invalid actor';
  end if;

  if not private.has_admin_permission('mining.manage') then
    raise exception 'permission denied';
  end if;

  if p_contract_id is null then
    raise exception 'contract is required';
  end if;

  if p_reason is null or char_length(btrim(p_reason)) < 3 or char_length(p_reason) > 1000 then
    raise exception 'invalid cancellation reason';
  end if;

  if p_idempotency_key is null
     or char_length(btrim(p_idempotency_key)) < 8
     or char_length(p_idempotency_key) > 128 then
    raise exception 'invalid idempotency key';
  end if;

  v_request_hash := md5(
    jsonb_build_object(
      'contract_id', p_contract_id,
      'reason', p_reason
    )::text
  );

  select *
  into v_existing
  from public.mining_contract_cancellations
  where idempotency_key = p_idempotency_key;

  if found then
    if v_existing.request_hash <> v_request_hash
       or v_existing.actor_user_id <> p_actor_user_id then
      raise exception 'idempotency key conflict';
    end if;
    return v_existing.contract_id;
  end if;

  select *
  into v_contract
  from public.mining_contracts
  where id = p_contract_id
  for update;

  if not found then
    raise exception 'mining contract not found';
  end if;

  if v_contract.status = 'cancelled' then
    raise exception 'mining contract already cancelled';
  end if;

  if v_contract.status = 'completed' then
    raise exception 'completed mining contract cannot be cancelled';
  end if;

  if v_now >= v_contract.scheduled_end_at then
    raise exception 'mining contract has reached scheduled end; calculate it to completion first';
  end if;

  insert into public.mining_calculation_runs(started_at,status)
  values(v_now,'running')
  returning id into v_run_id;

  begin
    v_rewarded := private.calculate_mining_contract(
      p_contract_id,
      v_run_id,
      v_now,
      (select reward_precision from public.mining_settings where id=1)
    );
  exception
    when others then
      update public.mining_calculation_runs
      set finished_at = clock_timestamp(),
          status = 'completed',
          processed_contracts = 1,
          rewarded_contracts = 0,
          error_count = 1
      where id = v_run_id;
      raise;
  end;

  select *
  into v_contract
  from public.mining_contracts
  where id = p_contract_id
  for update;

  if v_contract.status <> 'active' then
    raise exception 'mining contract is no longer cancellable';
  end if;

  update public.mining_contracts
  set
    status = 'cancelled',
    cancelled_at = v_now,
    cancelled_by = p_actor_user_id,
    updated_at = now()
  where id = p_contract_id;

  update public.mining_calculation_runs
  set
    finished_at = clock_timestamp(),
    status = 'completed',
    processed_contracts = 1,
    rewarded_contracts = case when v_rewarded then 1 else 0 end,
    error_count = 0
  where id = v_run_id;

  insert into public.mining_contract_cancellations (
    contract_id,
    user_id,
    actor_user_id,
    calculation_run_id,
    calculated_until,
    reward_paid_on_cancel,
    pending_reward_after_cancel,
    reason,
    idempotency_key,
    request_hash
  )
  values (
    p_contract_id,
    v_contract.user_id,
    p_actor_user_id,
    v_run_id,
    v_now,
    v_contract.total_reward_paid,
    v_contract.pending_reward,
    p_reason,
    p_idempotency_key,
    v_request_hash
  );

  perform private.write_finance_audit(
    p_actor_user_id,
    v_contract.user_id,
    'mining_contract_cancelled',
    'mining_contract',
    p_contract_id::text,
    jsonb_build_object(
      'calculation_run_id', v_run_id,
      'calculated_until', v_now,
      'reward_paid_on_cancel', v_contract.total_reward_paid,
      'pending_reward_after_cancel', v_contract.pending_reward,
      'reason', p_reason,
      'idempotency_key', p_idempotency_key
    )
  );

  return p_contract_id;
end;
$function$;

revoke all on function private.cancel_mining_contract(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function private.cancel_mining_contract(uuid, uuid, text, text)
  to authenticated;

create or replace function public.cancel_mining_contract(
  p_contract_id uuid,
  p_reason text,
  p_idempotency_key text
)
returns uuid
language sql
security invoker
set search_path = public, auth, pg_temp
as $function$
  select private.cancel_mining_contract(
    (select auth.uid()),
    p_contract_id,
    p_reason,
    p_idempotency_key
  );
$function$;

revoke all on function public.cancel_mining_contract(uuid, text, text)
  from public, anon;
grant execute on function public.cancel_mining_contract(uuid, text, text)
  to authenticated;

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
          - make_interval(secs => (
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
        or (status = 'completed' and completed_at is null)
        or (status = 'cancelled' and cancelled_at is null)
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
  end as reconciliation_status
from contract_rollup c
cross join accrual_rollup a
cross join payment_rollup p
cross join error_rollup e
cross join ledger_rollup l;
