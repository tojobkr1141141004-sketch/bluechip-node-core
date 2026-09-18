-- PHASE 13 non-destructive verification.
DO $verify$
declare
  v_asset uuid;
  v_allowed boolean;
  v_reason text;
begin
  if (select count(*) from public.mining_issuance_policies)
     <> (select count(*) from public.assets where is_active) then
    raise exception 'active asset/policy coverage mismatch';
  end if;

  if exists(select 1 from public.mining_issuance_policies where issuance_enabled) then
    raise exception 'issuance must remain disabled by default';
  end if;

  select id into v_asset from public.assets where code='USDT' and is_active limit 1;
  if v_asset is null then raise exception 'USDT asset missing'; end if;

  select allowed,reason_code into v_allowed,v_reason
  from private.check_mining_reward_issuance(v_asset,1);

  if v_allowed or v_reason <> 'issuance_disabled' then
    raise exception 'default issuance gate failed';
  end if;

  if has_table_privilege('authenticated','public.mining_issuance_policy_updates','INSERT') then
    raise exception 'authenticated INSERT privilege must remain denied';
  end if;
  if has_table_privilege('authenticated','public.mining_reward_issuance_blocks','INSERT') then
    raise exception 'authenticated INSERT privilege must remain denied';
  end if;
  if has_table_privilege('authenticated','public.mining_issuance_policies','UPDATE') then
    raise exception 'authenticated UPDATE privilege must remain denied';
  end if;
end
$verify$;

select
  (select count(*) from public.mining_reward_issuance_blocks) as blocked_rows,
  (select count(*) from public.mining_issuance_policy_updates) as policy_update_rows,
  (select count(*) from public.mining_contracts) as contract_rows,
  (select count(*) from public.mining_reward_corrections) as correction_rows,
  (select count(*) from public.ledger_transactions) as ledger_transactions,
  (select count(*) from public.ledger_entries) as ledger_entries;
