create table public.deposit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  asset_id uuid not null references public.assets(id) on delete restrict,
  amount numeric(38,18) not null,
  status text not null default 'pending',
  request_key text not null,
  request_hash text not null,
  external_reference text,
  user_note text not null default '',
  rejection_reason text,
  ledger_transaction_id uuid unique references public.ledger_transactions(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint deposit_requests_amount_chk check (amount > 0 and amount = round(amount, 18)),
  constraint deposit_requests_status_chk check (
    status in ('pending', 'reviewing', 'completed', 'rejected', 'cancelled')
  ),
  constraint deposit_requests_request_key_chk check (
    btrim(request_key) <> '' and char_length(request_key) <= 128
  ),
  constraint deposit_requests_request_hash_chk check (request_hash ~ '^[0-9a-f]{32}$'),
  constraint deposit_requests_note_chk check (char_length(user_note) <= 500),
  constraint deposit_requests_rejection_reason_chk check (
    rejection_reason is null or char_length(rejection_reason) <= 500
  ),
  constraint deposit_requests_completed_shape_chk check (
    (status = 'completed' and completed_at is not null and ledger_transaction_id is not null)
    or
    (status <> 'completed')
  ),
  constraint deposit_requests_request_key_key unique (request_key)
);

create unique index deposit_requests_external_reference_uidx
  on public.deposit_requests (asset_id, external_reference)
  where external_reference is not null;

create index deposit_requests_user_created_idx
  on public.deposit_requests (user_id, created_at desc, id desc);

create index deposit_requests_status_created_idx
  on public.deposit_requests (status, created_at asc, id);

create index deposit_requests_asset_status_idx
  on public.deposit_requests (asset_id, status, created_at asc);

create trigger deposit_requests_touch_updated_at
before update on public.deposit_requests
for each row
execute function private.touch_updated_at();

create table public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  asset_id uuid not null references public.assets(id) on delete restrict,
  amount numeric(38,18) not null,
  destination_type text not null,
  destination_name text,
  destination_value text not null,
  destination_network text,
  status text not null default 'pending',
  request_key text not null,
  request_hash text not null,
  external_reference text,
  user_note text not null default '',
  rejection_reason text,
  failure_reason text,
  reserve_transaction_id uuid unique references public.ledger_transactions(id) on delete restrict,
  completion_transaction_id uuid unique references public.ledger_transactions(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  constraint withdrawal_requests_amount_chk check (amount > 0 and amount = round(amount, 18)),
  constraint withdrawal_requests_destination_type_chk check (
    destination_type in ('bank', 'wallet')
  ),
  constraint withdrawal_requests_destination_name_chk check (
    destination_name is null or char_length(destination_name) <= 120
  ),
  constraint withdrawal_requests_destination_value_chk check (
    btrim(destination_value) <> '' and char_length(destination_value) <= 320
  ),
  constraint withdrawal_requests_destination_network_chk check (
    destination_network is null or char_length(destination_network) <= 64
  ),
  constraint withdrawal_requests_status_chk check (
    status in (
      'pending',
      'reviewing',
      'processing',
      'completed',
      'rejected',
      'cancelled',
      'failed'
    )
  ),
  constraint withdrawal_requests_request_key_chk check (
    btrim(request_key) <> '' and char_length(request_key) <= 128
  ),
  constraint withdrawal_requests_request_hash_chk check (request_hash ~ '^[0-9a-f]{32}$'),
  constraint withdrawal_requests_note_chk check (char_length(user_note) <= 500),
  constraint withdrawal_requests_rejection_reason_chk check (
    rejection_reason is null or char_length(rejection_reason) <= 500
  ),
  constraint withdrawal_requests_failure_reason_chk check (
    failure_reason is null or char_length(failure_reason) <= 500
  ),
  constraint withdrawal_requests_completed_shape_chk check (
    (status = 'completed' and completed_at is not null and reserve_transaction_id is not null and completion_transaction_id is not null)
    or status <> 'completed'
  ),
  constraint withdrawal_requests_failed_shape_chk check (
    (status = 'failed' and failed_at is not null and reserve_transaction_id is not null)
    or status <> 'failed'
  ),
  constraint withdrawal_requests_request_key_key unique (request_key)
);

create unique index withdrawal_requests_external_reference_uidx
  on public.withdrawal_requests (asset_id, external_reference)
  where external_reference is not null;

create index withdrawal_requests_user_created_idx
  on public.withdrawal_requests (user_id, created_at desc, id desc);

create index withdrawal_requests_status_created_idx
  on public.withdrawal_requests (status, created_at asc, id);

create index withdrawal_requests_asset_status_idx
  on public.withdrawal_requests (asset_id, status, created_at asc);

create trigger withdrawal_requests_touch_updated_at
before update on public.withdrawal_requests
for each row
execute function private.touch_updated_at();

insert into public.ledger_accounts (asset_id, account_type, code, name, allow_negative)
select a.id, 'system', 'SYSTEM_KRW_WITHDRAWAL_CLEARING', 'KRW 출금 처리 대기 계정', false
from public.assets a
where a.code = 'KRW'
on conflict (code) where account_type = 'system' do nothing;

insert into public.ledger_accounts (asset_id, account_type, code, name, allow_negative)
select a.id, 'system', 'SYSTEM_USDT_WITHDRAWAL_CLEARING', 'USDT 출금 처리 대기 계정', false
from public.assets a
where a.code = 'USDT'
on conflict (code) where account_type = 'system' do nothing;

insert into public.ledger_accounts (asset_id, account_type, code, name, allow_negative)
select a.id, 'system', 'SYSTEM_KRW_WITHDRAWN', 'KRW 외부 출금 완료 계정', false
from public.assets a
where a.code = 'KRW'
on conflict (code) where account_type = 'system' do nothing;

insert into public.ledger_accounts (asset_id, account_type, code, name, allow_negative)
select a.id, 'system', 'SYSTEM_USDT_WITHDRAWN', 'USDT 외부 출금 완료 계정', false
from public.assets a
where a.code = 'USDT'
on conflict (code) where account_type = 'system' do nothing;

insert into public.ledger_account_balances (account_id, balance)
select id, 0
from public.ledger_accounts
where account_type = 'system'
on conflict (account_id) do nothing;

alter table public.deposit_requests enable row level security;
alter table public.withdrawal_requests enable row level security;

revoke all on table public.deposit_requests from public, anon, authenticated, service_role;
grant select, insert on table public.deposit_requests to authenticated, service_role;

revoke all on table public.withdrawal_requests from public, anon, authenticated, service_role;
grant select, insert on table public.withdrawal_requests to authenticated, service_role;

create policy deposit_requests_select_self_or_finance_admin
  on public.deposit_requests
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.has_admin_permission('finance.read'))
  );

create policy deposit_requests_insert_self
  on public.deposit_requests
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy withdrawal_requests_select_self_or_finance_admin
  on public.withdrawal_requests
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.has_admin_permission('finance.read'))
  );

create policy withdrawal_requests_insert_self
  on public.withdrawal_requests
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create or replace view public.user_deposit_requests
with (security_invoker = true)
as
select
  dr.id,
  dr.user_id,
  dr.asset_id,
  a.code as asset_code,
  a.name as asset_name,
  a.decimals,
  dr.amount,
  dr.status,
  dr.request_key,
  dr.external_reference,
  dr.user_note,
  dr.rejection_reason,
  dr.ledger_transaction_id,
  dr.created_at,
  dr.updated_at,
  dr.completed_at
from public.deposit_requests dr
join public.assets a on a.id = dr.asset_id;

grant select on public.user_deposit_requests to authenticated, service_role;
revoke all on public.user_deposit_requests from anon;

create or replace view public.user_withdrawal_requests
with (security_invoker = true)
as
select
  wr.id,
  wr.user_id,
  wr.asset_id,
  a.code as asset_code,
  a.name as asset_name,
  a.decimals,
  wr.amount,
  wr.destination_type,
  wr.destination_name,
  wr.destination_value,
  wr.destination_network,
  wr.status,
  wr.request_key,
  wr.external_reference,
  wr.user_note,
  wr.rejection_reason,
  wr.failure_reason,
  wr.reserve_transaction_id,
  wr.completion_transaction_id,
  wr.created_at,
  wr.updated_at,
  wr.completed_at,
  wr.failed_at
from public.withdrawal_requests wr
join public.assets a on a.id = wr.asset_id;

grant select on public.user_withdrawal_requests to authenticated, service_role;
revoke all on public.user_withdrawal_requests from anon;

create or replace view public.admin_deposit_requests
with (security_invoker = true)
as
select
  dr.id,
  dr.user_id,
  dr.asset_id,
  a.code as asset_code,
  a.name as asset_name,
  a.decimals,
  dr.amount,
  dr.status,
  dr.request_key,
  dr.external_reference,
  dr.user_note,
  dr.rejection_reason,
  dr.ledger_transaction_id,
  dr.created_at,
  dr.updated_at,
  dr.completed_at
from public.deposit_requests dr
join public.assets a on a.id = dr.asset_id;

grant select on public.admin_deposit_requests to authenticated, service_role;
revoke all on public.admin_deposit_requests from anon;

create or replace view public.admin_withdrawal_requests
with (security_invoker = true)
as
select
  wr.id,
  wr.user_id,
  wr.asset_id,
  a.code as asset_code,
  a.name as asset_name,
  a.decimals,
  wr.amount,
  wr.destination_type,
  wr.destination_name,
  wr.destination_value,
  wr.destination_network,
  wr.status,
  wr.request_key,
  wr.external_reference,
  wr.user_note,
  wr.rejection_reason,
  wr.failure_reason,
  wr.reserve_transaction_id,
  wr.completion_transaction_id,
  wr.created_at,
  wr.updated_at,
  wr.completed_at,
  wr.failed_at
from public.withdrawal_requests wr
join public.assets a on a.id = wr.asset_id;

grant select on public.admin_withdrawal_requests to authenticated, service_role;
revoke all on public.admin_withdrawal_requests from anon;

create or replace function private.validate_request_asset_amount(
  p_asset_id uuid,
  p_amount numeric
)
returns smallint
language plpgsql
security definer
stable
set search_path = public, auth, pg_temp
as $$
declare
  v_decimals smallint;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid amount';
  end if;

  select decimals into v_decimals
  from public.assets
  where id = p_asset_id and is_active;

  if v_decimals is null then
    raise exception 'asset not found or inactive';
  end if;

  if p_amount <> round(p_amount, v_decimals) then
    raise exception 'amount exceeds asset precision';
  end if;

  return v_decimals;
end;
$$;

revoke all on function private.validate_request_asset_amount(uuid, numeric) from public, anon, authenticated;
grant execute on function private.validate_request_asset_amount(uuid, numeric) to authenticated;

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

  perform private.validate_request_asset_amount(p_asset_id, p_amount);

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

    if v_existing_user_id <> v_user_id then
      raise exception 'request key conflict';
    end if;

    if v_existing_hash <> v_hash then
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

create or replace function private.admin_set_deposit_reviewing(
  p_request_id uuid
)
returns void
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $$
declare
  v_status text;
  v_user_id uuid;
begin
  if (select auth.uid()) is null or not (select private.has_admin_permission('finance.manage')) then
    raise exception 'permission denied';
  end if;

  select status, user_id
  into v_status, v_user_id
  from public.deposit_requests
  where id = p_request_id
  for update;

  if v_status is null then
    raise exception 'deposit request not found';
  end if;

  if v_status <> 'pending' then
    raise exception 'invalid deposit request state';
  end if;

  update public.deposit_requests
  set status = 'reviewing', updated_at = now()
  where id = p_request_id;

  insert into public.audit_logs (
    actor_user_id, target_user_id, event_type, action, resource_type, resource_id
  )
  values (
    (select auth.uid()), v_user_id, 'finance', 'deposit_review_started', 'deposit_request', p_request_id::text
  );
end;
$$;

revoke all on function private.admin_set_deposit_reviewing(uuid) from public, anon;
grant execute on function private.admin_set_deposit_reviewing(uuid) to authenticated;

create or replace function public.start_deposit_review(p_request_id uuid)
returns void
language sql
security invoker
as $$
  select private.admin_set_deposit_reviewing(p_request_id);
$$;

revoke all on function public.start_deposit_review(uuid) from public, anon;
grant execute on function public.start_deposit_review(uuid) to authenticated;

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

  select id into v_system_account
  from public.ledger_accounts
  where account_type = 'system'
    and code = case
      when exists (select 1 from public.assets where id = v_request.asset_id and code = 'KRW')
        then 'SYSTEM_KRW_SETTLEMENT'
      else 'SYSTEM_USDT_SETTLEMENT'
    end
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

create or replace function public.approve_deposit_request(
  p_request_id uuid,
  p_external_reference text
)
returns uuid
language sql
security invoker
as $$
  select private.admin_approve_deposit(p_request_id, p_external_reference);
$$;

revoke all on function public.approve_deposit_request(uuid, text) from public, anon;
grant execute on function public.approve_deposit_request(uuid, text) to authenticated;

create or replace function private.admin_reject_deposit(
  p_request_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $$
declare
  v_status text;
  v_user_id uuid;
begin
  if (select auth.uid()) is null or not (select private.has_admin_permission('finance.manage')) then
    raise exception 'permission denied';
  end if;

  if p_reason is null or btrim(p_reason) = '' or char_length(p_reason) > 500 then
    raise exception 'rejection reason is required';
  end if;

  select status, user_id into v_status, v_user_id
  from public.deposit_requests
  where id = p_request_id
  for update;

  if v_status is null then
    raise exception 'deposit request not found';
  end if;

  if v_status not in ('pending', 'reviewing') then
    raise exception 'invalid deposit request state';
  end if;

  update public.deposit_requests
  set status = 'rejected',
      rejection_reason = btrim(p_reason),
      updated_at = now()
  where id = p_request_id;

  insert into public.audit_logs (
    actor_user_id, target_user_id, event_type, action, resource_type, resource_id, metadata
  )
  values (
    (select auth.uid()), v_user_id, 'finance', 'deposit_rejected', 'deposit_request', p_request_id::text,
    jsonb_build_object('reason', btrim(p_reason))
  );
end;
$$;

revoke all on function private.admin_reject_deposit(uuid, text) from public, anon;
grant execute on function private.admin_reject_deposit(uuid, text) to authenticated;

create or replace function public.reject_deposit_request(
  p_request_id uuid,
  p_reason text
)
returns void
language sql
security invoker
as $$
  select private.admin_reject_deposit(p_request_id, p_reason);
$$;

revoke all on function public.reject_deposit_request(uuid, text) from public, anon;
grant execute on function public.reject_deposit_request(uuid, text) to authenticated;

create or replace function private.user_cancel_deposit(
  p_request_id uuid
)
returns void
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $$
declare
  v_status text;
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select status into v_status
  from public.deposit_requests
  where id = p_request_id and user_id = v_user_id
  for update;

  if v_status is null then
    raise exception 'deposit request not found';
  end if;

  if v_status <> 'pending' then
    raise exception 'only pending deposit requests can be cancelled';
  end if;

  update public.deposit_requests
  set status = 'cancelled', updated_at = now()
  where id = p_request_id;

  insert into public.audit_logs (
    actor_user_id, target_user_id, event_type, action, resource_type, resource_id
  )
  values (
    v_user_id, v_user_id, 'finance', 'deposit_cancelled', 'deposit_request', p_request_id::text
  );
end;
$$;

revoke all on function private.user_cancel_deposit(uuid) from public, anon;
grant execute on function private.user_cancel_deposit(uuid) to authenticated;

create or replace function public.cancel_deposit_request(p_request_id uuid)
returns void
language sql
security invoker
as $$
  select private.user_cancel_deposit(p_request_id);
$$;

revoke all on function public.cancel_deposit_request(uuid) from public, anon;
grant execute on function public.cancel_deposit_request(uuid) to authenticated;

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

  v_decimals := private.validate_request_asset_amount(p_asset_id, p_amount);

  select code, asset_type into v_asset_code, v_asset_type
  from public.assets where id = p_asset_id and is_active;

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

  if p_request_key is null or btrim(p_request_key) = '' or char_length(p_request_key) > 128 then
    raise exception 'invalid request key';
  end if;

  if char_length(coalesce(p_user_note, '')) > 500 then
    raise exception 'note too long';
  end if;

  v_account_id := private.ensure_user_asset_account(v_user_id, p_asset_id);

  select balance into v_balance
  from public.ledger_account_balances
  where account_id = v_account_id
  for update;

  if v_balance < p_amount then
    raise exception 'insufficient balance';
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

create or replace function private.admin_set_withdrawal_reviewing(
  p_request_id uuid
)
returns void
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $$
declare
  v_status text;
  v_user_id uuid;
begin
  if (select auth.uid()) is null or not (select private.has_admin_permission('finance.manage')) then
    raise exception 'permission denied';
  end if;

  select status, user_id
  into v_status, v_user_id
  from public.withdrawal_requests
  where id = p_request_id
  for update;

  if v_status is null then
    raise exception 'withdrawal request not found';
  end if;

  if v_status <> 'pending' then
    raise exception 'invalid withdrawal request state';
  end if;

  update public.withdrawal_requests
  set status = 'reviewing', updated_at = now()
  where id = p_request_id;

  insert into public.audit_logs (
    actor_user_id, target_user_id, event_type, action, resource_type, resource_id
  )
  values (
    (select auth.uid()), v_user_id, 'finance', 'withdrawal_review_started', 'withdrawal_request', p_request_id::text
  );
end;
$$;

revoke all on function private.admin_set_withdrawal_reviewing(uuid) from public, anon;
grant execute on function private.admin_set_withdrawal_reviewing(uuid) to authenticated;

create or replace function public.start_withdrawal_review(p_request_id uuid)
returns void
language sql
security invoker
as $$
  select private.admin_set_withdrawal_reviewing(p_request_id);
$$;

revoke all on function public.start_withdrawal_review(uuid) from public, anon;
grant execute on function public.start_withdrawal_review(uuid) to authenticated;

create or replace function private.admin_approve_withdrawal(
  p_request_id uuid
)
returns uuid
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $$
declare
  v_request public.withdrawal_requests%rowtype;
  v_user_account uuid;
  v_clearing_account uuid;
  v_tx uuid;
  v_system_code text;
begin
  if (select auth.uid()) is null or not (select private.has_admin_permission('finance.manage')) then
    raise exception 'permission denied';
  end if;

  select * into v_request
  from public.withdrawal_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'withdrawal request not found';
  end if;

  if v_request.status not in ('pending', 'reviewing') then
    raise exception 'invalid withdrawal request state';
  end if;

  v_user_account := private.ensure_user_asset_account(v_request.user_id, v_request.asset_id);

  select
    case
      when a.code = 'KRW' then 'SYSTEM_KRW_WITHDRAWAL_CLEARING'
      when a.code = 'USDT' then 'SYSTEM_USDT_WITHDRAWAL_CLEARING'
      else null
    end
  into v_system_code
  from public.assets a
  where a.id = v_request.asset_id
    and a.is_active;

  if v_system_code is null then
    raise exception 'unsupported withdrawal asset';
  end if;

  select id into v_clearing_account
  from public.ledger_accounts
  where account_type = 'system' and code = v_system_code
  for share;

  if v_clearing_account is null then
    raise exception 'withdrawal clearing account not found';
  end if;

  v_tx := private.post_ledger_transaction(
    v_request.asset_id,
    'withdrawal_reserve',
    'withdrawal:' || v_request.id::text || ':reserve',
    jsonb_build_array(
      jsonb_build_object('account_id', v_user_account, 'direction', 'debit', 'amount', v_request.amount),
      jsonb_build_object('account_id', v_clearing_account, 'direction', 'credit', 'amount', v_request.amount)
    ),
    '출금 승인 및 자금 예약',
    'withdrawal_request',
    v_request.id::text,
    null
  );

  update public.withdrawal_requests
  set status = 'processing',
      reserve_transaction_id = v_tx,
      rejection_reason = null,
      failure_reason = null,
      updated_at = now()
  where id = v_request.id;

  insert into public.audit_logs (
    actor_user_id, target_user_id, event_type, action, resource_type, resource_id, metadata
  )
  values (
    (select auth.uid()),
    v_request.user_id,
    'finance',
    'withdrawal_processing_started',
    'withdrawal_request',
    v_request.id::text,
    jsonb_build_object(
      'asset_id', v_request.asset_id,
      'amount', v_request.amount,
      'reserve_transaction_id', v_tx
    )
  );

  return v_tx;
end;
$$;

revoke all on function private.admin_approve_withdrawal(uuid) from public, anon;
grant execute on function private.admin_approve_withdrawal(uuid) to authenticated;

create or replace function public.approve_withdrawal_request(p_request_id uuid)
returns uuid
language sql
security invoker
as $$
  select private.admin_approve_withdrawal(p_request_id);
$$;

revoke all on function public.approve_withdrawal_request(uuid) from public, anon;
grant execute on function public.approve_withdrawal_request(uuid) to authenticated;

create or replace function private.admin_reject_withdrawal(
  p_request_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $$
declare
  v_status text;
  v_user_id uuid;
begin
  if (select auth.uid()) is null or not (select private.has_admin_permission('finance.manage')) then
    raise exception 'permission denied';
  end if;

  if p_reason is null or btrim(p_reason) = '' or char_length(p_reason) > 500 then
    raise exception 'rejection reason is required';
  end if;

  select status, user_id into v_status, v_user_id
  from public.withdrawal_requests
  where id = p_request_id
  for update;

  if v_status is null then
    raise exception 'withdrawal request not found';
  end if;

  if v_status not in ('pending', 'reviewing') then
    raise exception 'invalid withdrawal request state';
  end if;

  update public.withdrawal_requests
  set status = 'rejected',
      rejection_reason = btrim(p_reason),
      updated_at = now()
  where id = p_request_id;

  insert into public.audit_logs (
    actor_user_id, target_user_id, event_type, action, resource_type, resource_id, metadata
  )
  values (
    (select auth.uid()),
    v_user_id,
    'finance',
    'withdrawal_rejected',
    'withdrawal_request',
    p_request_id::text,
    jsonb_build_object('reason', btrim(p_reason))
  );
end;
$$;

revoke all on function private.admin_reject_withdrawal(uuid, text) from public, anon;
grant execute on function private.admin_reject_withdrawal(uuid, text) to authenticated;

create or replace function public.reject_withdrawal_request(
  p_request_id uuid,
  p_reason text
)
returns void
language sql
security invoker
as $$
  select private.admin_reject_withdrawal(p_request_id, p_reason);
$$;

revoke all on function public.reject_withdrawal_request(uuid, text) from public, anon;
grant execute on function public.reject_withdrawal_request(uuid, text) to authenticated;

create or replace function private.admin_complete_withdrawal(
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
  v_request public.withdrawal_requests%rowtype;
  v_clearing_account uuid;
  v_withdrawn_account uuid;
  v_asset_code text;
  v_tx uuid;
begin
  if (select auth.uid()) is null or not (select private.has_admin_permission('finance.manage')) then
    raise exception 'permission denied';
  end if;

  if p_external_reference is null or btrim(p_external_reference) = '' or char_length(p_external_reference) > 160 then
    raise exception 'external reference is required';
  end if;

  select * into v_request
  from public.withdrawal_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'withdrawal request not found';
  end if;

  if v_request.status <> 'processing' or v_request.reserve_transaction_id is null then
    raise exception 'withdrawal is not processing';
  end if;

  select code into v_asset_code from public.assets where id = v_request.asset_id;

  v_clearing_account := (
    select id from public.ledger_accounts
    where account_type='system'
      and code = case when v_asset_code='KRW' then 'SYSTEM_KRW_WITHDRAWAL_CLEARING'
                     when v_asset_code='USDT' then 'SYSTEM_USDT_WITHDRAWAL_CLEARING'
                end
    for share
  );

  v_withdrawn_account := (
    select id from public.ledger_accounts
    where account_type='system'
      and code = case when v_asset_code='KRW' then 'SYSTEM_KRW_WITHDRAWN'
                     when v_asset_code='USDT' then 'SYSTEM_USDT_WITHDRAWN'
                end
    for share
  );

  if v_clearing_account is null or v_withdrawn_account is null then
    raise exception 'withdrawal settlement accounts not found';
  end if;

  v_tx := private.post_ledger_transaction(
    v_request.asset_id,
    'withdrawal_complete',
    'withdrawal:' || v_request.id::text || ':complete',
    jsonb_build_array(
      jsonb_build_object('account_id', v_clearing_account, 'direction', 'debit', 'amount', v_request.amount),
      jsonb_build_object('account_id', v_withdrawn_account, 'direction', 'credit', 'amount', v_request.amount)
    ),
    '출금 송금 완료 기록',
    'withdrawal_request',
    v_request.id::text,
    null
  );

  update public.withdrawal_requests
  set status = 'completed',
      external_reference = btrim(p_external_reference),
      completion_transaction_id = v_tx,
      completed_at = now(),
      updated_at = now()
  where id = v_request.id;

  insert into public.audit_logs (
    actor_user_id, target_user_id, event_type, action, resource_type, resource_id, metadata
  )
  values (
    (select auth.uid()),
    v_request.user_id,
    'finance',
    'withdrawal_completed',
    'withdrawal_request',
    v_request.id::text,
    jsonb_build_object(
      'asset_id', v_request.asset_id,
      'amount', v_request.amount,
      'external_reference', btrim(p_external_reference),
      'reserve_transaction_id', v_request.reserve_transaction_id,
      'completion_transaction_id', v_tx
    )
  );

  return v_tx;
end;
$$;

revoke all on function private.admin_complete_withdrawal(uuid, text) from public, anon;
grant execute on function private.admin_complete_withdrawal(uuid, text) to authenticated;

create or replace function public.complete_withdrawal_request(
  p_request_id uuid,
  p_external_reference text
)
returns uuid
language sql
security invoker
as $$
  select private.admin_complete_withdrawal(p_request_id, p_external_reference);
$$;

revoke all on function public.complete_withdrawal_request(uuid, text) from public, anon;
grant execute on function public.complete_withdrawal_request(uuid, text) to authenticated;

create or replace function private.admin_fail_withdrawal(
  p_request_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $$
declare
  v_request public.withdrawal_requests%rowtype;
  v_reversal_tx uuid;
begin
  if (select auth.uid()) is null or not (select private.has_admin_permission('finance.manage')) then
    raise exception 'permission denied';
  end if;

  if p_reason is null or btrim(p_reason) = '' or char_length(p_reason) > 500 then
    raise exception 'failure reason is required';
  end if;

  select * into v_request
  from public.withdrawal_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'withdrawal request not found';
  end if;

  if v_request.status <> 'processing' or v_request.reserve_transaction_id is null then
    raise exception 'withdrawal is not processing';
  end if;

  v_reversal_tx := private.reverse_ledger_transaction(
    v_request.reserve_transaction_id,
    'withdrawal:' || v_request.id::text || ':fail',
    '출금 실패 자금 반환'
  );

  update public.withdrawal_requests
  set status = 'failed',
      failure_reason = btrim(p_reason),
      failed_at = now(),
      updated_at = now()
  where id = v_request.id;

  insert into public.audit_logs (
    actor_user_id, target_user_id, event_type, action, resource_type, resource_id, metadata
  )
  values (
    (select auth.uid()),
    v_request.user_id,
    'finance',
    'withdrawal_failed',
    'withdrawal_request',
    v_request.id::text,
    jsonb_build_object(
      'reason', btrim(p_reason),
      'reserve_transaction_id', v_request.reserve_transaction_id,
      'reversal_transaction_id', v_reversal_tx
    )
  );

  return v_reversal_tx;
end;
$$;

revoke all on function private.admin_fail_withdrawal(uuid, text) from public, anon;
grant execute on function private.admin_fail_withdrawal(uuid, text) to authenticated;

create or replace function public.fail_withdrawal_request(
  p_request_id uuid,
  p_reason text
)
returns uuid
language sql
security invoker
as $$
  select private.admin_fail_withdrawal(p_request_id, p_reason);
$$;

revoke all on function public.fail_withdrawal_request(uuid, text) from public, anon;
grant execute on function public.fail_withdrawal_request(uuid, text) to authenticated;

create or replace function private.user_cancel_withdrawal(
  p_request_id uuid
)
returns void
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $$
declare
  v_status text;
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select status into v_status
  from public.withdrawal_requests
  where id = p_request_id and user_id = v_user_id
  for update;

  if v_status is null then
    raise exception 'withdrawal request not found';
  end if;

  if v_status <> 'pending' then
    raise exception 'only pending withdrawal requests can be cancelled';
  end if;

  update public.withdrawal_requests
  set status = 'cancelled', updated_at = now()
  where id = p_request_id;

  insert into public.audit_logs (
    actor_user_id, target_user_id, event_type, action, resource_type, resource_id
  )
  values (
    v_user_id, v_user_id, 'finance', 'withdrawal_cancelled', 'withdrawal_request', p_request_id::text
  );
end;
$$;

revoke all on function private.user_cancel_withdrawal(uuid) from public, anon;
grant execute on function private.user_cancel_withdrawal(uuid) to authenticated;

create or replace function public.cancel_withdrawal_request(p_request_id uuid)
returns void
language sql
security invoker
as $$
  select private.user_cancel_withdrawal(p_request_id);
$$;

revoke all on function public.cancel_withdrawal_request(uuid) from public, anon;
grant execute on function public.cancel_withdrawal_request(uuid) to authenticated;