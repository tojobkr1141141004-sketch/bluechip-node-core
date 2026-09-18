create or replace function private.ensure_user_asset_account(
  p_user_id uuid,
  p_asset_id uuid
)
returns uuid
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $$
declare
  v_account_id uuid;
  v_asset_code text;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;

  if p_user_id <> (select auth.uid())
     and not (select private.has_admin_permission('finance.manage')) then
    raise exception 'permission denied';
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
$$;

revoke all on function private.ensure_user_asset_account(uuid, uuid) from public, anon;
grant execute on function private.ensure_user_asset_account(uuid, uuid) to authenticated;

create or replace function public.ensure_user_asset_account(p_asset_id uuid)
returns uuid
language sql
security invoker
set search_path = public, auth, pg_temp
as $$
  select private.ensure_user_asset_account((select auth.uid()), p_asset_id);
$$;

revoke all on function public.ensure_user_asset_account(uuid) from public, anon;
grant execute on function public.ensure_user_asset_account(uuid) to authenticated;

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
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $$
declare
  v_actor uuid := (select auth.uid());
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
  v_balance record;
  v_delta numeric(38,18);
  v_projected_balance numeric(38,18);
begin
  if v_actor is null then
    raise exception 'authentication required';
  end if;

  if not (select private.has_admin_permission('finance.manage')) then
    raise exception 'permission denied';
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
    v_actor
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
    event_type,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    v_actor,
    'finance',
    'ledger_posted',
    'ledger_transaction',
    v_transaction_id::text,
    jsonb_build_object(
      'asset_id', p_asset_id,
      'transaction_type', p_transaction_type,
      'idempotency_key', p_idempotency_key,
      'reference_type', p_reference_type,
      'reference_id', p_reference_id,
      'reversal_of_transaction_id', p_reversal_of_transaction_id
    )
  );

  return v_transaction_id;
end;
$$;

revoke all on function private.post_ledger_transaction(
  uuid, text, text, jsonb, text, text, text, uuid
) from public, anon;
grant execute on function private.post_ledger_transaction(
  uuid, text, text, jsonb, text, text, text, uuid
) to authenticated;

create or replace function public.post_ledger_transaction(
  p_asset_id uuid,
  p_transaction_type text,
  p_idempotency_key text,
  p_entries jsonb,
  p_description text default '',
  p_reference_type text default null,
  p_reference_id text default null
)
returns uuid
language sql
security invoker
set search_path = public, auth, pg_temp
as $$
  select private.post_ledger_transaction(
    p_asset_id,
    p_transaction_type,
    p_idempotency_key,
    p_entries,
    p_description,
    p_reference_type,
    p_reference_id,
    null
  );
$$;

revoke all on function public.post_ledger_transaction(
  uuid, text, text, jsonb, text, text, text
) from public, anon;
grant execute on function public.post_ledger_transaction(
  uuid, text, text, jsonb, text, text, text
) to authenticated;

create or replace function private.reverse_ledger_transaction(
  p_transaction_id uuid,
  p_idempotency_key text,
  p_description text default null
)
returns uuid
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $$
declare
  v_asset_id uuid;
  v_existing_reversal uuid;
  v_original_is_reversal uuid;
  v_entries jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;

  if not (select private.has_admin_permission('finance.manage')) then
    raise exception 'permission denied';
  end if;

  select asset_id, reversal_of_transaction_id
  into v_asset_id, v_original_is_reversal
  from public.ledger_transactions
  where id = p_transaction_id
  for share;

  if v_asset_id is null then
    raise exception 'transaction not found';
  end if;

  if v_original_is_reversal is not null then
    raise exception 'a reversal transaction cannot be reversed';
  end if;

  select id into v_existing_reversal
  from public.ledger_transactions
  where reversal_of_transaction_id = p_transaction_id;

  if v_existing_reversal is not null then
    raise exception 'transaction already reversed';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'account_id', le.account_id,
      'direction', case when le.direction = 'credit' then 'debit' else 'credit' end,
      'amount', le.amount
    )
    order by le.id
  )
  into v_entries
  from public.ledger_entries le
  where le.transaction_id = p_transaction_id;

  if v_entries is null or jsonb_array_length(v_entries) < 2 then
    raise exception 'transaction has no reversible entries';
  end if;

  return private.post_ledger_transaction(
    v_asset_id,
    'reversal',
    p_idempotency_key,
    v_entries,
    coalesce(p_description, '원장 정정: ' || p_transaction_id::text),
    'ledger_reversal',
    p_transaction_id::text,
    p_transaction_id
  );
end;
$$;

revoke all on function private.reverse_ledger_transaction(uuid, text, text) from public, anon;
grant execute on function private.reverse_ledger_transaction(uuid, text, text) to authenticated;

create or replace function public.reverse_ledger_transaction(
  p_transaction_id uuid,
  p_idempotency_key text,
  p_description text default null
)
returns uuid
language sql
security invoker
set search_path = public, auth, pg_temp
as $$
  select private.reverse_ledger_transaction(
    p_transaction_id,
    p_idempotency_key,
    p_description
  );
$$;

revoke all on function public.reverse_ledger_transaction(uuid, text, text) from public, anon;
grant execute on function public.reverse_ledger_transaction(uuid, text, text) to authenticated;
