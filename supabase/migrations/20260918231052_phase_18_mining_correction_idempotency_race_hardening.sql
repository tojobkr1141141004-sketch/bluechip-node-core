-- PHASE 18 concurrency hardening:
-- serialize mining reward corrections by contract before idempotency lookup
-- so concurrent retries with the same idempotency key observe the committed result.

create or replace function private.apply_mining_reward_correction(
  p_actor_user_id uuid,
  p_contract_id uuid,
  p_original_accrual_id uuid,
  p_correction_type text,
  p_amount numeric,
  p_reason text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
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
  v_issuance_allowed boolean;
  v_issuance_block_reason text;
begin
  if p_actor_user_id is null or p_actor_user_id <> (select auth.uid()) then
    raise exception 'invalid actor';
  end if;

  if not private.has_admin_permission('mining.manage') then
    raise exception 'permission denied';
  end if;

  if p_contract_id is null then raise exception 'contract is required'; end if;

  if p_correction_type not in ('additional_paid','additional_pending','reduce_pending') then
    raise exception 'invalid correction type';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount,18) then
    raise exception 'invalid correction amount';
  end if;

  if p_reason is null or char_length(btrim(p_reason)) < 3 or char_length(p_reason) > 1000 then
    raise exception 'invalid correction reason';
  end if;

  if p_idempotency_key is null
     or char_length(btrim(p_idempotency_key)) < 8
     or char_length(p_idempotency_key) > 128 then
    raise exception 'invalid idempotency key';
  end if;

  v_request_hash := md5(
    jsonb_build_object(
      'contract_id',p_contract_id,
      'original_accrual_id',p_original_accrual_id,
      'correction_type',p_correction_type,
      'amount',p_amount,
      'reason',p_reason
    )::text
  );

  -- Serialize concurrent corrections for the same contract before checking
  -- idempotency so a concurrent retry can observe the committed result.
  select * into v_contract
  from public.mining_contracts
  where id=p_contract_id
  for update;

  if not found then raise exception 'mining contract not found'; end if;

  select * into v_existing
  from public.mining_reward_corrections
  where idempotency_key=p_idempotency_key;

  if found then
    if v_existing.request_hash <> v_request_hash
       or v_existing.actor_user_id <> p_actor_user_id then
      raise exception 'idempotency key conflict';
    end if;
    return v_existing.id;
  end if;

  select reward_asset_id into v_reward_asset_id
  from public.mining_product_versions
  where id=v_contract.product_version_id;

  if v_reward_asset_id is null then raise exception 'reward asset not found'; end if;

  if p_original_accrual_id is not null
     and not exists (
       select 1 from public.mining_reward_accruals
       where id=p_original_accrual_id
         and contract_id=p_contract_id
         and user_id=v_contract.user_id
         and asset_id=v_reward_asset_id
     ) then
    raise exception 'original accrual does not belong to contract';
  end if;

  if p_correction_type='additional_pending'
     and v_contract.status <> 'active' then
    raise exception 'additional pending correction requires active contract';
  end if;

  if p_correction_type='reduce_pending'
     and p_amount > v_contract.pending_reward then
    raise exception 'correction exceeds pending reward';
  end if;

  if p_correction_type='additional_paid' then
    select allowed, reason_code
    into v_issuance_allowed, v_issuance_block_reason
    from private.check_mining_reward_issuance(v_reward_asset_id, p_amount);

    if not v_issuance_allowed then
      raise exception 'mining reward issuance blocked: %', v_issuance_block_reason;
    end if;
  end if;

  v_run_hash := md5(
    jsonb_build_object(
      'run_type','correction',
      'contract_id',p_contract_id,
      'correction_type',p_correction_type,
      'amount',p_amount,
      'idempotency_key',p_idempotency_key
    )::text
  );

  insert into public.mining_calculation_runs(
    started_at,status,run_key,run_type,request_hash
  )
  values(clock_timestamp(),'running',p_idempotency_key,'correction',v_run_hash)
  returning id into v_run_id;

  insert into public.mining_reward_corrections(
    contract_id,user_id,asset_id,calculation_run_id,original_accrual_id,
    correction_type,amount,reason,actor_user_id,idempotency_key,request_hash
  )
  values(
    p_contract_id,v_contract.user_id,v_reward_asset_id,v_run_id,p_original_accrual_id,
    p_correction_type,p_amount::numeric(38,18),p_reason,p_actor_user_id,
    p_idempotency_key,v_request_hash
  )
  returning id into v_correction_id;

  if p_correction_type='additional_paid' then
    v_user_account_id := private.ensure_user_asset_account_internal(
      v_contract.user_id,v_reward_asset_id
    );
    v_reward_account_id := private.ensure_mining_reward_account(v_reward_asset_id);

    v_ledger_transaction_id := private.post_ledger_transaction_core(
      v_reward_asset_id,
      'mining_reward_correction',
      'mining-reward-correction:' || v_correction_id::text,
      jsonb_build_array(
        jsonb_build_object('account_id',v_reward_account_id,'direction','debit','amount',p_amount),
        jsonb_build_object('account_id',v_user_account_id,'direction','credit','amount',p_amount)
      ),
      '채굴 보상 정정 지급',
      'mining_reward_correction',
      v_correction_id::text,
      null,
      p_actor_user_id,
      false,
      false
    );

    update public.mining_reward_corrections
    set ledger_transaction_id=v_ledger_transaction_id,applied_at=clock_timestamp()
    where id=v_correction_id;

    v_projected_earned := (v_contract.total_reward_earned+p_amount)::numeric(38,18);
    v_projected_paid := (v_contract.total_reward_paid+p_amount)::numeric(38,18);
    v_projected_pending := v_contract.pending_reward;
  elsif p_correction_type='additional_pending' then
    v_projected_earned := (v_contract.total_reward_earned+p_amount)::numeric(38,18);
    v_projected_paid := v_contract.total_reward_paid;
    v_projected_pending := (v_contract.pending_reward+p_amount)::numeric(38,18);
  else
    v_projected_earned := (v_contract.total_reward_earned-p_amount)::numeric(38,18);
    v_projected_paid := v_contract.total_reward_paid;
    v_projected_pending := (v_contract.pending_reward-p_amount)::numeric(38,18);
  end if;

  if v_projected_earned<0
     or v_projected_paid<0
     or v_projected_pending<0
     or v_projected_earned <> v_projected_paid+v_projected_pending then
    raise exception 'reward invariant would be violated by correction';
  end if;

  update public.mining_contracts
  set total_reward_earned=v_projected_earned,
      total_reward_paid=v_projected_paid,
      pending_reward=v_projected_pending,
      updated_at=now()
  where id=p_contract_id;

  update public.mining_calculation_runs
  set finished_at=clock_timestamp(),status='completed',
      processed_contracts=1,
      rewarded_contracts=case when p_correction_type='additional_paid' then 1 else 0 end,
      error_count=0
  where id=v_run_id;

  perform private.write_finance_audit(
    p_actor_user_id,v_contract.user_id,
    'mining_reward_correction_applied',
    'mining_reward_correction_applied',
    'mining_reward_correction',
    v_correction_id::text,
    jsonb_build_object(
      'contract_id',p_contract_id,
      'original_accrual_id',p_original_accrual_id,
      'correction_type',p_correction_type,
      'amount',p_amount,
      'calculation_run_id',v_run_id,
      'ledger_transaction_id',v_ledger_transaction_id
    )
  );

  return v_correction_id;
end;
$function$;
