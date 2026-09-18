create or replace function private.get_admin_operations_center()
returns jsonb
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $function$
declare
  v_user uuid := (select auth.uid());
  v_can_members boolean;
  v_can_finance boolean;
  v_can_mining boolean;
  v_can_audit boolean;
begin
  if v_user is null or not (select private.has_admin_permission('admin.access')) then
    raise exception 'permission denied';
  end if;

  v_can_members := (select private.has_admin_permission('members.read'));
  v_can_finance := (select private.has_admin_permission('finance.read'));
  v_can_mining := (select private.has_admin_permission('mining.read'));
  v_can_audit := (select private.has_admin_permission('audit.read'));

  return jsonb_build_object(
    'generated_at', clock_timestamp(),
    'permissions', jsonb_build_object(
      'members_read', v_can_members,
      'finance_read', v_can_finance,
      'mining_read', v_can_mining,
      'audit_read', v_can_audit
    ),
    'members', case when v_can_members then jsonb_build_object(
      'total', (select count(*)::int from public.profiles),
      'active', (select count(*)::int from public.profiles where status='active'),
      'inactive', (select count(*)::int from public.profiles where status<>'active')
    ) else null end,
    'finance', case when v_can_finance then jsonb_build_object(
      'pending_deposits', (select count(*)::int from public.deposit_requests where status in ('pending','reviewing')),
      'pending_withdrawals', (select count(*)::int from public.withdrawal_requests where status in ('pending','reviewing')),
      'processing_withdrawals', (select count(*)::int from public.withdrawal_requests where status='processing')
    ) else null end,
    'mining', case when v_can_mining then jsonb_build_object(
      'active_contracts', (select count(*)::int from public.mining_contracts where status='active'),
      'completed_contracts', (select count(*)::int from public.mining_contracts where status='completed'),
      'cancelled_contracts', (select count(*)::int from public.mining_contracts where status='cancelled'),
      'open_errors', (select count(*)::int from public.mining_calculation_errors where status='open'),
      'stale_runs', (select count(*)::int from public.mining_calculation_runs where status='stale'),
      'reconciliation_status', coalesce((select reconciliation_status from public.admin_mining_reconciliation_summary limit 1),'unknown'),
      'unbalanced_ledger_count', (select count(*)::int from (
        select lt.id from public.ledger_transactions lt
        join public.ledger_entries le on le.transaction_id=lt.id
        group by lt.id
        having coalesce(sum(case when le.direction='debit' then le.amount else 0 end),0)
            <> coalesce(sum(case when le.direction='credit' then le.amount else 0 end),0)
      ) q),
      'last_successful_run_at', (select last_successful_run_at from public.admin_mining_reconciliation_summary limit 1)
    ) else null end,
    'system', case when v_can_mining then jsonb_build_object(
      'calculation_enabled', coalesce((select calculation_enabled from public.mining_settings where id=1),false),
      'issuance_enabled_policies', coalesce((select count(*)::int from public.mining_issuance_policies where issuance_enabled),0)
    ) else null end,
    'alerts', (
      select coalesce(jsonb_agg(
        jsonb_build_object('code',code,'severity',severity,'title',title,'count',count_value,'owner',owner,'href',href)
        order by severity_rank, code
      ), '[]'::jsonb)
      from (
        select 'ledger_unbalanced' code,'critical' severity,'Ledger 불균형' title,
               (select count(*)::int from (
                  select lt.id from public.ledger_transactions lt
                  join public.ledger_entries le on le.transaction_id=lt.id
                  group by lt.id
                  having coalesce(sum(case when le.direction='debit' then le.amount else 0 end),0)
                      <> coalesce(sum(case when le.direction='credit' then le.amount else 0 end),0)
               ) q) count_value,
               '원장 운영' owner,'/dashboard/finance' href,1 severity_rank
        where v_can_finance and (select count(*) from (
          select lt.id from public.ledger_transactions lt join public.ledger_entries le on le.transaction_id=lt.id
          group by lt.id
          having coalesce(sum(case when le.direction='debit' then le.amount else 0 end),0)
              <> coalesce(sum(case when le.direction='credit' then le.amount else 0 end),0)
        ) q) > 0
        union all
        select 'mining_reconciliation_unhealthy','critical','채굴 정산 상태 비정상',1,
               '채굴·정산 운영','/dashboard/mining',1
        where v_can_mining and coalesce((select reconciliation_status from public.admin_mining_reconciliation_summary limit 1),'healthy') not in ('healthy','')
        union all
        select 'open_mining_errors','critical','처리되지 않은 채굴 계산 오류',
               (select count(*)::int from public.mining_calculation_errors where status='open'),
               '채굴·정산 운영','/dashboard/mining',1
        where v_can_mining and (select count(*) from public.mining_calculation_errors where status='open') > 0
        union all
        select 'stale_mining_runs','attention','멈춘 채굴 계산 Run',
               (select count(*)::int from public.mining_calculation_runs where status='stale'),
               '채굴·정산 운영','/dashboard/mining',2
        where v_can_mining and (select count(*) from public.mining_calculation_runs where status='stale') > 0
        union all
        select 'pending_withdrawals','attention','확인이 필요한 출금 요청',
               (select count(*)::int from public.withdrawal_requests where status in ('pending','reviewing')),
               '금융 운영','/dashboard/finance',2
        where v_can_finance and (select count(*) from public.withdrawal_requests where status in ('pending','reviewing')) > 0
        union all
        select 'processing_withdrawals','attention','송금 처리 중인 출금 요청',
               (select count(*)::int from public.withdrawal_requests where status='processing'),
               '금융 운영','/dashboard/finance',2
        where v_can_finance and (select count(*) from public.withdrawal_requests where status='processing') > 0
        union all
        select 'pending_deposits','attention','확인이 필요한 입금 요청',
               (select count(*)::int from public.deposit_requests where status in ('pending','reviewing')),
               '금융 운영','/dashboard/finance',2
        where v_can_finance and (select count(*) from public.deposit_requests where status in ('pending','reviewing')) > 0
      ) a
    )
  );
end;
$function$;

revoke all on function private.get_admin_operations_center() from public,anon,authenticated;

create or replace function public.get_admin_operations_center()
returns jsonb
language sql
security invoker
set search_path=public,auth,pg_temp
as $function$
  select private.get_admin_operations_center();
$function$;

revoke all on function public.get_admin_operations_center() from public,anon;
grant execute on function public.get_admin_operations_center() to authenticated;
