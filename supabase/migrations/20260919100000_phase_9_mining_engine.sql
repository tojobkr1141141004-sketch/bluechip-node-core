
create extension if not exists pg_cron;

-- PHASE 9: automatic mining calculation engine.
-- Contract terms are pinned to a specific published product version.
create table public.mining_contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  product_id uuid not null references public.mining_products(id) on delete restrict,
  product_version_id uuid not null references public.mining_product_versions(id) on delete restrict,
  capacity numeric(38,18) not null,
  status text not null default 'active',
  started_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  last_calculated_at timestamptz not null,
  total_reward_earned numeric(38,18) not null default 0,
  total_reward_paid numeric(38,18) not null default 0,
  pending_reward numeric(38,18) not null default 0,
  idempotency_key text not null unique,
  request_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mining_contracts_status_chk check (
    status in ('active', 'completed', 'cancelled')
  ),
  constraint mining_contracts_capacity_chk check (
    capacity > 0 and capacity = round(capacity, 18)
  ),
  constraint mining_contracts_dates_chk check (
    scheduled_end_at > started_at
    and last_calculated_at >= started_at
    and last_calculated_at <= scheduled_end_at
  ),
  constraint mining_contracts_totals_chk check (
    total_reward_earned >= 0
    and total_reward_earned = round(total_reward_earned, 18)
    and total_reward_paid >= 0
    and total_reward_paid = round(total_reward_paid, 18)
    and pending_reward >= 0
    and pending_reward = round(pending_reward, 18)
  ),
  constraint mining_contracts_idempotency_key_chk check (
    btrim(idempotency_key) <> '' and char_length(idempotency_key) <= 128
  ),
  constraint mining_contracts_request_hash_chk check (
    request_hash ~ '^[0-9a-f]{32}$'
  )
);

create index mining_contracts_user_status_idx
  on public.mining_contracts (user_id, status, started_at desc, id desc);

create index mining_contracts_status_calculation_idx
  on public.mining_contracts (status, last_calculated_at asc, scheduled_end_at asc, id asc);

create index mining_contracts_product_version_idx
  on public.mining_contracts (product_version_id, created_at desc);

create trigger mining_contracts_touch_updated_at
before update on public.mining_contracts
for each row
execute function private.touch_updated_at();

create table public.mining_calculation_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  processed_contracts integer not null default 0,
  rewarded_contracts integer not null default 0,
  error_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint mining_calculation_runs_status_chk check (
    status in ('running', 'completed')
  ),
  constraint mining_calculation_runs_counts_chk check (
    processed_contracts >= 0
    and rewarded_contracts >= 0
    and error_count >= 0
  ),
  constraint mining_calculation_runs_finished_chk check (
    finished_at is null or finished_at >= started_at
  )
);

create index mining_calculation_runs_started_idx
  on public.mining_calculation_runs (started_at desc, id desc);

create table public.mining_calculation_errors (
  id uuid primary key default gen_random_uuid(),
  calculation_run_id uuid not null references public.mining_calculation_runs(id) on delete restrict,
  contract_id uuid references public.mining_contracts(id) on delete restrict,
  sqlstate text not null,
  error_message text not null,
  created_at timestamptz not null default now(),
  constraint mining_calculation_errors_sqlstate_chk check (
    sqlstate ~ '^[0-9A-Z]{5}$'
  ),
  constraint mining_calculation_errors_message_chk check (
    char_length(error_message) between 1 and 2000
  )
);

create index mining_calculation_errors_run_idx
  on public.mining_calculation_errors (calculation_run_id, created_at desc);

create index mining_calculation_errors_contract_idx
  on public.mining_calculation_errors (contract_id, created_at desc);

create table public.mining_reward_accruals (
  id uuid primary key default gen_random_uuid(),
  calculation_run_id uuid not null references public.mining_calculation_runs(id) on delete restrict,
  contract_id uuid not null references public.mining_contracts(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  product_version_id uuid not null references public.mining_product_versions(id) on delete restrict,
  asset_id uuid not null references public.assets(id) on delete restrict,
  period_start timestamptz not null,
  period_end timestamptz not null,
  elapsed_seconds numeric(38,6) not null,
  reward_amount numeric(38,18) not null,
  created_at timestamptz not null default now(),
  constraint mining_reward_accruals_period_chk check (
    period_end > period_start
    and elapsed_seconds > 0
    and elapsed_seconds = round(elapsed_seconds, 6)
  ),
  constraint mining_reward_accruals_reward_chk check (
    reward_amount >= 0
    and reward_amount = round(reward_amount, 18)
  ),
  constraint mining_reward_accruals_unique_period
    unique (contract_id, period_start, period_end)
);

create index mining_reward_accruals_user_created_idx
  on public.mining_reward_accruals (user_id, created_at desc, id desc);

create index mining_reward_accruals_contract_created_idx
  on public.mining_reward_accruals (contract_id, period_start desc, id desc);

create index mining_reward_accruals_run_idx
  on public.mining_reward_accruals (calculation_run_id, created_at desc);

create table public.mining_reward_payments (
  id uuid primary key default gen_random_uuid(),
  calculation_run_id uuid not null references public.mining_calculation_runs(id) on delete restrict,
  accrual_id uuid not null references public.mining_reward_accruals(id) on delete restrict,
  contract_id uuid not null references public.mining_contracts(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  asset_id uuid not null references public.assets(id) on delete restrict,
  amount numeric(38,18) not null,
  ledger_transaction_id uuid not null references public.ledger_transactions(id) on delete restrict,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  constraint mining_reward_payments_amount_chk check (
    amount > 0 and amount = round(amount, 18)
  ),
  constraint mining_reward_payments_idempotency_chk check (
    btrim(idempotency_key) <> '' and char_length(idempotency_key) <= 128
  ),
  constraint mining_reward_payments_ledger_unique unique (ledger_transaction_id),
  constraint mining_reward_payments_accrual_unique unique (accrual_id)
);

create index mining_reward_payments_user_created_idx
  on public.mining_reward_payments (user_id, created_at desc, id desc);

create index mining_reward_payments_contract_created_idx
  on public.mining_reward_payments (contract_id, created_at desc, id desc);

create index mining_reward_payments_run_idx
  on public.mining_reward_payments (calculation_run_id, created_at desc);

create index mining_reward_payments_asset_created_idx
  on public.mining_reward_payments (asset_id, created_at desc, id desc);

-- Lock direct application writes. Mining changes are performed through controlled RPC/internal functions.
revoke insert, update, delete on public.mining_contracts from anon, authenticated;
revoke insert, update, delete on public.mining_calculation_runs from anon, authenticated;
revoke insert, update, delete on public.mining_calculation_errors from anon, authenticated;
revoke insert, update, delete on public.mining_reward_accruals from anon, authenticated;
revoke insert, update, delete on public.mining_reward_payments from anon, authenticated;

grant select on public.mining_contracts to authenticated;
grant select on public.mining_reward_accruals to authenticated;
grant select on public.mining_reward_payments to authenticated;
grant select on public.mining_calculation_runs to authenticated;
grant select on public.mining_calculation_errors to authenticated;

alter table public.mining_contracts enable row level security;
alter table public.mining_calculation_runs enable row level security;
alter table public.mining_calculation_errors enable row level security;
alter table public.mining_reward_accruals enable row level security;
alter table public.mining_reward_payments enable row level security;

create policy mining_contracts_select_policy
  on public.mining_contracts
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_admin_permission('mining.read')
  );

create policy mining_reward_accruals_select_policy
  on public.mining_reward_accruals
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_admin_permission('mining.read')
  );

create policy mining_reward_payments_select_policy
  on public.mining_reward_payments
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_admin_permission('mining.read')
  );

create policy mining_calculation_runs_select_policy
  on public.mining_calculation_runs
  for select to authenticated
  using (
    private.has_admin_permission('mining.read')
  );

create policy mining_calculation_errors_select_policy
  on public.mining_calculation_errors
  for select to authenticated
  using (
    private.has_admin_permission('mining.read')
  );

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
  mc.created_at
from public.mining_contracts mc
join public.mining_products mp on mp.id = mc.product_id
join public.mining_product_versions mpv on mpv.id = mc.product_version_id
join public.assets a on a.id = mpv.reward_asset_id
where mc.user_id = (select auth.uid());

grant select on public.user_mining_contracts to authenticated;
revoke all on public.user_mining_contracts from anon;

create or replace view public.user_mining_reward_history
with (security_invoker = true)
as
select
  mra.id as accrual_id,
  mra.contract_id,
  mra.product_version_id,
  mp.code as product_code,
  mp.name as product_name,
  mra.asset_id,
  a.code as reward_asset_code,
  a.name as reward_asset_name,
  mra.period_start,
  mra.period_end,
  mra.elapsed_seconds,
  mra.reward_amount,
  mra.created_at
from public.mining_reward_accruals mra
join public.mining_products mp on mp.id = (select product_id from public.mining_contracts where id = mra.contract_id)
join public.assets a on a.id = mra.asset_id
where mra.user_id = (select auth.uid());

grant select on public.user_mining_reward_history to authenticated;
revoke all on public.user_mining_reward_history from anon;

create or replace view public.user_mining_reward_payments
with (security_invoker = true)
as
select
  mrp.id as payment_id,
  mrp.contract_id,
  mrp.accrual_id,
  mrp.asset_id,
  a.code as reward_asset_code,
  a.name as reward_asset_name,
  mrp.amount,
  mrp.ledger_transaction_id,
  mrp.created_at
from public.mining_reward_payments mrp
join public.assets a on a.id = mrp.asset_id
where mrp.user_id = (select auth.uid());

grant select on public.user_mining_reward_payments to authenticated;
revoke all on public.user_mining_reward_payments from anon;

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
  mc.created_at
from public.mining_contracts mc
join public.mining_products mp on mp.id = mc.product_id
join public.mining_product_versions mpv on mpv.id = mc.product_version_id
join public.assets a on a.id = mpv.reward_asset_id
left join public.member_directory md on md.user_id = mc.user_id
left join public.profiles p on p.id = mc.user_id;

grant select on public.admin_mining_contracts to authenticated;
revoke all on public.admin_mining_contracts from anon;

create or replace view public.admin_mining_calculation_runs
with (security_invoker = true)
as
select
  id,
  started_at,
  finished_at,
  status,
  processed_contracts,
  rewarded_contracts,
  error_count,
  created_at
from public.mining_calculation_runs;

grant select on public.admin_mining_calculation_runs to authenticated;
revoke all on public.admin_mining_calculation_runs from anon;

create or replace function private.ensure_user_asset_account_internal(
  p_user_id uuid,
  p_asset_id uuid
)
returns uuid
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $function$
declare
  v_account_id uuid;
  v_asset_code text;
begin
  if not exists (
    select 1
    from auth.users
    where id = p_user_id
  ) then
    raise exception 'user not found';
  end if;

  select code into v_asset_code
  from public.assets
  where id = p_asset_id
    and is_active;

  if v_asset_code is null then
    raise exception 'asset not found or inactive';
  end if;

  insert into public.ledger_accounts (
    asset_id,
    account_type,
    owner_user_id,
    name,
    allow_negative
  )
  values (
    p_asset_id,
    'user',
    p_user_id,
    v_asset_code || ' 사용자 계정',
    false
  )
  on conflict (owner_user_id, asset_id) where account_type = 'user'
  do update set updated_at = public.ledger_accounts.updated_at
  returning id into v_account_id;

  insert into public.ledger_account_balances (account_id, balance)
  values (v_account_id, 0)
  on conflict (account_id) do nothing;

  return v_account_id;
end;
$function$;

revoke all on function private.ensure_user_asset_account_internal(uuid, uuid) from public, anon, authenticated;

create or replace function private.ensure_mining_reward_account(
  p_asset_id uuid
)
returns uuid
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $function$
declare
  v_asset_code text;
  v_account_id uuid;
begin
  select code into v_asset_code
  from public.assets
  where id = p_asset_id
    and is_active;

  if v_asset_code is null then
    raise exception 'asset not found or inactive';
  end if;

  insert into public.ledger_accounts (
    asset_id,
    account_type,
    owner_user_id,
    code,
    name,
    allow_negative
  )
  values (
    p_asset_id,
    'system',
    null,
    'SYSTEM_' || v_asset_code || '_MINING_REWARDS',
    v_asset_code || ' 채굴 보상 발행 계정',
    true
  )
  on conflict (code) do nothing;

  select id, asset_id
  into v_account_id, p_asset_id
  from public.ledger_accounts
  where code = 'SYSTEM_' || v_asset_code || '_MINING_REWARDS';

  if v_account_id is null then
    raise exception 'mining reward account provisioning failed';
  end if;

  if not exists (
    select 1 from public.ledger_accounts
    where id = v_account_id
      and asset_id = (
        select id from public.assets where code = v_asset_code
      )
  ) then
    raise exception 'mining reward account asset mismatch';
  end if;

  insert into public.ledger_account_balances (account_id, balance)
  values (v_account_id, 0)
  on conflict (account_id) do nothing;

  return v_account_id;
end;
$function$;

revoke all on function private.ensure_mining_reward_account(uuid) from public, anon, authenticated;

-- Shared internal Ledger core: explicit actor + authorization mode.
create or replace function private.post_ledger_transaction_core(
  p_asset_id uuid,
  p_transaction_type text,
  p_idempotency_key text,
  p_entries jsonb,
  p_description text default '',
  p_reference_type text default null,
  p_reference_id text default null,
  p_reversal_of_transaction_id uuid default null,
  p_created_by uuid default null,
  p_require_finance_permission boolean default false,
  p_allow_system_actor boolean default false
)
returns uuid
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $function$
declare
  v_existing_id uuid;
  v_existing_hash text;
  v_request_hash text;
  v_transaction_id uuid;
  v_asset_decimals smallint;
  v_line_count integer;
  v_distinct_account_count integer;
  v_total_debit numeric(38,18);
  v_total_credit numeric(38,18);
  v_locked_account_count integer;
  v_account record;
  v_delta numeric(38,18);
  v_projected_balance numeric(38,18);
begin
  if p_created_by is null and not p_allow_system_actor then
    raise exception 'authentication required';
  end if;

  if p_require_finance_permission
     and not (select private.has_admin_permission('finance.manage')) then
    raise exception 'permission denied';
  end if;

  if p_created_by is not null
     and p_require_finance_permission
     and not exists (
       select 1
       from auth.users
       where id = p_created_by
     ) then
    raise exception 'actor not found';
  end if;

  if p_asset_id is null then
    raise exception 'asset is required';
  end if;

  if p_transaction_type is null
     or p_transaction_type !~ '^[a-z0-9_]{2,64}$' then
    raise exception 'invalid transaction type';
  end if;

  if p_idempotency_key is null
     or btrim(p_idempotency_key) = ''
     or char_length(p_idempotency_key) > 128 then
    raise exception 'invalid idempotency key';
  end if;

  if jsonb_typeof(p_entries) <> 'array' then
    raise exception 'entries must be a JSON array';
  end if;

  if jsonb_array_length(p_entries) < 2 then
    raise exception 'at least two ledger entries are required';
  end if;

  select id, decimals
  into v_existing_id, v_asset_decimals
  from public.assets
  where id = p_asset_id
    and is_active;

  if v_existing_id is null then
    raise exception 'asset not found or inactive';
  end if;

  v_request_hash := md5(
    jsonb_build_object(
      'asset_id', p_asset_id,
      'transaction_type', p_transaction_type,
      'description', coalesce(p_description, ''),
      'reference_type', p_reference_type,
      'reference_id', p_reference_id,
      'reversal_of_transaction_id', p_reversal_of_transaction_id,
      'entries', p_entries
    )::text
  );

  insert into public.ledger_transactions (
    asset_id,
    transaction_type,
    idempotency_key,
    request_hash,
    reference_type,
    reference_id,
    reversal_of_transaction_id,
    description,
    created_by
  )
  values (
    p_asset_id,
    p_transaction_type,
    p_idempotency_key,
    v_request_hash,
    p_reference_type,
    p_reference_id,
    p_reversal_of_transaction_id,
    coalesce(p_description, ''),
    p_created_by
  )
  on conflict (idempotency_key) do nothing
  returning id into v_transaction_id;

  if v_transaction_id is null then
    select id, request_hash
    into v_existing_id, v_existing_hash
    from public.ledger_transactions
    where idempotency_key = p_idempotency_key;

    if v_existing_hash <> v_request_hash then
      raise exception 'idempotency key conflict';
    end if;

    return v_existing_id;
  end if;

  select count(*),
         count(distinct account_id),
         coalesce(sum(case when direction = 'debit' then amount else 0 end), 0)::numeric(38,18),
         coalesce(sum(case when direction = 'credit' then amount else 0 end), 0)::numeric(38,18)
  into v_line_count, v_distinct_account_count, v_total_debit, v_total_credit
  from jsonb_to_recordset(p_entries)
    as e(account_id uuid, direction text, amount numeric);

  if v_line_count < 2 or v_distinct_account_count < 2 then
    raise exception 'at least two distinct ledger accounts are required';
  end if;

  if v_total_debit <> v_total_credit or v_total_debit <= 0 then
    raise exception 'ledger entries are not balanced';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_entries)
      as e(account_id uuid, direction text, amount numeric)
    where e.account_id is null
       or e.direction not in ('debit', 'credit')
       or e.amount is null
       or e.amount <= 0
       or e.amount <> round(e.amount, 18)
  ) then
    raise exception 'invalid ledger entry';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_entries)
      as e(account_id uuid, direction text, amount numeric)
    where e.amount <> round(e.amount, v_asset_decimals)
  ) then
    raise exception 'amount exceeds asset precision';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_entries)
      as e(account_id uuid, direction text, amount numeric)
    left join public.ledger_accounts la on la.id = e.account_id
    where la.id is null
       or la.asset_id <> p_asset_id
       or not la.is_active
  ) then
    raise exception 'invalid or inactive ledger account';
  end if;

  select count(*)
  into v_locked_account_count
  from public.ledger_accounts la
  where la.id in (
    select distinct e.account_id
    from jsonb_to_recordset(p_entries)
      as e(account_id uuid, direction text, amount numeric)
  );

  if v_locked_account_count <> v_distinct_account_count then
    raise exception 'ledger account validation failed';
  end if;

  perform 1
  from public.ledger_accounts la
  where la.id in (
    select distinct e.account_id
    from jsonb_to_recordset(p_entries)
      as e(account_id uuid, direction text, amount numeric)
  )
  order by la.id
  for update;

  insert into public.ledger_account_balances (account_id, balance)
  select distinct e.account_id, 0
  from jsonb_to_recordset(p_entries)
    as e(account_id uuid, direction text, amount numeric)
  on conflict (account_id) do nothing;

  perform 1
  from public.ledger_account_balances b
  where b.account_id in (
    select distinct e.account_id
    from jsonb_to_recordset(p_entries)
      as e(account_id uuid, direction text, amount numeric)
  )
  order by b.account_id
  for update;

  for v_account in
    select
      la.id,
      la.allow_negative,
      b.balance,
      coalesce(sum(
        case
          when e.direction = 'credit' then e.amount
          else -e.amount
        end
      ), 0)::numeric(38,18) as delta
    from public.ledger_accounts la
    join public.ledger_account_balances b on b.account_id = la.id
    join jsonb_to_recordset(p_entries)
      as e(account_id uuid, direction text, amount numeric)
      on e.account_id = la.id
    group by la.id, la.allow_negative, b.balance
    order by la.id
  loop
    v_delta := v_account.delta;
    v_projected_balance := v_account.balance + v_delta;

    if not v_account.allow_negative and v_projected_balance < 0 then
      raise exception 'insufficient balance';
    end if;

    update public.ledger_account_balances
    set balance = v_projected_balance,
        updated_at = now()
    where account_id = v_account.id;
  end loop;

  insert into public.ledger_entries (
    transaction_id,
    account_id,
    asset_id,
    direction,
    amount
  )
  select
    v_transaction_id,
    e.account_id,
    p_asset_id,
    e.direction,
    e.amount
  from jsonb_to_recordset(p_entries)
    as e(account_id uuid, direction text, amount numeric);

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
    p_created_by,
    null,
    'finance',
    case when p_allow_system_actor then 'system_ledger_posted' else 'ledger_posted' end,
    'ledger_transaction',
    v_transaction_id::text,
    jsonb_build_object(
      'asset_id', p_asset_id,
      'transaction_type', p_transaction_type,
      'idempotency_key', p_idempotency_key,
      'reference_type', p_reference_type,
      'reference_id', p_reference_id,
      'reversal_of_transaction_id', p_reversal_of_transaction_id,
      'actor_type', case when p_allow_system_actor then 'system' else 'user' end
    )
  );

  return v_transaction_id;
end;
$function$;

revoke all on function private.post_ledger_transaction_core(
  uuid, text, text, jsonb, text, text, text, uuid, uuid, boolean, boolean
) from public, anon, authenticated;

create or replace function private.post_ledger_transaction(
  p_asset_id uuid,
  p_transaction_type text,
  p_idempotency_key text,
  p_entries jsonb,
  p_description text default '',
  p_reference_type text default null,
  p_reference_id text default null,
  p_reversal_of_transaction_id uuid default null
)
returns uuid
language sql
security definer
volatile
set search_path = public, auth, pg_temp
as $function$
  select private.post_ledger_transaction_core(
    p_asset_id,
    p_transaction_type,
    p_idempotency_key,
    p_entries,
    p_description,
    p_reference_type,
    p_reference_id,
    p_reversal_of_transaction_id,
    (select auth.uid()),
    true,
    false
  );
$function$;

revoke all on function private.post_ledger_transaction(
  uuid, text, text, jsonb, text, text, text, uuid
) from public, anon, authenticated;
grant execute on function private.post_ledger_transaction(
  uuid, text, text, jsonb, text, text, text, uuid
) to authenticated;

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
      set status = 'completed',
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

  v_new_pending := (
    v_contract.pending_reward + v_earned
  )::numeric(38,18);

  v_payable := trunc(
    v_new_pending,
    v_asset_decimals
  )::numeric(38,18);

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

    v_payment_idempotency_key :=
      'mining_reward:' || v_accrual_id::text;

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

    v_new_pending := (
      v_new_pending - v_payable
    )::numeric(38,18);
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

create or replace function private.run_mining_calculation(
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $function$
declare
  v_settings public.mining_settings%rowtype;
  v_last_started_at timestamptz;
  v_run_id uuid;
  v_run record;
  v_contract record;
  v_now timestamptz := clock_timestamp();
  v_processed integer := 0;
  v_rewarded integer := 0;
  v_errors integer := 0;
  v_state text;
  v_message text;
  v_contract_id uuid;
begin
  if not pg_try_advisory_xact_lock(817293401921::bigint) then
    return jsonb_build_object('status', 'busy');
  end if;

  select * into v_settings
  from public.mining_settings
  where id = 1
  for update;

  if not found then
    raise exception 'mining settings not found';
  end if;

  if not p_force and not v_settings.calculation_enabled then
    return jsonb_build_object('status', 'disabled');
  end if;

  select started_at
  into v_last_started_at
  from public.mining_calculation_runs
  where status = 'completed'
  order by started_at desc, id desc
  limit 1;

  if not p_force
     and v_last_started_at is not null
     and v_now < v_last_started_at
       + make_interval(secs => v_settings.calculation_interval_seconds) then
    return jsonb_build_object(
      'status',
      'waiting_interval',
      'next_run_at',
      v_last_started_at
        + make_interval(secs => v_settings.calculation_interval_seconds)
    );
  end if;

  insert into public.mining_calculation_runs (
    started_at,
    status
  )
  values (
    v_now,
    'running'
  )
  returning id into v_run_id;

  for v_contract in
    select mc.id
    from public.mining_contracts mc
    where mc.status = 'active'
      and mc.started_at <= v_now
      and mc.last_calculated_at < mc.scheduled_end_at
    order by mc.last_calculated_at asc, mc.id asc
    limit v_settings.max_accounts_per_run
    for update skip locked
  loop
    v_contract_id := v_contract.id;

    begin
      v_processed := v_processed + 1;

      if private.calculate_mining_contract(
        v_contract.id,
        v_run_id,
        v_now,
        v_settings.reward_precision
      ) then
        v_rewarded := v_rewarded + 1;
      end if;
    exception
      when others then
        get stacked diagnostics
          v_state = returned_sqlstate,
          v_message = message_text;

        v_errors := v_errors + 1;

        insert into public.mining_calculation_errors (
          calculation_run_id,
          contract_id,
          sqlstate,
          error_message
        )
        values (
          v_run_id,
          v_contract_id,
          left(coalesce(v_state, 'XX000'), 5),
          left(coalesce(v_message, 'unknown mining calculation error'), 2000)
        );
    end;
  end loop;

  update public.mining_calculation_runs
  set
    finished_at = clock_timestamp(),
    status = 'completed',
    processed_contracts = v_processed,
    rewarded_contracts = v_rewarded,
    error_count = v_errors
  where id = v_run_id
  returning * into v_run;

  return jsonb_build_object(
    'status', 'completed',
    'run_id', v_run.id,
    'started_at', v_run.started_at,
    'finished_at', v_run.finished_at,
    'processed_contracts', v_run.processed_contracts,
    'rewarded_contracts', v_run.rewarded_contracts,
    'error_count', v_run.error_count
  );
end;
$function$;

revoke all on function private.run_mining_calculation(boolean)
  from public, anon, authenticated;

create or replace function public.create_mining_contract(
  p_user_id uuid,
  p_product_version_id uuid,
  p_capacity numeric,
  p_started_at timestamptz default now(),
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security invoker
volatile
set search_path = public, auth, pg_temp
as $function$
declare
  v_id uuid;
  v_existing_id uuid;
  v_existing_hash text;
  v_request_hash text;
  v_product_id uuid;
  v_product_status text;
  v_version_status text;
  v_min_capacity numeric(38,18);
  v_max_capacity numeric(38,18);
  v_term_days integer;
  v_reward_asset_id uuid;
begin
  if not private.has_admin_permission('mining.manage') then
    raise exception 'permission denied';
  end if;

  if p_user_id is null or p_product_version_id is null then
    raise exception 'user and product version are required';
  end if;

  if p_started_at is null then
    raise exception 'start time is required';
  end if;

  if p_capacity is null
     or p_capacity <= 0
     or p_capacity <> round(p_capacity, 18) then
    raise exception 'invalid capacity';
  end if;

  select
    mp.id,
    mp.status,
    mpv.status,
    mpv.reward_asset_id,
    mpv.min_capacity,
    mpv.max_capacity,
    mpv.term_days
  into
    v_product_id,
    v_product_status,
    v_version_status,
    v_reward_asset_id,
    v_min_capacity,
    v_max_capacity,
    v_term_days
  from public.mining_product_versions mpv
  join public.mining_products mp on mp.id = mpv.product_id
  where mpv.id = p_product_version_id
  for share;

  if v_product_id is null then
    raise exception 'mining product version not found';
  end if;

  if v_product_status <> 'active' or v_version_status <> 'published' then
    raise exception 'only active product published version can start mining';
  end if;

  if v_reward_asset_id is null then
    raise exception 'reward asset is required';
  end if;

  if p_capacity < v_min_capacity
     or (v_max_capacity is not null and p_capacity > v_max_capacity) then
    raise exception 'capacity is outside product limits';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_user_id
      and status = 'active'
  ) then
    raise exception 'active member not found';
  end if;

  if p_idempotency_key is null
     or btrim(p_idempotency_key) = ''
     or char_length(p_idempotency_key) > 128 then
    raise exception 'idempotency key is required';
  end if;

  v_request_hash := md5(
    jsonb_build_object(
      'user_id', p_user_id,
      'product_version_id', p_product_version_id,
      'capacity', p_capacity,
      'started_at', p_started_at
    )::text
  );

  insert into public.mining_contracts (
    user_id,
    product_id,
    product_version_id,
    capacity,
    status,
    started_at,
    scheduled_end_at,
    last_calculated_at,
    idempotency_key,
    request_hash
  )
  values (
    p_user_id,
    v_product_id,
    p_product_version_id,
    p_capacity,
    'active',
    p_started_at,
    p_started_at + make_interval(days => v_term_days),
    p_started_at,
    p_idempotency_key,
    v_request_hash
  )
  on conflict (idempotency_key) do nothing
  returning id into v_id;

  if v_id is null then
    select id, request_hash
    into v_existing_id, v_existing_hash
    from public.mining_contracts
    where idempotency_key = p_idempotency_key;

    if v_existing_hash <> v_request_hash then
      raise exception 'idempotency key conflict';
    end if;

    return v_existing_id;
  end if;

  perform private.write_finance_audit(
    (select auth.uid()),
    p_user_id,
    'mining_contract_created',
    'mining_contract',
    v_id::text,
    jsonb_build_object(
      'product_id', v_product_id,
      'product_version_id', p_product_version_id,
      'capacity', p_capacity,
      'started_at', p_started_at,
      'term_days', v_term_days,
      'reward_asset_id', v_reward_asset_id
    )
  );

  return v_id;
end;
$function$;

revoke all on function public.create_mining_contract(
  uuid, uuid, numeric, timestamptz, text
) from public, anon;
grant execute on function public.create_mining_contract(
  uuid, uuid, numeric, timestamptz, text
) to authenticated;

create or replace function public.run_mining_calculation_now()
returns jsonb
language plpgsql
security invoker
volatile
set search_path = public, auth, pg_temp
as $function$
begin
  if not private.has_admin_permission('mining.manage') then
    raise exception 'permission denied';
  end if;

  return private.run_mining_calculation(true);
end;
$function$;

revoke all on function public.run_mining_calculation_now() from public, anon;
grant execute on function public.run_mining_calculation_now() to authenticated;

-- The scheduler checks every minute, while mining_settings controls the effective calculation interval.
do $cron$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'apex-matrix-mining-calculation'
  limit 1;

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
end
$cron$;

select cron.schedule(
  'apex-matrix-mining-calculation',
  '* * * * *',
  $$select private.run_mining_calculation(false);$$
);

-- Seed a mining reward source account for currently active assets.
insert into public.ledger_accounts (
  asset_id,
  account_type,
  owner_user_id,
  code,
  name,
  allow_negative
)
select
  a.id,
  'system',
  null,
  'SYSTEM_' || a.code || '_MINING_REWARDS',
  a.code || ' 채굴 보상 발행 계정',
  true
from public.assets a
where a.is_active
on conflict (code) do nothing;

insert into public.ledger_account_balances(account_id, balance)
select la.id, 0
from public.ledger_accounts la
where la.code like 'SYSTEM\_%\_MINING\_REWARDS' escape '\'
on conflict (account_id) do nothing;

-- Explicitly keep source reward accounts outside application mutation scope.
revoke insert, update, delete on public.ledger_accounts from anon, authenticated;
revoke insert, update, delete on public.ledger_account_balances from anon, authenticated;
