-- PHASE 13: mining reward issuance, budget, reserve and source-account safety controls.
-- Generated from the production schema after the Phase 13 migration was applied.
-- Do not re-run against the Phase 13 production database; migration history already contains this version.

create table public.mining_issuance_policies (
  asset_id uuid primary key references public.assets(id) on delete restrict,
  issuance_enabled boolean not null default false,
  daily_limit numeric(38,18),
  total_limit numeric(38,18),
  max_source_negative_balance numeric(38,18),
  minimum_reserve_balance numeric(38,18),
  reserve_account_id uuid references public.ledger_accounts(id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete restrict,
  constraint mining_issuance_policies_daily_chk check (daily_limit is null or daily_limit > 0),
  constraint mining_issuance_policies_total_chk check (total_limit is null or total_limit > 0),
  constraint mining_issuance_policies_source_chk check (max_source_negative_balance is null or max_source_negative_balance >= 0),
  constraint mining_issuance_policies_reserve_chk check (minimum_reserve_balance is null or minimum_reserve_balance >= 0),
  constraint mining_issuance_policies_guard_chk check (
    not issuance_enabled or daily_limit is not null or total_limit is not null
    or max_source_negative_balance is not null or minimum_reserve_balance is not null
  ),
  constraint mining_issuance_policies_reserve_pair_chk check (
    minimum_reserve_balance is null or reserve_account_id is not null
  )
);
create index mining_issuance_policies_reserve_idx on public.mining_issuance_policies(reserve_account_id) where reserve_account_id is not null;

create table public.mining_issuance_policy_updates (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  issuance_enabled boolean not null,
  daily_limit numeric(38,18),
  total_limit numeric(38,18),
  max_source_negative_balance numeric(38,18),
  minimum_reserve_balance numeric(38,18),
  reserve_account_id uuid references public.ledger_accounts(id) on delete restrict,
  idempotency_key text not null,
  request_hash text not null,
  created_at timestamptz not null default now(),
  constraint mining_issuance_policy_updates_key_chk check (btrim(idempotency_key) <> '' and char_length(idempotency_key) <= 128),
  constraint mining_issuance_policy_updates_hash_chk check (request_hash ~ '^[0-9a-f]{32}$')
);
create unique index mining_issuance_policy_updates_idempotency_key on public.mining_issuance_policy_updates(idempotency_key);
create index mining_issuance_policy_updates_asset_created_idx on public.mining_issuance_policy_updates(asset_id,created_at desc,id desc);

create table public.mining_reward_issuance_blocks (
  id uuid primary key default gen_random_uuid(),
  calculation_run_id uuid not null references public.mining_calculation_runs(id) on delete restrict,
  contract_id uuid not null references public.mining_contracts(id) on delete restrict,
  accrual_id uuid not null references public.mining_reward_accruals(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  asset_id uuid not null references public.assets(id) on delete restrict,
  amount numeric(38,18) not null,
  reason_code text not null,
  created_at timestamptz not null default now(),
  constraint mining_reward_issuance_blocks_amount_chk check (amount > 0 and amount = round(amount,18)),
  constraint mining_reward_issuance_blocks_reason_chk check (reason_code ~ '^[a-z0-9_]{3,64}$')
);
create unique index mining_reward_issuance_blocks_accrual_uidx on public.mining_reward_issuance_blocks(accrual_id);
create index mining_reward_issuance_blocks_asset_created_idx on public.mining_reward_issuance_blocks(asset_id,created_at desc,id desc);
create index mining_reward_issuance_blocks_contract_created_idx on public.mining_reward_issuance_blocks(contract_id,created_at desc,id desc);

insert into public.mining_issuance_policies(asset_id) select id from public.assets on conflict(asset_id) do nothing;
insert into public.admin_permissions(code,name,description)
values('mining.issuance.manage','채굴 보상 발행 안전설정','채굴 보상 발행 한도·중지 조건·준비금 안전 설정을 변경할 수 있습니다.')
on conflict(code) do update set name=excluded.name,description=excluded.description;
insert into public.admin_role_permissions(role_id,permission_id)
select r.id,p.id from public.admin_roles r join public.admin_permissions p on p.code='mining.issuance.manage'
where r.code in ('super_admin','settlement_admin') on conflict do nothing;

alter table public.mining_issuance_policies enable row level security;
alter table public.mining_issuance_policy_updates enable row level security;
alter table public.mining_reward_issuance_blocks enable row level security;
create policy mining_issuance_policies_select_policy on public.mining_issuance_policies
for select to authenticated using((select private.has_admin_permission('mining.read')));
revoke all on public.mining_issuance_policies from public,anon;
revoke all on public.mining_issuance_policy_updates from public,anon,authenticated;
revoke all on public.mining_reward_issuance_blocks from public,anon,authenticated;
grant select on public.mining_issuance_policies to authenticated;

CREATE OR REPLACE FUNCTION private.ensure_mining_reserve_account(p_asset_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_asset_code text; v_account_id uuid;
begin
  select code into v_asset_code from public.assets where id=p_asset_id and is_active;
  if v_asset_code is null then raise exception 'asset not found or inactive'; end if;
  insert into public.ledger_accounts(asset_id,account_type,owner_user_id,code,name,allow_negative)
  values(p_asset_id,'system',null,'SYSTEM_'||v_asset_code||'_MINING_RESERVE',v_asset_code||' 채굴 준비금 계정',false)
  on conflict do nothing;
  select id,asset_id into v_account_id,p_asset_id from public.ledger_accounts where code='SYSTEM_'||v_asset_code||'_MINING_RESERVE';
  if v_account_id is null then raise exception 'mining reserve account provisioning failed'; end if;
  if not exists(select 1 from public.ledger_accounts where id=v_account_id and asset_id=(select id from public.assets where code=v_asset_code) and account_type='system' and allow_negative=false)
  then raise exception 'mining reserve account asset mismatch'; end if;
  insert into public.ledger_account_balances(account_id,balance) values(v_account_id,0) on conflict(account_id) do nothing;
  return v_account_id;
end;
$function$
;

revoke all on function private.ensure_mining_reserve_account(uuid) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION private.check_mining_reward_issuance(p_asset_id uuid, p_amount numeric)
 RETURNS TABLE(allowed boolean, reason_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_policy public.mining_issuance_policies%rowtype;
  v_now timestamptz:=clock_timestamp();
  v_timezone text;
  v_day_start timestamptz;
  v_daily_issued numeric(38,18);
  v_total_issued numeric(38,18);
  v_source_balance numeric(38,18);
  v_reserve_balance numeric(38,18);
begin
  if p_asset_id is null or p_amount is null or p_amount<=0 then return query select false,'invalid_amount'::text; return; end if;
  select * into v_policy from public.mining_issuance_policies where asset_id=p_asset_id for update;
  if not found then return query select false,'policy_not_found'::text; return; end if;
  if not v_policy.issuance_enabled then return query select false,'issuance_disabled'::text; return; end if;
  if v_policy.daily_limit is null and v_policy.total_limit is null and v_policy.max_source_negative_balance is null and v_policy.minimum_reserve_balance is null
  then return query select false,'guard_not_configured'::text; return; end if;
  v_timezone:=coalesce((select calculation_timezone from public.mining_settings where id=1),'Asia/Seoul');
  v_day_start:=date_trunc('day',v_now at time zone v_timezone) at time zone v_timezone;

  select coalesce(sum(amount),0)::numeric(38,18) into v_daily_issued
  from (
    select amount,created_at from public.mining_reward_payments where asset_id=p_asset_id
    union all
    select amount,created_at from public.mining_reward_corrections where asset_id=p_asset_id and correction_type='additional_paid'
  ) issued
  where issued.created_at>=v_day_start and issued.created_at<v_now;

  select coalesce(sum(amount),0)::numeric(38,18) into v_total_issued
  from (
    select amount from public.mining_reward_payments where asset_id=p_asset_id
    union all
    select amount from public.mining_reward_corrections where asset_id=p_asset_id and correction_type='additional_paid'
  ) issued;

  if v_policy.daily_limit is not null and v_daily_issued+p_amount>v_policy.daily_limit then return query select false,'daily_limit_reached'::text; return; end if;
  if v_policy.total_limit is not null and v_total_issued+p_amount>v_policy.total_limit then return query select false,'total_limit_reached'::text; return; end if;

  select b.balance into v_source_balance
  from public.ledger_accounts la join public.ledger_account_balances b on b.account_id=la.id
  where la.asset_id=p_asset_id and la.account_type='system'
    and la.code='SYSTEM_'||(select code from public.assets where id=p_asset_id)||'_MINING_REWARDS'
    and la.is_active;
  if v_source_balance is null then return query select false,'source_account_not_found'::text; return; end if;

  if v_policy.max_source_negative_balance is not null and v_source_balance-p_amount < -v_policy.max_source_negative_balance
  then return query select false,'source_negative_limit_reached'::text; return; end if;

  if v_policy.minimum_reserve_balance is not null then
    select b.balance into v_reserve_balance
    from public.ledger_accounts la join public.ledger_account_balances b on b.account_id=la.id
    where la.id=v_policy.reserve_account_id and la.asset_id=p_asset_id and la.account_type='system'
      and la.code='SYSTEM_'||(select code from public.assets where id=p_asset_id)||'_MINING_RESERVE'
      and not la.allow_negative and la.is_active;
    if v_reserve_balance is null then return query select false,'reserve_account_not_found'::text; return; end if;
    if v_reserve_balance<v_policy.minimum_reserve_balance then return query select false,'reserve_below_minimum'::text; return; end if;
  end if;
  return query select true,null::text;
end;
$function$
;

revoke all on function private.check_mining_reward_issuance(uuid,numeric) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.update_mining_issuance_policy(p_asset_id uuid, p_issuance_enabled boolean, p_daily_limit numeric, p_total_limit numeric, p_max_source_negative_balance numeric, p_minimum_reserve_balance numeric, p_idempotency_key text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
  select private.update_mining_issuance_policy(
    (select auth.uid()),p_asset_id,p_issuance_enabled,p_daily_limit,p_total_limit,
    p_max_source_negative_balance,p_minimum_reserve_balance,p_idempotency_key
  );
$function$
;

revoke all on function private.update_mining_issuance_policy(uuid,uuid,boolean,numeric,numeric,numeric,numeric,text) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION private.update_mining_issuance_policy(p_actor_user_id uuid, p_asset_id uuid, p_issuance_enabled boolean, p_daily_limit numeric, p_total_limit numeric, p_max_source_negative_balance numeric, p_minimum_reserve_balance numeric, p_idempotency_key text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_policy public.mining_issuance_policies%rowtype;
  v_existing public.mining_issuance_policy_updates%rowtype;
  v_asset_decimals smallint;
  v_request_hash text;
  v_change_id uuid;
  v_reserve_account_id uuid;
begin
  if p_actor_user_id is null or p_actor_user_id<>(select auth.uid()) then raise exception 'invalid actor'; end if;
  if not private.has_admin_permission('mining.issuance.manage') then raise exception 'permission denied'; end if;
  if p_asset_id is null then raise exception 'asset is required'; end if;
  if p_idempotency_key is null or btrim(p_idempotency_key)='' or char_length(p_idempotency_key)>128 then raise exception 'invalid idempotency key'; end if;
  select decimals into v_asset_decimals from public.assets where id=p_asset_id and is_active;
  if v_asset_decimals is null then raise exception 'asset not found or inactive'; end if;

  if p_daily_limit is not null and (p_daily_limit<=0 or p_daily_limit<>round(p_daily_limit,v_asset_decimals)) then raise exception 'invalid daily issuance limit'; end if;
  if p_total_limit is not null and (p_total_limit<=0 or p_total_limit<>round(p_total_limit,v_asset_decimals)) then raise exception 'invalid total issuance limit'; end if;
  if p_max_source_negative_balance is not null and (p_max_source_negative_balance<0 or p_max_source_negative_balance<>round(p_max_source_negative_balance,v_asset_decimals)) then raise exception 'invalid source negative limit'; end if;
  if p_minimum_reserve_balance is not null and (p_minimum_reserve_balance<0 or p_minimum_reserve_balance<>round(p_minimum_reserve_balance,v_asset_decimals)) then raise exception 'invalid reserve minimum'; end if;

  if coalesce(p_issuance_enabled,false)
     and p_daily_limit is null and p_total_limit is null
     and p_max_source_negative_balance is null and p_minimum_reserve_balance is null
  then raise exception 'at least one issuance guard is required before enabling issuance'; end if;

  v_request_hash:=md5(jsonb_build_object('asset_id',p_asset_id,'issuance_enabled',coalesce(p_issuance_enabled,false),'daily_limit',p_daily_limit,'total_limit',p_total_limit,'max_source_negative_balance',p_max_source_negative_balance,'minimum_reserve_balance',p_minimum_reserve_balance)::text);

  select * into v_existing from public.mining_issuance_policy_updates where idempotency_key=p_idempotency_key;
  if found then
    if v_existing.request_hash<>v_request_hash or v_existing.actor_user_id<>p_actor_user_id then raise exception 'idempotency key conflict'; end if;
    return v_existing.id;
  end if;

  select * into v_policy from public.mining_issuance_policies where asset_id=p_asset_id for update;
  if not found then raise exception 'issuance policy not found'; end if;

  if p_minimum_reserve_balance is not null then
    v_reserve_account_id:=private.ensure_mining_reserve_account(p_asset_id);
  else
    v_reserve_account_id:=null;
  end if;

  insert into public.mining_issuance_policy_updates(
    asset_id,actor_user_id,issuance_enabled,daily_limit,total_limit,max_source_negative_balance,
    minimum_reserve_balance,reserve_account_id,idempotency_key,request_hash
  ) values(
    p_asset_id,p_actor_user_id,coalesce(p_issuance_enabled,false),p_daily_limit,p_total_limit,
    p_max_source_negative_balance,p_minimum_reserve_balance,v_reserve_account_id,p_idempotency_key,v_request_hash
  ) returning id into v_change_id;

  update public.mining_issuance_policies
  set issuance_enabled=coalesce(p_issuance_enabled,false),daily_limit=p_daily_limit,total_limit=p_total_limit,
      max_source_negative_balance=p_max_source_negative_balance,minimum_reserve_balance=p_minimum_reserve_balance,
      reserve_account_id=v_reserve_account_id,updated_at=clock_timestamp(),updated_by=p_actor_user_id
  where asset_id=p_asset_id;

  perform private.write_finance_audit(
    p_actor_user_id,null,'mining_issuance_policy_updated','mining_issuance_policy',p_asset_id::text,
    jsonb_build_object(
      'change_id',v_change_id,'issuance_enabled',coalesce(p_issuance_enabled,false),
      'daily_limit',p_daily_limit,'total_limit',p_total_limit,
      'max_source_negative_balance',p_max_source_negative_balance,
      'minimum_reserve_balance',p_minimum_reserve_balance,'reserve_account_id',v_reserve_account_id
    )
  );
  return v_change_id;
end;
$function$


revoke all on function public.update_mining_issuance_policy(uuid,boolean,numeric,numeric,numeric,numeric,text) from public,anon;
grant execute on function public.update_mining_issuance_policy(uuid,boolean,numeric,numeric,numeric,numeric,text) to authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_mining_issuance_controls()
 RETURNS TABLE(asset_id uuid, asset_code text, asset_name text, asset_decimals smallint, issuance_enabled boolean, daily_limit numeric, daily_issued numeric, daily_remaining numeric, total_limit numeric, total_issued numeric, total_remaining numeric, max_source_negative_balance numeric, source_balance numeric, source_headroom numeric, reserve_account_id uuid, reserve_balance numeric, minimum_reserve_balance numeric, issuance_state text, block_reason text, blocked_payment_count bigint, last_blocked_at timestamp with time zone)
 LANGUAGE sql
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$ select * from private.get_admin_mining_issuance_controls(); $function$
;

revoke all on function private.get_admin_mining_issuance_controls() from public,anon,authenticated;

CREATE OR REPLACE FUNCTION private.get_admin_mining_issuance_controls()
 RETURNS TABLE(asset_id uuid, asset_code text, asset_name text, asset_decimals smallint, issuance_enabled boolean, daily_limit numeric, daily_issued numeric, daily_remaining numeric, total_limit numeric, total_issued numeric, total_remaining numeric, max_source_negative_balance numeric, source_balance numeric, source_headroom numeric, reserve_account_id uuid, reserve_balance numeric, minimum_reserve_balance numeric, issuance_state text, block_reason text, blocked_payment_count bigint, last_blocked_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_row record;
  v_timezone text:=coalesce((select calculation_timezone from public.mining_settings where id=1),'Asia/Seoul');
  v_now timestamptz:=clock_timestamp();
  v_day_start timestamptz:=date_trunc('day',v_now at time zone v_timezone) at time zone v_timezone;
  v_source_balance numeric(38,18);
  v_reserve_balance numeric(38,18);
  v_daily numeric(38,18);
  v_total numeric(38,18);
  v_blocked bigint;
  v_last timestamptz;
begin
  if not private.has_admin_permission('mining.read') then raise exception 'permission denied'; end if;

  for v_row in
    select a.id asset_id,a.code asset_code,a.name asset_name,a.decimals asset_decimals,
           p.issuance_enabled,p.daily_limit,p.total_limit,p.max_source_negative_balance,p.reserve_account_id,p.minimum_reserve_balance
    from public.assets a join public.mining_issuance_policies p on p.asset_id=a.id
    where a.is_active order by a.code
  loop
    select coalesce(sum(amount),0)::numeric(38,18) into v_daily
    from (
      select amount,created_at from public.mining_reward_payments where asset_id=v_row.asset_id
      union all
      select amount,created_at from public.mining_reward_corrections where asset_id=v_row.asset_id and correction_type='additional_paid'
    ) x where x.created_at>=v_day_start and x.created_at<v_now;

    select coalesce(sum(amount),0)::numeric(38,18) into v_total
    from (
      select amount from public.mining_reward_payments where asset_id=v_row.asset_id
      union all
      select amount from public.mining_reward_corrections where asset_id=v_row.asset_id and correction_type='additional_paid'
    ) x;

    select b.balance into v_source_balance
    from public.ledger_accounts la join public.ledger_account_balances b on b.account_id=la.id
    where la.asset_id=v_row.asset_id and la.account_type='system'
      and la.code='SYSTEM_'||v_row.asset_code||'_MINING_REWARDS' and la.is_active;

    v_reserve_balance:=null;
    if v_row.reserve_account_id is not null then
      select b.balance into v_reserve_balance from public.ledger_account_balances b where b.account_id=v_row.reserve_account_id;
    end if;

    select count(*),max(created_at) into v_blocked,v_last
    from public.mining_reward_issuance_blocks b where b.asset_id=v_row.asset_id;

    if not v_row.issuance_enabled then
      return query select v_row.asset_id,v_row.asset_code,v_row.asset_name,v_row.asset_decimals,
        v_row.issuance_enabled,v_row.daily_limit,v_daily,
        case when v_row.daily_limit is null then null else greatest(v_row.daily_limit-v_daily,0) end,
        v_row.total_limit,v_total,
        case when v_row.total_limit is null then null else greatest(v_row.total_limit-v_total,0) end,
        v_row.max_source_negative_balance,v_source_balance,
        case when v_row.max_source_negative_balance is null or v_source_balance is null then null else greatest(v_row.max_source_negative_balance+v_source_balance,0) end,
        v_row.reserve_account_id,v_reserve_balance,v_row.minimum_reserve_balance,
        'disabled'::text,null::text,v_blocked,v_last;
    elsif v_row.daily_limit is null and v_row.total_limit is null and v_row.max_source_negative_balance is null and v_row.minimum_reserve_balance is null then
      return query select v_row.asset_id,v_row.asset_code,v_row.asset_name,v_row.asset_decimals,
        v_row.issuance_enabled,v_row.daily_limit,v_daily,null,v_row.total_limit,v_total,null,
        v_row.max_source_negative_balance,v_source_balance,null,v_row.reserve_account_id,v_reserve_balance,v_row.minimum_reserve_balance,
        'blocked'::text,'guard_not_configured'::text,v_blocked,v_last;
    elsif v_row.daily_limit is not null and v_daily>=v_row.daily_limit then
      return query select v_row.asset_id,v_row.asset_code,v_row.asset_name,v_row.asset_decimals,
        v_row.issuance_enabled,v_row.daily_limit,v_daily,0,v_row.total_limit,v_total,
        case when v_row.total_limit is null then null else greatest(v_row.total_limit-v_total,0) end,
        v_row.max_source_negative_balance,v_source_balance,
        case when v_row.max_source_negative_balance is null or v_source_balance is null then null else greatest(v_row.max_source_negative_balance+v_source_balance,0) end,
        v_row.reserve_account_id,v_reserve_balance,v_row.minimum_reserve_balance,
        'blocked'::text,'daily_limit_reached'::text,v_blocked,v_last;
    elsif v_row.total_limit is not null and v_total>=v_row.total_limit then
      return query select v_row.asset_id,v_row.asset_code,v_row.asset_name,v_row.asset_decimals,
        v_row.issuance_enabled,v_row.daily_limit,v_daily,
        case when v_row.daily_limit is null then null else greatest(v_row.daily_limit-v_daily,0) end,
        v_row.total_limit,v_total,0,v_row.max_source_negative_balance,v_source_balance,
        case when v_row.max_source_negative_balance is null or v_source_balance is null then null else greatest(v_row.max_source_negative_balance+v_source_balance,0) end,
        v_row.reserve_account_id,v_reserve_balance,v_row.minimum_reserve_balance,
        'blocked'::text,'total_limit_reached'::text,v_blocked,v_last;
    elsif v_row.max_source_negative_balance is not null and v_source_balance is null then
      return query select v_row.asset_id,v_row.asset_code,v_row.asset_name,v_row.asset_decimals,
        v_row.issuance_enabled,v_row.daily_limit,v_daily,
        case when v_row.daily_limit is null then null else greatest(v_row.daily_limit-v_daily,0) end,
        v_row.total_limit,v_total,
        case when v_row.total_limit is null then null else greatest(v_row.total_limit-v_total,0) end,
        v_row.max_source_negative_balance,v_source_balance,null,
        v_row.reserve_account_id,v_reserve_balance,v_row.minimum_reserve_balance,
        'blocked'::text,'source_account_not_found'::text,v_blocked,v_last;
    elsif v_row.minimum_reserve_balance is not null and (v_reserve_balance is null or v_reserve_balance<v_row.minimum_reserve_balance) then
      return query select v_row.asset_id,v_row.asset_code,v_row.asset_name,v_row.asset_decimals,
        v_row.issuance_enabled,v_row.daily_limit,v_daily,
        case when v_row.daily_limit is null then null else greatest(v_row.daily_limit-v_daily,0) end,
        v_row.total_limit,v_total,
        case when v_row.total_limit is null then null else greatest(v_row.total_limit-v_total,0) end,
        v_row.max_source_negative_balance,v_source_balance,
        case when v_row.max_source_negative_balance is null or v_source_balance is null then null else greatest(v_row.max_source_negative_balance+v_source_balance,0) end,
        v_row.reserve_account_id,v_reserve_balance,v_row.minimum_reserve_balance,
        'blocked'::text,'reserve_below_minimum'::text,v_blocked,v_last;
    else
      return query select v_row.asset_id,v_row.asset_code,v_row.asset_name,v_row.asset_decimals,
        v_row.issuance_enabled,v_row.daily_limit,v_daily,
        case when v_row.daily_limit is null then null else greatest(v_row.daily_limit-v_daily,0) end,
        v_row.total_limit,v_total,
        case when v_row.total_limit is null then null else greatest(v_row.total_limit-v_total,0) end,
        v_row.max_source_negative_balance,v_source_balance,
        case when v_row.max_source_negative_balance is null or v_source_balance is null then null else greatest(v_row.max_source_negative_balance+v_source_balance,0) end,
        v_row.reserve_account_id,v_reserve_balance,v_row.minimum_reserve_balance,
        'ready'::text,null::text,v_blocked,v_last;
    end if;
  end loop;
end;
$function$


revoke all on function public.get_admin_mining_issuance_controls() from public,anon;
grant execute on function public.get_admin_mining_issuance_controls() to authenticated;

CREATE OR REPLACE FUNCTION private.calculate_mining_contract(p_contract_id uuid, p_calculation_run_id uuid, p_now timestamp with time zone, p_reward_precision smallint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
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
  v_issuance_allowed boolean;
  v_issuance_block_reason text;
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
    select allowed, reason_code
    into v_issuance_allowed, v_issuance_block_reason
    from private.check_mining_reward_issuance(v_contract.reward_asset_id, v_payable);

    if not v_issuance_allowed then
      insert into public.mining_reward_issuance_blocks(
        calculation_run_id, contract_id, accrual_id, user_id, asset_id, amount, reason_code
      )
      values(
        p_calculation_run_id, v_contract.id, v_accrual_id, v_contract.user_id,
        v_contract.reward_asset_id, v_payable, v_issuance_block_reason
      );
      v_payable := 0;
    end if;
  end if;

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
$function$
;
revoke all on function private.calculate_mining_contract(uuid,uuid,timestamptz,smallint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.apply_mining_reward_correction(p_contract_id uuid, p_original_accrual_id uuid, p_correction_type text, p_amount numeric, p_reason text, p_idempotency_key text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
  select private.apply_mining_reward_correction(
    (select auth.uid()),p_contract_id,p_original_accrual_id,
    p_correction_type,p_amount,p_reason,p_idempotency_key
  );
$function$
;
revoke all on function private.apply_mining_reward_correction(uuid,uuid,uuid,text,numeric,text,text) from public,anon,authenticated;
