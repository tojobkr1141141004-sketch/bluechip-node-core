-- PHASE 12: mining calculation stability, retry/recovery, targeted recalculation,
-- and append-only reward correction records.

alter table public.mining_calculation_runs
  add column if not exists run_key text,
  add column if not exists run_type text,
  add column if not exists request_hash text,
  add column if not exists parent_run_id uuid,
  add column if not exists source_error_id uuid,
  add column if not exists failure_message text,
  add column if not exists stale_at timestamptz,
  add column if not exists recovered_at timestamptz,
  add column if not exists recovered_by_run_id uuid;

update public.mining_calculation_runs
set
  run_key = coalesce(run_key, 'legacy-run:' || id::text),
  run_type = coalesce(run_type, 'scheduled'),
  request_hash = coalesce(
    request_hash,
    md5(jsonb_build_object('legacy_run_id', id, 'started_at', started_at)::text)
  );

alter table public.mining_calculation_runs
  alter column run_key set default gen_random_uuid()::text,
  alter column run_type set default 'scheduled',
  alter column request_hash set default md5(gen_random_uuid()::text);

alter table public.mining_calculation_runs
  alter column run_key set not null,
  alter column run_type set not null,
  alter column request_hash set not null;

alter table public.mining_calculation_runs
  drop constraint if exists mining_calculation_runs_status_chk,
  drop constraint if exists mining_calculation_runs_run_key_chk,
  drop constraint if exists mining_calculation_runs_run_type_chk,
  drop constraint if exists mining_calculation_runs_request_hash_chk,
  drop constraint if exists mining_calculation_runs_lifecycle_chk;

alter table public.mining_calculation_runs
  add constraint mining_calculation_runs_status_chk
  check (status in ('running', 'completed', 'failed', 'stale', 'recovered')),
  add constraint mining_calculation_runs_run_key_chk
  check (char_length(btrim(run_key)) between 8 and 128),
  add constraint mining_calculation_runs_run_type_chk
  check (run_type in ('scheduled', 'retry', 'contract_recalculation', 'cancellation', 'correction')),
  add constraint mining_calculation_runs_request_hash_chk
  check (request_hash ~ '^[0-9a-f]{32}$'),
  add constraint mining_calculation_runs_lifecycle_chk
  check (
    (status = 'running' and finished_at is null and stale_at is null and recovered_at is null and recovered_by_run_id is null)
    or
    (status in ('completed', 'failed') and finished_at is not null and stale_at is null and recovered_at is null and recovered_by_run_id is null)
    or
    (status = 'stale' and finished_at is not null and stale_at is not null and recovered_at is null and recovered_by_run_id is null)
    or
    (status = 'recovered' and finished_at is not null and stale_at is not null and recovered_at is not null and recovered_by_run_id is not null)
  );

create unique index if not exists mining_calculation_runs_run_key_key
  on public.mining_calculation_runs (run_key);
create index if not exists mining_calculation_runs_status_started_idx
  on public.mining_calculation_runs (status, started_at desc, id desc);
create index if not exists mining_calculation_runs_run_type_started_idx
  on public.mining_calculation_runs (run_type, started_at desc, id desc);
create index if not exists mining_calculation_runs_parent_idx
  on public.mining_calculation_runs (parent_run_id);
create index if not exists mining_calculation_runs_source_error_idx
  on public.mining_calculation_runs (source_error_id, started_at desc, id desc);
create index if not exists mining_calculation_runs_stale_idx
  on public.mining_calculation_runs (stale_at desc, id desc);

alter table public.mining_calculation_errors
  add column if not exists status text,
  add column if not exists retry_count integer,
  add column if not exists last_retry_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolution_run_id uuid,
  add column if not exists retry_of_error_id uuid;

update public.mining_calculation_errors
set
  status = coalesce(status, 'open'),
  retry_count = coalesce(retry_count, 0);

alter table public.mining_calculation_errors
  alter column status set default 'open',
  alter column retry_count set default 0,
  alter column status set not null,
  alter column retry_count set not null;

alter table public.mining_calculation_errors
  drop constraint if exists mining_calculation_errors_status_chk,
  drop constraint if exists mining_calculation_errors_retry_count_chk,
  drop constraint if exists mining_calculation_errors_resolution_chk;

alter table public.mining_calculation_errors
  add constraint mining_calculation_errors_status_chk
  check (status in ('open', 'resolved')),
  add constraint mining_calculation_errors_retry_count_chk
  check (retry_count >= 0),
  add constraint mining_calculation_errors_resolution_chk
  check (
    (status = 'open' and resolved_at is null and resolution_run_id is null)
    or
    (status = 'resolved' and resolved_at is not null and resolution_run_id is not null)
  );

create index if not exists mining_calculation_errors_status_created_idx
  on public.mining_calculation_errors (status, created_at desc, id);
create index if not exists mining_calculation_errors_contract_status_idx
  on public.mining_calculation_errors (contract_id, status, created_at desc, id);
create index if not exists mining_calculation_errors_retry_of_idx
  on public.mining_calculation_errors (retry_of_error_id, created_at desc, id);

alter table public.mining_calculation_runs
  add constraint mining_calculation_runs_parent_fkey
  foreign key (parent_run_id) references public.mining_calculation_runs(id) on delete restrict;
alter table public.mining_calculation_runs
  add constraint mining_calculation_runs_source_error_fkey
  foreign key (source_error_id) references public.mining_calculation_errors(id) on delete restrict;
alter table public.mining_calculation_errors
  add constraint mining_calculation_errors_resolution_run_fkey
  foreign key (resolution_run_id) references public.mining_calculation_runs(id) on delete restrict,
  add constraint mining_calculation_errors_retry_of_fkey
  foreign key (retry_of_error_id) references public.mining_calculation_errors(id) on delete restrict;

create table if not exists public.mining_reward_corrections (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.mining_contracts(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  asset_id uuid not null references public.assets(id) on delete restrict,
  calculation_run_id uuid not null references public.mining_calculation_runs(id) on delete restrict,
  original_accrual_id uuid references public.mining_reward_accruals(id) on delete restrict,
  correction_type text not null,
  amount numeric(38,18) not null,
  reason text not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  ledger_transaction_id uuid references public.ledger_transactions(id) on delete restrict,
  idempotency_key text not null unique,
  request_hash text not null,
  created_at timestamptz not null default now(),
  applied_at timestamptz not null default now(),
  constraint mining_reward_corrections_type_chk
    check (correction_type in ('additional_paid','additional_pending','reduce_pending')),
  constraint mining_reward_corrections_amount_chk
    check (amount > 0 and amount = round(amount,18)),
  constraint mining_reward_corrections_reason_chk
    check (char_length(btrim(reason)) between 3 and 1000),
  constraint mining_reward_corrections_idempotency_chk
    check (char_length(btrim(idempotency_key)) between 8 and 128),
  constraint mining_reward_corrections_hash_chk
    check (request_hash ~ '^[0-9a-f]{32}$'),
  constraint mining_reward_corrections_ledger_chk
    check (
      (correction_type = 'additional_paid' and ledger_transaction_id is not null)
      or
      (correction_type in ('additional_pending','reduce_pending') and ledger_transaction_id is null)
    )
);

create unique index if not exists mining_reward_corrections_ledger_key
  on public.mining_reward_corrections (ledger_transaction_id)
  where ledger_transaction_id is not null;
create index if not exists mining_reward_corrections_contract_created_idx
  on public.mining_reward_corrections (contract_id, created_at desc, id);
create index if not exists mining_reward_corrections_user_created_idx
  on public.mining_reward_corrections (user_id, created_at desc, id);
create index if not exists mining_reward_corrections_run_idx
  on public.mining_reward_corrections (calculation_run_id, created_at desc, id);
create index if not exists mining_reward_corrections_accrual_idx
  on public.mining_reward_corrections (original_accrual_id, created_at desc, id);

revoke insert, update, delete on public.mining_reward_corrections from anon, authenticated;
grant select on public.mining_reward_corrections to authenticated;
alter table public.mining_reward_corrections enable row level security;

drop policy if exists mining_reward_corrections_select_policy on public.mining_reward_corrections;
create policy mining_reward_corrections_select_policy
  on public.mining_reward_corrections
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_admin_permission('mining.read')
  );

create or replace view public.user_mining_reward_corrections
with (security_invoker = true)
as
select
  mrc.id as correction_id,
  mrc.contract_id,
  mrc.calculation_run_id,
  mrc.original_accrual_id,
  mrc.correction_type,
  mrc.amount,
  mrc.reason,
  mrc.ledger_transaction_id,
  mrc.created_at,
  mrc.applied_at
from public.mining_reward_corrections mrc
where mrc.user_id = (select auth.uid());

grant select on public.user_mining_reward_corrections to authenticated;
revoke all on public.user_mining_reward_corrections from anon;

create or replace view public.admin_mining_reward_corrections
with (security_invoker = true)
as
select
  mrc.id as correction_id,
  mrc.contract_id,
  mrc.user_id,
  md.email,
  p.display_name,
  p.username,
  mrc.calculation_run_id,
  mrc.original_accrual_id,
  mrc.correction_type,
  mrc.amount,
  a.code as asset_code,
  a.name as asset_name,
  mrc.reason,
  mrc.actor_user_id,
  mrc.ledger_transaction_id,
  mrc.idempotency_key,
  mrc.created_at,
  mrc.applied_at
from public.mining_reward_corrections mrc
join public.assets a on a.id = mrc.asset_id
left join public.member_directory md on md.user_id = mrc.user_id
left join public.profiles p on p.id = mrc.user_id;

grant select on public.admin_mining_reward_corrections to authenticated;
revoke all on public.admin_mining_reward_corrections from anon;

create or replace function private.recover_stale_mining_calculation_runs(
  p_now timestamptz default clock_timestamp()
)
returns integer
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $function$
declare
  v_interval integer;
  v_stale_after integer;
  v_count integer := 0;
  v_run record;
begin
  if current_user <> 'postgres'
     and not private.has_admin_permission('mining.manage') then
    raise exception 'permission denied';
  end if;

  select calculation_interval_seconds into v_interval
  from public.mining_settings
  where id = 1;

  if v_interval is null then
    raise exception 'mining settings not found';
  end if;

  v_stale_after := greatest(v_interval * 2, 600);

  for v_run in
    update public.mining_calculation_runs
    set
      status = 'stale',
      finished_at = coalesce(finished_at, p_now),
      stale_at = p_now,
      failure_message = coalesce(
        failure_message,
        '계산 실행이 복구 기준 시간 안에 종료되지 않아 stale 상태로 전환되었습니다.'
      )
    where status = 'running'
      and started_at < p_now - make_interval(secs => v_stale_after)
    returning id, started_at, run_type
  loop
    v_count := v_count + 1;
    perform private.write_finance_audit(
      null,
      null,
      'mining_calculation_run_stale',
      'mining_calculation_run_stale',
      'mining_calculation_run',
      v_run.id::text,
      jsonb_build_object(
        'run_type', v_run.run_type,
        'started_at', v_run.started_at,
        'stale_at', p_now,
        'stale_after_seconds', v_stale_after
      )
    );
  end loop;

  return v_count;
end;
$function$;

revoke all on function private.recover_stale_mining_calculation_runs(timestamptz)
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
  v_last_terminal_started_at timestamptz;
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
  v_run_key text;
  v_request_hash text;
begin
  if current_user <> 'postgres'
     and not private.has_admin_permission('mining.manage') then
    raise exception 'permission denied';
  end if;

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

  perform private.recover_stale_mining_calculation_runs(v_now);

  select started_at into v_last_terminal_started_at
  from public.mining_calculation_runs
  where status in ('completed', 'failed', 'stale', 'recovered')
  order by started_at desc, id desc
  limit 1;

  if not p_force
     and v_last_terminal_started_at is not null
     and v_now < v_last_terminal_started_at
       + make_interval(secs => v_settings.calculation_interval_seconds) then
    return jsonb_build_object(
      'status','waiting_interval',
      'next_run_at',
      v_last_terminal_started_at + make_interval(secs => v_settings.calculation_interval_seconds)
    );
  end if;

  v_run_key := 'mining-run:' || gen_random_uuid()::text;
  v_request_hash := md5(
    jsonb_build_object(
      'run_type', 'scheduled',
      'force', coalesce(p_force, false),
      'now', v_now
    )::text
  );

  insert into public.mining_calculation_runs(
    started_at, status, run_key, run_type, request_hash
  )
  values(v_now, 'running', v_run_key, 'scheduled', v_request_hash)
  returning id into v_run_id;

  update public.mining_calculation_runs
  set status = 'recovered',
      recovered_at = v_now,
      recovered_by_run_id = v_run_id
  where status = 'stale'
    and stale_at is not null
    and recovered_at is null;

  begin
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
          v_contract.id, v_run_id, v_now, v_settings.reward_precision
        ) then
          v_rewarded := v_rewarded + 1;
        end if;
      exception when others then
        get stacked diagnostics
          v_state = returned_sqlstate,
          v_message = message_text;

        v_errors := v_errors + 1;

        insert into public.mining_calculation_errors(
          calculation_run_id, contract_id, sqlstate, error_message
        )
        values(
          v_run_id, v_contract_id, left(coalesce(v_state,'XX000'),5),
          left(coalesce(v_message,'unknown mining calculation error'),2000)
        );
      end;
    end loop;
  exception when others then
    get stacked diagnostics
      v_state = returned_sqlstate,
      v_message = message_text;

    update public.mining_calculation_runs
    set finished_at = clock_timestamp(),
        status = 'failed',
        processed_contracts = v_processed,
        rewarded_contracts = v_rewarded,
        error_count = v_errors + 1,
        failure_message = left(coalesce(v_message,'unknown mining calculation run error'),2000)
    where id = v_run_id;

    insert into public.mining_calculation_errors(
      calculation_run_id, contract_id, sqlstate, error_message
    )
    values(
      v_run_id, null, left(coalesce(v_state,'XX000'),5),
      left(coalesce(v_message,'unknown mining calculation run error'),2000)
    );

    return jsonb_build_object(
      'status','failed',
      'run_id',v_run_id,
      'processed_contracts',v_processed,
      'rewarded_contracts',v_rewarded,
      'error_count',v_errors + 1
    );
  end;

  update public.mining_calculation_runs
  set finished_at = clock_timestamp(),
      status = case when v_errors > 0 then 'failed' else 'completed' end,
      processed_contracts = v_processed,
      rewarded_contracts = v_rewarded,
      error_count = v_errors,
      failure_message = case when v_errors > 0
        then '하나 이상의 계약 계산이 실패했습니다.'
        else null
      end
  where id = v_run_id
  returning * into v_run;

  return jsonb_build_object(
    'status',v_run.status,
    'run_id',v_run.id,
    'started_at',v_run.started_at,
    'finished_at',v_run.finished_at,
    'processed_contracts',v_run.processed_contracts,
    'rewarded_contracts',v_run.rewarded_contracts,
    'error_count',v_run.error_count
  );
end;
$function$;

revoke all on function private.run_mining_calculation(boolean)
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
set search_path=public,auth,pg_temp
as $function$
declare
  v_contract public.mining_contracts%rowtype;
  v_existing public.mining_contract_cancellations%rowtype;
  v_request_hash text;
  v_now timestamptz:=clock_timestamp();
  v_run_id uuid;
  v_rewarded boolean;
  v_run_hash text;
  v_state text;
begin
  if p_actor_user_id is null or p_actor_user_id <> (select auth.uid()) then
    raise exception 'invalid actor';
  end if;
  if not private.has_admin_permission('mining.manage') then raise exception 'permission denied'; end if;
  if p_contract_id is null then raise exception 'contract is required'; end if;
  if p_reason is null or char_length(btrim(p_reason)) < 3 or char_length(p_reason) > 1000 then
    raise exception 'invalid cancellation reason';
  end if;
  if p_idempotency_key is null or char_length(btrim(p_idempotency_key)) < 8
     or char_length(p_idempotency_key) > 128 then
    raise exception 'invalid idempotency key';
  end if;

  v_request_hash:=md5(jsonb_build_object('contract_id',p_contract_id,'reason',p_reason)::text);

  select * into v_existing
  from public.mining_contract_cancellations
  where idempotency_key=p_idempotency_key;

  if found then
    if v_existing.request_hash <> v_request_hash or v_existing.actor_user_id <> p_actor_user_id then
      raise exception 'idempotency key conflict';
    end if;
    return v_existing.contract_id;
  end if;

  select * into v_contract
  from public.mining_contracts
  where id=p_contract_id
  for update;

  if not found then raise exception 'mining contract not found'; end if;
  if v_contract.status='cancelled' then raise exception 'mining contract already cancelled'; end if;
  if v_contract.status='completed' then raise exception 'completed mining contract cannot be cancelled'; end if;
  if v_now >= v_contract.scheduled_end_at then
    raise exception 'mining contract has reached scheduled end; calculate it to completion first';
  end if;

  v_run_hash:=md5(jsonb_build_object(
    'run_type','cancellation',
    'contract_id',p_contract_id,
    'idempotency_key',p_idempotency_key,
    'reason',p_reason
  )::text);

  insert into public.mining_calculation_runs(started_at,status,run_key,run_type,request_hash)
  values(v_now,'running',p_idempotency_key,'cancellation',v_run_hash)
  returning id into v_run_id;

  begin
    v_rewarded:=private.calculate_mining_contract(
      p_contract_id,v_run_id,v_now,
      (select reward_precision from public.mining_settings where id=1)
    );
  exception when others then
    get stacked diagnostics v_state=returned_sqlstate;
    update public.mining_calculation_runs
    set finished_at=clock_timestamp(),status='failed',
        processed_contracts=1,rewarded_contracts=0,error_count=1,
        failure_message='계약 취소를 위한 최종 계산에 실패했습니다.'
    where id=v_run_id;

    insert into public.mining_calculation_errors(
      calculation_run_id,contract_id,sqlstate,error_message
    ) values(
      v_run_id,p_contract_id,left(coalesce(v_state,'XX000'),5),
      '계약 취소를 위한 최종 계산에 실패했습니다.'
    );
    raise;
  end;

  select * into v_contract
  from public.mining_contracts
  where id=p_contract_id
  for update;

  if v_contract.status <> 'active' then
    raise exception 'mining contract is no longer cancellable';
  end if;

  update public.mining_contracts
  set status='cancelled',cancelled_at=v_now,cancelled_by=p_actor_user_id,updated_at=now()
  where id=p_contract_id;

  update public.mining_calculation_runs
  set finished_at=clock_timestamp(),status='completed',
      processed_contracts=1,
      rewarded_contracts=case when v_rewarded then 1 else 0 end,
      error_count=0
  where id=v_run_id;

  insert into public.mining_contract_cancellations(
    contract_id,user_id,actor_user_id,calculation_run_id,calculated_until,
    reward_paid_on_cancel,pending_reward_after_cancel,reason,idempotency_key,request_hash
  ) values(
    p_contract_id,v_contract.user_id,p_actor_user_id,v_run_id,v_now,
    v_contract.total_reward_paid,v_contract.pending_reward,p_reason,
    p_idempotency_key,v_request_hash
  );

  perform private.write_finance_audit(
    p_actor_user_id,v_contract.user_id,'mining_contract_cancelled',
    'mining_contract','mining_contract',p_contract_id::text,
    jsonb_build_object(
      'calculation_run_id',v_run_id,
      'calculated_until',v_now,
      'reward_paid_on_cancel',v_contract.total_reward_paid,
      'pending_reward_after_cancel',v_contract.pending_reward,
      'reason',p_reason,'idempotency_key',p_idempotency_key
    )
  );

  return p_contract_id;
end;
$function$;

revoke all on function private.cancel_mining_contract(uuid,uuid,text,text)
  from public,anon,authenticated;

create or replace function private.recalculate_mining_contract(
  p_actor_user_id uuid,
  p_contract_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
volatile
set search_path=public,auth,pg_temp
as $function$
declare
  v_contract public.mining_contracts%rowtype;
  v_run public.mining_calculation_runs%rowtype;
  v_existing_run public.mining_calculation_runs%rowtype;
  v_now timestamptz:=clock_timestamp();
  v_request_hash text;
  v_rewarded boolean:=false;
  v_state text;
  v_message text;
begin
  if p_actor_user_id is null or p_actor_user_id<>(select auth.uid()) then raise exception 'invalid actor'; end if;
  if not private.has_admin_permission('mining.manage') then raise exception 'permission denied'; end if;
  if p_contract_id is null then raise exception 'contract is required'; end if;
  if p_idempotency_key is null or char_length(btrim(p_idempotency_key))<8 or char_length(p_idempotency_key)>128 then
    raise exception 'invalid idempotency key';
  end if;

  v_request_hash:=md5(jsonb_build_object(
    'run_type','contract_recalculation','contract_id',p_contract_id
  )::text);

  select * into v_existing_run
  from public.mining_calculation_runs where run_key=p_idempotency_key;

  if found then
    if v_existing_run.request_hash<>v_request_hash then raise exception 'idempotency key conflict'; end if;
    return jsonb_build_object(
      'status',v_existing_run.status,'run_id',v_existing_run.id,
      'processed_contracts',v_existing_run.processed_contracts,
      'rewarded_contracts',v_existing_run.rewarded_contracts,
      'error_count',v_existing_run.error_count
    );
  end if;

  select * into v_contract from public.mining_contracts where id=p_contract_id for update;
  if not found then raise exception 'mining contract not found'; end if;
  if v_contract.status<>'active' then raise exception 'only active mining contract can be recalculated'; end if;

  insert into public.mining_calculation_runs(
    started_at,status,run_key,run_type,request_hash
  ) values(v_now,'running',p_idempotency_key,'contract_recalculation',v_request_hash)
  returning * into v_run;

  begin
    v_rewarded:=private.calculate_mining_contract(
      p_contract_id,v_run.id,v_now,
      (select reward_precision from public.mining_settings where id=1)
    );
  exception when others then
    get stacked diagnostics v_state=returned_sqlstate,v_message=message_text;
    update public.mining_calculation_runs
    set finished_at=clock_timestamp(),status='failed',
        processed_contracts=1,rewarded_contracts=0,error_count=1,
        failure_message=left(coalesce(v_message,'contract recalculation failed'),2000)
    where id=v_run.id;
    insert into public.mining_calculation_errors(
      calculation_run_id,contract_id,sqlstate,error_message
    ) values(v_run.id,p_contract_id,left(coalesce(v_state,'XX000'),5),
             left(coalesce(v_message,'contract recalculation failed'),2000));
    return jsonb_build_object(
      'status','failed','run_id',v_run.id,
      'processed_contracts',1,'rewarded_contracts',0,'error_count',1
    );
  end;

  update public.mining_calculation_runs
  set finished_at=clock_timestamp(),status='completed',processed_contracts=1,
      rewarded_contracts=case when v_rewarded then 1 else 0 end,error_count=0
  where id=v_run.id
  returning * into v_run;

  return jsonb_build_object(
    'status',v_run.status,'run_id',v_run.id,
    'processed_contracts',v_run.processed_contracts,
    'rewarded_contracts',v_run.rewarded_contracts,'error_count',v_run.error_count
  );
end;
$function$;

revoke all on function private.recalculate_mining_contract(uuid,uuid,text)
  from public,anon,authenticated;

create or replace function public.recalculate_mining_contract(
  p_contract_id uuid,p_idempotency_key text
)
returns jsonb language sql security invoker
set search_path=public,auth,pg_temp
as $function$
  select private.recalculate_mining_contract(
    (select auth.uid()),p_contract_id,p_idempotency_key
  );
$function$;

revoke all on function public.recalculate_mining_contract(uuid,text) from public,anon;
grant execute on function public.recalculate_mining_contract(uuid,text) to authenticated;

create or replace function private.retry_mining_calculation_error(
  p_actor_user_id uuid,p_error_id uuid,p_idempotency_key text
)
returns jsonb
language plpgsql security definer volatile
set search_path=public,auth,pg_temp
as $function$
declare
  v_error public.mining_calculation_errors%rowtype;
  v_contract public.mining_contracts%rowtype;
  v_existing_run public.mining_calculation_runs%rowtype;
  v_run public.mining_calculation_runs%rowtype;
  v_now timestamptz:=clock_timestamp();
  v_request_hash text;
  v_state text;
  v_message text;
  v_rewarded boolean:=false;
begin
  if p_actor_user_id is null or p_actor_user_id<>(select auth.uid()) then raise exception 'invalid actor'; end if;
  if not private.has_admin_permission('mining.manage') then raise exception 'permission denied'; end if;
  if p_error_id is null then raise exception 'error id is required'; end if;
  if p_idempotency_key is null or char_length(btrim(p_idempotency_key))<8 or char_length(p_idempotency_key)>128 then
    raise exception 'invalid idempotency key';
  end if;

  v_request_hash:=md5(jsonb_build_object('run_type','retry','error_id',p_error_id)::text);

  select * into v_error from public.mining_calculation_errors where id=p_error_id for update;
  if not found then raise exception 'calculation error not found'; end if;

  select * into v_existing_run from public.mining_calculation_runs where run_key=p_idempotency_key;
  if found then
    if v_existing_run.request_hash<>v_request_hash or v_existing_run.source_error_id<>p_error_id then
      raise exception 'idempotency key conflict';
    end if;
    return jsonb_build_object(
      'status',v_existing_run.status,'run_id',v_existing_run.id,'error_id',p_error_id,
      'retry_count',v_error.retry_count,'error_count',v_existing_run.error_count
    );
  end if;

  if v_error.status='resolved' then
    return jsonb_build_object(
      'status','resolved','run_id',v_error.resolution_run_id,'error_id',p_error_id,
      'retry_count',v_error.retry_count,'error_count',0
    );
  end if;

  if v_error.contract_id is null then raise exception 'only contract calculation errors can be retried'; end if;

  select * into v_contract from public.mining_contracts where id=v_error.contract_id for update;
  if not found then raise exception 'mining contract not found'; end if;

  insert into public.mining_calculation_runs(
    started_at,status,run_key,run_type,request_hash,parent_run_id,source_error_id
  ) values(
    v_now,'running',p_idempotency_key,'retry',v_request_hash,v_error.calculation_run_id,p_error_id
  ) returning * into v_run;

  begin
    v_rewarded:=private.calculate_mining_contract(
      v_contract.id,v_run.id,v_now,
      (select reward_precision from public.mining_settings where id=1)
    );
  exception when others then
    get stacked diagnostics v_state=returned_sqlstate,v_message=message_text;

    update public.mining_calculation_runs
    set finished_at=clock_timestamp(),status='failed',
        processed_contracts=1,rewarded_contracts=0,error_count=1,
        failure_message=left(coalesce(v_message,'mining retry failed'),2000)
    where id=v_run.id;

    insert into public.mining_calculation_errors(
      calculation_run_id,contract_id,sqlstate,error_message,retry_of_error_id
    ) values(
      v_run.id,v_contract.id,left(coalesce(v_state,'XX000'),5),
      left(coalesce(v_message,'mining retry failed'),2000),p_error_id
    );

    update public.mining_calculation_errors
    set retry_count=retry_count+1,last_retry_at=clock_timestamp()
    where id=p_error_id;

    return jsonb_build_object(
      'status','failed','run_id',v_run.id,'error_id',p_error_id,
      'retry_count',(select retry_count from public.mining_calculation_errors where id=p_error_id),
      'error_count',1
    );
  end;

  update public.mining_calculation_runs
  set finished_at=clock_timestamp(),status='completed',processed_contracts=1,
      rewarded_contracts=case when v_rewarded then 1 else 0 end,error_count=0
  where id=v_run.id;

  update public.mining_calculation_errors
  set status='resolved',retry_count=retry_count+1,last_retry_at=clock_timestamp(),
      resolved_at=clock_timestamp(),resolution_run_id=v_run.id
  where id=p_error_id;

  perform private.write_finance_audit(
    p_actor_user_id,v_contract.user_id,'mining_calculation_error_retried',
    'mining_calculation_error_retried','mining_calculation_error',p_error_id::text,
    jsonb_build_object(
      'retry_run_id',v_run.id,'contract_id',v_contract.id,
      'retry_count',(select retry_count from public.mining_calculation_errors where id=p_error_id)
    )
  );

  return jsonb_build_object(
    'status','completed','run_id',v_run.id,'error_id',p_error_id,
    'retry_count',(select retry_count from public.mining_calculation_errors where id=p_error_id),
    'error_count',0
  );
end;
$function$;

revoke all on function private.retry_mining_calculation_error(uuid,uuid,text)
  from public,anon,authenticated;

create or replace function public.retry_mining_calculation_error(
  p_error_id uuid,p_idempotency_key text
)
returns jsonb language sql security invoker
set search_path=public,auth,pg_temp
as $function$
  select private.retry_mining_calculation_error(
    (select auth.uid()),p_error_id,p_idempotency_key
  );
$function$;

revoke all on function public.retry_mining_calculation_error(uuid,text) from public,anon;
grant execute on function public.retry_mining_calculation_error(uuid,text) to authenticated;

create or replace function private.apply_mining_reward_correction(
  p_actor_user_id uuid,p_contract_id uuid,p_original_accrual_id uuid,
  p_correction_type text,p_amount numeric,p_reason text,p_idempotency_key text
)
returns uuid
language plpgsql security definer volatile
set search_path=public,auth,pg_temp
as $function$
declare
  v_contract public.mining_contracts%rowtype;
  v_existing public.mining_reward_corrections%rowtype;
  v_correction_id uuid;
  v_run_id uuid;
  v_run_hash text;
  v_request_hash text;
  v_reward_asset_id uuid;
  v_user_account_id uuid;
  v_reward_account_id uuid;
  v_ledger_transaction_id uuid;
  v_projected_earned numeric(38,18);
  v_projected_paid numeric(38,18);
  v_projected_pending numeric(38,18);
begin
  if p_actor_user_id is null or p_actor_user_id<>(select auth.uid()) then raise exception 'invalid actor'; end if;
  if not private.has_admin_permission('mining.manage') then raise exception 'permission denied'; end if;
  if p_contract_id is null then raise exception 'contract is required'; end if;
  if p_correction_type not in ('additional_paid','additional_pending','reduce_pending') then raise exception 'invalid correction type'; end if;
  if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,18) then raise exception 'invalid correction amount'; end if;
  if p_reason is null or char_length(btrim(p_reason))<3 or char_length(p_reason)>1000 then raise exception 'invalid correction reason'; end if;
  if p_idempotency_key is null or char_length(btrim(p_idempotency_key))<8 or char_length(p_idempotency_key)>128 then raise exception 'invalid idempotency key'; end if;

  v_request_hash:=md5(jsonb_build_object(
    'contract_id',p_contract_id,'original_accrual_id',p_original_accrual_id,
    'correction_type',p_correction_type,'amount',p_amount,'reason',p_reason
  )::text);

  select * into v_existing from public.mining_reward_corrections where idempotency_key=p_idempotency_key;
  if found then
    if v_existing.request_hash<>v_request_hash or v_existing.actor_user_id<>p_actor_user_id then
      raise exception 'idempotency key conflict';
    end if;
    return v_existing.id;
  end if;

  select * into v_contract from public.mining_contracts where id=p_contract_id for update;
  if not found then raise exception 'mining contract not found'; end if;

  select reward_asset_id into v_reward_asset_id
  from public.mining_product_versions where id=v_contract.product_version_id;
  if v_reward_asset_id is null then raise exception 'reward asset not found'; end if;

  if p_original_accrual_id is not null and not exists(
    select 1 from public.mining_reward_accruals
    where id=p_original_accrual_id and contract_id=p_contract_id
      and user_id=v_contract.user_id and asset_id=v_reward_asset_id
  ) then raise exception 'original accrual does not belong to contract'; end if;

  if p_correction_type='additional_pending' and v_contract.status<>'active' then
    raise exception 'additional pending correction requires active contract';
  end if;

  if p_correction_type='reduce_pending' and p_amount>v_contract.pending_reward then
    raise exception 'correction exceeds pending reward';
  end if;

  v_run_hash:=md5(jsonb_build_object(
    'run_type','correction','contract_id',p_contract_id,
    'correction_type',p_correction_type,'amount',p_amount,
    'idempotency_key',p_idempotency_key
  )::text);

  insert into public.mining_calculation_runs(
    started_at,status,run_key,run_type,request_hash
  ) values(clock_timestamp(),'running',p_idempotency_key,'correction',v_run_hash)
  returning id into v_run_id;

  insert into public.mining_reward_corrections(
    contract_id,user_id,asset_id,calculation_run_id,original_accrual_id,
    correction_type,amount,reason,actor_user_id,idempotency_key,request_hash
  ) values(
    p_contract_id,v_contract.user_id,v_reward_asset_id,v_run_id,p_original_accrual_id,
    p_correction_type,p_amount::numeric(38,18),p_reason,p_actor_user_id,
    p_idempotency_key,v_request_hash
  ) returning id into v_correction_id;

  if p_correction_type='additional_paid' then
    v_user_account_id:=private.ensure_user_asset_account_internal(v_contract.user_id,v_reward_asset_id);
    v_reward_account_id:=private.ensure_mining_reward_account(v_reward_asset_id);

    v_ledger_transaction_id:=private.post_ledger_transaction_core(
      v_reward_asset_id,'mining_reward_correction',
      'mining-reward-correction:'||v_correction_id::text,
      jsonb_build_array(
        jsonb_build_object('account_id',v_reward_account_id,'direction','debit','amount',p_amount),
        jsonb_build_object('account_id',v_user_account_id,'direction','credit','amount',p_amount)
      ),
      '채굴 보상 정정 지급','mining_reward_correction',v_correction_id::text,
      null,p_actor_user_id,false,false
    );

    update public.mining_reward_corrections
    set ledger_transaction_id=v_ledger_transaction_id,applied_at=clock_timestamp()
    where id=v_correction_id;

    v_projected_earned:=(v_contract.total_reward_earned+p_amount)::numeric(38,18);
    v_projected_paid:=(v_contract.total_reward_paid+p_amount)::numeric(38,18);
    v_projected_pending:=v_contract.pending_reward;
  elsif p_correction_type='additional_pending' then
    v_projected_earned:=(v_contract.total_reward_earned+p_amount)::numeric(38,18);
    v_projected_paid:=v_contract.total_reward_paid;
    v_projected_pending:=(v_contract.pending_reward+p_amount)::numeric(38,18);
  else
    v_projected_earned:=(v_contract.total_reward_earned-p_amount)::numeric(38,18);
    v_projected_paid:=v_contract.total_reward_paid;
    v_projected_pending:=(v_contract.pending_reward-p_amount)::numeric(38,18);
  end if;

  if v_projected_earned<0 or v_projected_paid<0 or v_projected_pending<0
     or v_projected_earned<>v_projected_paid+v_projected_pending then
    raise exception 'reward invariant would be violated by correction';
  end if;

  update public.mining_contracts
  set total_reward_earned=v_projected_earned,
      total_reward_paid=v_projected_paid,
      pending_reward=v_projected_pending,
      updated_at=now()
  where id=p_contract_id;

  update public.mining_calculation_runs
  set finished_at=clock_timestamp(),status='completed',processed_contracts=1,
      rewarded_contracts=case when p_correction_type='additional_paid' then 1 else 0 end,
      error_count=0
  where id=v_run_id;

  perform private.write_finance_audit(
    p_actor_user_id,v_contract.user_id,'mining_reward_correction_applied',
    'mining_reward_correction_applied','mining_reward_correction',v_correction_id::text,
    jsonb_build_object(
      'contract_id',p_contract_id,'original_accrual_id',p_original_accrual_id,
      'correction_type',p_correction_type,'amount',p_amount,
      'calculation_run_id',v_run_id,'ledger_transaction_id',v_ledger_transaction_id
    )
  );

  return v_correction_id;
end;
$function$;

revoke all on function private.apply_mining_reward_correction(uuid,uuid,uuid,text,numeric,text,text)
  from public,anon,authenticated;

create or replace function public.apply_mining_reward_correction(
  p_contract_id uuid,p_original_accrual_id uuid,p_correction_type text,
  p_amount numeric,p_reason text,p_idempotency_key text
)
returns uuid language sql security invoker
set search_path=public,auth,pg_temp
as $function$
  select private.apply_mining_reward_correction(
    (select auth.uid()),p_contract_id,p_original_accrual_id,p_correction_type,
    p_amount,p_reason,p_idempotency_key
  );
$function$;

revoke all on function public.apply_mining_reward_correction(uuid,uuid,text,numeric,text,text)
  from public,anon;
grant execute on function public.apply_mining_reward_correction(uuid,uuid,text,numeric,text,text)
  to authenticated;

create or replace function public.recover_stale_mining_calculation_runs()
returns integer language sql security invoker
set search_path=public,auth,pg_temp
as $function$
  select private.recover_stale_mining_calculation_runs(clock_timestamp());
$function$;

revoke all on function public.recover_stale_mining_calculation_runs() from public,anon;
grant execute on function public.recover_stale_mining_calculation_runs() to authenticated;

create or replace view public.admin_mining_calculation_runs
with (security_invoker=true)
as
select
  id,started_at,finished_at,status,processed_contracts,rewarded_contracts,error_count,created_at,
  run_key,run_type,request_hash,parent_run_id,source_error_id,failure_message,
  stale_at,recovered_at,recovered_by_run_id
from public.mining_calculation_runs;

grant select on public.admin_mining_calculation_runs to authenticated;
revoke all on public.admin_mining_calculation_runs from anon;

create or replace view public.admin_mining_calculation_errors
with (security_invoker=true)
as
select
  mce.id,mce.calculation_run_id,mce.contract_id,mc.user_id,md.email,p.display_name,p.username,
  mp.code as product_code,mp.name as product_name,mce.sqlstate,mce.error_message,mce.created_at,
  mce.status,mce.retry_count,mce.last_retry_at,mce.resolved_at,mce.resolution_run_id,mce.retry_of_error_id
from public.mining_calculation_errors mce
left join public.mining_contracts mc on mc.id=mce.contract_id
left join public.mining_products mp on mp.id=mc.product_id
left join public.member_directory md on md.user_id=mc.user_id
left join public.profiles p on p.id=mc.user_id;

grant select on public.admin_mining_calculation_errors to authenticated;
revoke all on public.admin_mining_calculation_errors from anon;

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
accrual_rollup as (
  select count(*)::integer as accrual_count,
         coalesce(sum(reward_amount),0)::numeric(38,18) as accrued_amount
  from public.mining_reward_accruals
),
payment_rollup as (
  select count(*)::integer as payment_count,
         coalesce(sum(amount),0)::numeric(38,18) as paid_amount
  from public.mining_reward_payments
),
error_rollup as (
  select count(*)::integer as error_count,
         count(*) filter(where status='open')::integer as open_error_count
  from public.mining_calculation_errors
),
run_rollup as (
  select count(*) filter(where status='stale')::integer as stale_run_count,
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
  c.active_contracts,c.completed_contracts,c.cancelled_contracts,c.overdue_contracts,c.invalid_contracts,
  a.accrual_count,a.accrued_amount,p.payment_count,p.paid_amount,
  (a.accrued_amount-p.paid_amount)::numeric(38,18) as unpaid_amount,
  e.error_count,l.unbalanced_ledger_count,
  case
    when c.invalid_contracts=0
      and l.unbalanced_ledger_count=0
      and e.open_error_count=0
      and r.stale_run_count=0
      and(
        a.accrued_amount-p.paid_amount=
        (select coalesce(sum(pending_reward),0)::numeric(38,18) from public.mining_contracts)
      )
    then 'healthy'
    else 'attention'
  end as reconciliation_status,
  e.open_error_count,r.stale_run_count,r.last_successful_run_at
from contract_rollup c
cross join accrual_rollup a
cross join payment_rollup p
cross join error_rollup e
cross join run_rollup r
cross join ledger_rollup l;

grant select on public.admin_mining_reconciliation_summary to authenticated;
revoke all on public.admin_mining_reconciliation_summary from anon;
