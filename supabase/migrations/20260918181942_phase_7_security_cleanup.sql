create or replace function private.write_finance_audit(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $$
begin
  if p_actor_user_id is null then
    raise exception 'actor is required';
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
    p_actor_user_id,
    p_target_user_id,
    'finance',
    p_action,
    p_resource_type,
    p_resource_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function private.write_finance_audit(uuid, uuid, text, text, text, jsonb) from public, anon;
grant execute on function private.write_finance_audit(uuid, uuid, text, text, text, jsonb) to authenticated;

alter function public.create_deposit_request(uuid, numeric, text, text)
  security invoker;

create or replace function public.create_deposit_request(
  p_asset_id uuid,
  p_amount numeric,
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

revoke all on function public.create_deposit_request(uuid, numeric, text, text) from public, anon;
grant execute on function public.create_deposit_request(uuid, numeric, text, text) to authenticated;

alter function public.create_withdrawal_request(uuid, numeric, text, text, text, text, text, text)
  security invoker;

alter function public.create_withdrawal_request(uuid, numeric, text, text, text, text, text, text)
  set search_path = public, auth, pg_temp;

alter function public.start_deposit_review(uuid)
  set search_path = public, auth, pg_temp;
alter function public.approve_deposit_request(uuid, text)
  set search_path = public, auth, pg_temp;
alter function public.reject_deposit_request(uuid, text)
  set search_path = public, auth, pg_temp;
alter function public.cancel_deposit_request(uuid)
  set search_path = public, auth, pg_temp;
alter function public.start_withdrawal_review(uuid)
  set search_path = public, auth, pg_temp;
alter function public.approve_withdrawal_request(uuid)
  set search_path = public, auth, pg_temp;
alter function public.reject_withdrawal_request(uuid, text)
  set search_path = public, auth, pg_temp;
alter function public.complete_withdrawal_request(uuid, text)
  set search_path = public, auth, pg_temp;
alter function public.fail_withdrawal_request(uuid, text)
  set search_path = public, auth, pg_temp;
alter function public.cancel_withdrawal_request(uuid)
  set search_path = public, auth, pg_temp;