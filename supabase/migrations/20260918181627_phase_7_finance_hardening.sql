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
language plpgsql
security invoker
volatile
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_asset_code text;
  v_asset_type text;
  v_decimals smallint;
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
  where id = p_asset_id
    and is_active;

  if v_asset_code is null then
    raise exception 'asset not found or inactive';
  end if;

  v_decimals := private.validate_request_asset_amount(p_asset_id, p_amount);

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
    v_user_id,
    v_user_id,
    'finance',
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

revoke all on function public.create_withdrawal_request(uuid, numeric, text, text, text, text, text, text) from public, anon;
grant execute on function public.create_withdrawal_request(uuid, numeric, text, text, text, text, text, text) to authenticated;

create or replace function private.admin_approve_deposit(
  p_request_id uuid,
  p_external_reference text
)
returns uuid
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $$
declare
  v_request public.deposit_requests%rowtype;
  v_user_account uuid;
  v_system_account uuid;
  v_system_code text;
  v_tx uuid;
begin
  if (select auth.uid()) is null or not (select private.has_admin_permission('finance.manage')) then
    raise exception 'permission denied';
  end if;

  if p_external_reference is null or btrim(p_external_reference) = '' or char_length(p_external_reference) > 160 then
    raise exception 'external reference is required';
  end if;

  select * into v_request
  from public.deposit_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'deposit request not found';
  end if;

  if v_request.status not in ('pending', 'reviewing') then
    raise exception 'invalid deposit request state';
  end if;

  v_user_account := private.ensure_user_asset_account(v_request.user_id, v_request.asset_id);

  select
    case
      when a.code = 'KRW' then 'SYSTEM_KRW_SETTLEMENT'
      when a.code = 'USDT' then 'SYSTEM_USDT_SETTLEMENT'
      else null
    end
  into v_system_code
  from public.assets a
  where a.id = v_request.asset_id
    and a.is_active;

  if v_system_code is null then
    raise exception 'unsupported deposit asset';
  end if;

  select id into v_system_account
  from public.ledger_accounts
  where account_type = 'system'
    and code = v_system_code
    and is_active
  for share;

  if v_system_account is null then
    raise exception 'settlement account not found';
  end if;

  v_tx := private.post_ledger_transaction(
    v_request.asset_id,
    'deposit',
    'deposit:' || v_request.id::text || ':approve',
    jsonb_build_array(
      jsonb_build_object('account_id', v_system_account, 'direction', 'debit', 'amount', v_request.amount),
      jsonb_build_object('account_id', v_user_account, 'direction', 'credit', 'amount', v_request.amount)
    ),
    '입금 승인',
    'deposit_request',
    v_request.id::text,
    null
  );

  update public.deposit_requests
  set status = 'completed',
      external_reference = btrim(p_external_reference),
      ledger_transaction_id = v_tx,
      completed_at = now(),
      updated_at = now(),
      rejection_reason = null
  where id = v_request.id;

  insert into public.audit_logs (
    actor_user_id, target_user_id, event_type, action, resource_type, resource_id, metadata
  )
  values (
    (select auth.uid()),
    v_request.user_id,
    'finance',
    'deposit_completed',
    'deposit_request',
    v_request.id::text,
    jsonb_build_object(
      'asset_id', v_request.asset_id,
      'amount', v_request.amount,
      'external_reference', btrim(p_external_reference),
      'ledger_transaction_id', v_tx
    )
  );

  return v_tx;
end;
$$;

revoke all on function private.admin_approve_deposit(uuid, text) from public, anon;
grant execute on function private.admin_approve_deposit(uuid, text) to authenticated;