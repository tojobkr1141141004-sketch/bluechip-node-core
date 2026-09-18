
-- PHASE 9 internal-call privilege hardening.
-- SECURITY DEFINER protects the body, but EXECUTE on the called function
-- is still required by the invoker. Keep these calls tightly permission-gated.

create or replace function private.create_mining_contract(
  p_actor_user_id uuid,
  p_user_id uuid,
  p_product_version_id uuid,
  p_capacity numeric,
  p_started_at timestamptz,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
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
  if p_actor_user_id is null or p_actor_user_id <> (select auth.uid()) then
    raise exception 'invalid actor';
  end if;

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

  if p_capacity < v_min_capacity
     or (v_max_capacity is not null and p_capacity > v_max_capacity) then
    raise exception 'capacity is outside product limits';
  end if;

  if not exists (
    select 1 from auth.users where id = p_user_id
  ) then
    raise exception 'member not found';
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
    user_id, product_id, product_version_id, capacity, status,
    started_at, scheduled_end_at, last_calculated_at,
    idempotency_key, request_hash
  )
  values (
    p_user_id, v_product_id, p_product_version_id, p_capacity, 'active',
    p_started_at, p_started_at + make_interval(days => v_term_days), p_started_at,
    p_idempotency_key, v_request_hash
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
    p_actor_user_id,
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

grant execute on function private.create_mining_contract(
  uuid, uuid, uuid, numeric, timestamptz, text
) to authenticated;

grant execute on function private.get_mining_member_candidates()
  to authenticated;

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

  select started_at into v_last_started_at
  from public.mining_calculation_runs
  where status = 'completed'
  order by started_at desc, id desc
  limit 1;

  if not p_force
     and v_last_started_at is not null
     and v_now < v_last_started_at
       + make_interval(secs => v_settings.calculation_interval_seconds) then
    return jsonb_build_object(
      'status','waiting_interval',
      'next_run_at',
      v_last_started_at + make_interval(secs => v_settings.calculation_interval_seconds)
    );
  end if;

  insert into public.mining_calculation_runs(started_at,status)
  values(v_now,'running')
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
        calculation_run_id,contract_id,sqlstate,error_message
      ) values (
        v_run_id,v_contract_id,left(coalesce(v_state,'XX000'),5),
        left(coalesce(v_message,'unknown mining calculation error'),2000)
      );
    end;
  end loop;

  update public.mining_calculation_runs
  set finished_at=clock_timestamp(),
      status='completed',
      processed_contracts=v_processed,
      rewarded_contracts=v_rewarded,
      error_count=v_errors
  where id=v_run_id
  returning * into v_run;

  return jsonb_build_object(
    'status','completed',
    'run_id',v_run.id,
    'started_at',v_run.started_at,
    'finished_at',v_run.finished_at,
    'processed_contracts',v_run.processed_contracts,
    'rewarded_contracts',v_run.rewarded_contracts,
    'error_count',v_run.error_count
  );
end;
$function$;

grant execute on function private.run_mining_calculation(boolean)
  to authenticated;
