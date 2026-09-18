create or replace function private.create_deposit_request(
  p_asset_id uuid,
  p_amount numeric,
  p_request_key text,
  p_user_note text default ''
)
returns uuid
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_hash text;
  v_request_id uuid;
  v_existing_hash text;
  v_existing_user_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_request_key is null or btrim(p_request_key) = '' or char_length(p_request_key) > 128 then
    raise exception 'invalid request key';
  end if;

  if char_length(coalesce(p_user_note, '')) > 500 then
    raise exception 'note too long';
  end if;

  v_hash := md5(
    jsonb_build_object(
      'asset_id', p_asset_id,
      'amount', p_amount,
      'user_note', coalesce(p_user_note, '')
    )::text
  );

  select id, request_hash, user_id
  into v_request_id, v_existing_hash, v_existing_user_id
  from public.deposit_requests
  where request_key = p_request_key;

  if v_request_id is not null then
    if v_existing_user_id <> v_user_id or v_existing_hash <> v_hash then
      raise exception 'request key conflict';
    end if;

    return v_request_id;
  end if;

  perform private.validate_request_asset_amount(p_asset_id, p_amount);

  insert into public.deposit_requests (
    user_id, asset_id, amount, request_key, request_hash, user_note
  )
  values (
    v_user_id, p_asset_id, p_amount, p_request_key, v_hash, coalesce(p_user_note, '')
  )
  on conflict (request_key) do nothing
  returning id into v_request_id;

  if v_request_id is null then
    select id, request_hash, user_id
    into v_request_id, v_existing_hash, v_existing_user_id
    from public.deposit_requests
    where request_key = p_request_key;

    if v_existing_user_id <> v_user_id or v_existing_hash <> v_hash then
      raise exception 'request key conflict';
    end if;

    return v_request_id;
  end if;

  perform private.write_finance_audit(
    v_user_id,
    v_user_id,
    'deposit_requested',
    'deposit_request',
    v_request_id::text,
    jsonb_build_object(
      'asset_id', p_asset_id,
      'amount', p_amount,
      'request_key', p_request_key
    )
  );

  return v_request_id;
end;
$$;

revoke all on function private.create_deposit_request(uuid, numeric, text, text) from public, anon, authenticated;

create or replace function public.create_deposit_request(
  p_asset_id uuid,
  p_amount numeric,
  p_request_key text,
  p_user_note text default ''
)
returns uuid
language sql
security invoker
set search_path = public, auth, pg_temp
as $$
  select private.create_deposit_request(
    p_asset_id,
    p_amount,
    p_request_key,
    p_user_note
  );
$$;

revoke all on function public.create_deposit_request(uuid, numeric, text, text) from public, anon;
grant execute on function public.create_deposit_request(uuid, numeric, text, text) to authenticated;

create or replace function private.create_withdrawal_request(
  p_asset_id uuid,
  p_amount numeric,
  p_destination_type text,
  p_destination_name text,
  p_destination_value text,
  p_destination_network text,
  p_request_key text,
  p_user_note text default ''
)
returns uuid
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_asset_code text;
  v_asset_type text;
  v_account_id uuid;
  v_balance numeric;
  v_hash text;
  v_request_id uuid;
  v_existing_hash text;
  v_existing_user_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_request_key is null or btrim(p_request_key) = '' or char_length(p_request_key) > 128 then
    raise exception 'invalid request key';
  end if;

  if char_length(coalesce(p_user_note, '')) > 500 then
    raise exception 'note too long';
  end if;

  select code, asset_type
  into v_asset_code, v_asset_type
  from public.assets
  where id = p_asset_id and is_active;

  if v_asset_code is null then
    raise exception 'asset not found or inactive';
  end if;

  perform private.validate_request_asset_amount(p_asset_id, p_amount);

  if v_asset_type = 'fiat' then
    if p_destination_type <> 'bank'
       or p_destination_name is null or btrim(p_destination_name) = ''
       or p_destination_value is null or btrim(p_destination_value) = ''
       or p_destination_network is not null then
      raise exception 'invalid bank destination';
    end if;
  elsif v_asset_type = 'crypto' then
    if p_destination_type <> 'wallet'
       or p_destination_value is null or btrim(p_destination_value) = ''
       or p_destination_network is null or btrim(p_destination_network) = '' then
      raise exception 'invalid wallet destination';
    end if;
  else
    raise exception 'unsupported asset type';
  end if;

  v_hash := md5(
    jsonb_build_object(
      'asset_id', p_asset_id,
      'amount', p_amount,
      'destination_type', p_destination_type,
      'destination_name', coalesce(p_destination_name, ''),
      'destination_value', p_destination_value,
      'destination_network', coalesce(p_destination_network, ''),
      'user_note', coalesce(p_user_note, '')
    )::text
  );

  select id, request_hash, user_id
  into v_request_id, v_existing_hash, v_existing_user_id
  from public.withdrawal_requests
  where request_key = p_request_key;

  if v_request_id is not null then
    if v_existing_user_id <> v_user_id or v_existing_hash <> v_hash then
      raise exception 'request key conflict';
    end if;

    return v_request_id;
  end if;

  v_account_id := private.ensure_user_asset_account(v_user_id, p_asset_id);

  select balance into v_balance
  from public.ledger_account_balances
  where account_id = v_account_id
  for update;

  if v_balance < p_amount then
    raise exception 'insufficient balance';
  end if;

  insert into public.withdrawal_requests (
    user_id,
    asset_id,
    amount,
    destination_type,
    destination_name,
    destination_value,
    destination_network,
    request_key,
    request_hash,
    user_note
  )
  values (
    v_user_id,
    p_asset_id,
    p_amount,
    p_destination_type,
    nullif(btrim(p_destination_name), ''),
    btrim(p_destination_value),
    nullif(btrim(p_destination_network), ''),
    p_request_key,
    v_hash,
    coalesce(p_user_note, '')
  )
  on conflict (request_key) do nothing
  returning id into v_request_id;

  if v_request_id is null then
    select id, request_hash, user_id
    into v_request_id, v_existing_hash, v_existing_user_id
    from public.withdrawal_requests
    where request_key = p_request_key;

    if v_existing_user_id <> v_user_id or v_existing_hash <> v_hash then
      raise exception 'request key conflict';
    end if;

    return v_request_id;
  end if;

  perform private.write_finance_audit(
    v_user_id,
    v_user_id,
    'withdrawal_requested',
    'withdrawal_request',
    v_request_id::text,
    jsonb_build_object(
      'asset_id', p_asset_id,
      'asset_code', v_asset_code,
      'amount', p_amount,
      'destination_type', p_destination_type,
      'request_key', p_request_key
    )
  );

  return v_request_id;
end;
$$;

revoke all on function private.create_withdrawal_request(uuid, numeric, text, text, text, text, text, text)
  from public, anon, authenticated;

create or replace function public.create_withdrawal_request(
  p_asset_id uuid,
  p_amount numeric,
  p_destination_type text,
  p_destination_name text,
  p_destination_value text,
  p_destination_network text,
  p_request_key text,
  p_user_note text default ''
)
returns uuid
language sql
security invoker
set search_path = public, auth, pg_temp
as $$
  select private.create_withdrawal_request(
    p_asset_id,
    p_amount,
    p_destination_type,
    p_destination_name,
    p_destination_value,
    p_destination_network,
    p_request_key,
    p_user_note
  );
$$;

revoke all on function public.create_withdrawal_request(uuid, numeric, text, text, text, text, text, text)
  from public, anon;
grant execute on function public.create_withdrawal_request(uuid, numeric, text, text, text, text, text, text)
  to authenticated;

revoke insert on table public.deposit_requests from public, anon, authenticated;
revoke insert on table public.withdrawal_requests from public, anon, authenticated;
grant select on table public.deposit_requests to authenticated;
grant select on table public.withdrawal_requests to authenticated;

revoke all on function private.write_finance_audit(uuid, uuid, text, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function private.validate_request_asset_amount(uuid, numeric)
  from public, anon, authenticated;