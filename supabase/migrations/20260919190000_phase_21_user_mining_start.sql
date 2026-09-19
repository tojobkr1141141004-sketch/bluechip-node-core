-- PHASE 21: allow an authenticated USER to start a mining contract for themselves.
-- Financial posting remains unchanged: reward issuance is still controlled by the
-- existing mining calculation + issuance safety gates.

create or replace function private.start_my_mining_contract(
  p_actor_user_id uuid,
  p_product_version_id uuid,
  p_capacity numeric,
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
  v_reward_asset_id uuid;
  v_min_capacity numeric(38,18);
  v_max_capacity numeric(38,18);
  v_term_days integer;
  v_started_at timestamptz := clock_timestamp();
begin
  if p_actor_user_id is null or p_actor_user_id <> (select auth.uid()) then
    raise exception 'invalid actor';
  end if;

  if p_product_version_id is null then
    raise exception 'product version is required';
  end if;

  if p_capacity is null
     or p_capacity <= 0
     or p_capacity <> round(p_capacity, 18) then
    raise exception 'invalid capacity';
  end if;

  if p_idempotency_key is null
     or btrim(p_idempotency_key) = ''
     or char_length(p_idempotency_key) > 128 then
    raise exception 'idempotency key is required';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_actor_user_id
      and status = 'active'
  ) then
    raise exception 'active member not found';
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
    and mp.status = 'active'
    and mp.is_public = true
    and mpv.status = 'published'
  for share;

  if v_product_id is null then
    raise exception 'public mining product version not found';
  end if;

  if v_reward_asset_id is null then
    raise exception 'reward asset is required';
  end if;

  if p_capacity < v_min_capacity
     or (v_max_capacity is not null and p_capacity > v_max_capacity) then
    raise exception 'capacity is outside product limits';
  end if;

  v_request_hash := md5(
    jsonb_build_object(
      'user_id', p_actor_user_id,
      'product_version_id', p_product_version_id,
      'capacity', p_capacity
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
    p_actor_user_id,
    v_product_id,
    p_product_version_id,
    p_capacity,
    'active',
    v_started_at,
    v_started_at + make_interval(days => v_term_days),
    v_started_at,
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
    p_actor_user_id,
    p_actor_user_id,
    'mining_contract_started_by_user',
    'mining_contract',
    v_id::text,
    jsonb_build_object(
      'product_id', v_product_id,
      'product_version_id', p_product_version_id,
      'capacity', p_capacity,
      'started_at', v_started_at,
      'term_days', v_term_days,
      'reward_asset_id', v_reward_asset_id,
      'source', 'user'
    )
  );

  return v_id;
end;
$function$;

revoke all on function private.start_my_mining_contract(uuid, uuid, numeric, text)
  from public, anon, authenticated;

create or replace function public.start_my_mining_contract(
  p_product_version_id uuid,
  p_capacity numeric,
  p_idempotency_key text
)
returns uuid
language sql
security invoker
volatile
set search_path = public, auth, pg_temp
as $function$
  select private.start_my_mining_contract(
    (select auth.uid()),
    p_product_version_id,
    p_capacity,
    p_idempotency_key
  );
$function$;

revoke all on function public.start_my_mining_contract(uuid, numeric, text)
  from public, anon;

grant execute on function public.start_my_mining_contract(uuid, numeric, text)
  to authenticated;
