-- PHASE 16 — monitoring functions and notification lifecycle.

create or replace function private.refresh_admin_notifications()
returns integer
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer := 0;
  v_existing public.admin_notifications%rowtype;
  v_active record;
begin
  create temporary table if not exists tmp_admin_active_notifications (
    notification_key text primary key,
    severity text not null,
    code text not null,
    title text not null,
    message text not null,
    owner_area text not null,
    href text not null,
    metadata jsonb not null default '{}'::jsonb
  ) on commit drop;
  truncate tmp_admin_active_notifications;

  insert into tmp_admin_active_notifications
  (notification_key,severity,code,title,message,owner_area,href,metadata)
  select
    'mining_calculation_failure','critical','mining_calculation_failure',
    '채굴 계산 오류',
    format('처리되지 않은 채굴 계산 오류가 %s건 있습니다.', count(*)::text),
    '채굴·정산 운영','/dashboard/mining',
    jsonb_build_object('open_error_count',count(*))
  from public.mining_calculation_errors
  where status='open'
  having count(*) > 0;

  insert into tmp_admin_active_notifications
  (notification_key,severity,code,title,message,owner_area,href,metadata)
  select
    'mining_calculation_repeated_failure','critical','mining_calculation_repeated_failure',
    '반복 채굴 계산 실패',
    format('같은 유형의 채굴 계산 오류가 반복되고 있습니다. 반복 건수: %s건.', repeated.error_count::text),
    '채굴·정산 운영','/dashboard/mining',
    jsonb_build_object('sqlstate',repeated.sqlstate,'sample_message',left(repeated.error_message,500),'repeat_count',repeated.error_count)
  from (
    select sqlstate,error_message,count(*)::integer error_count
    from public.mining_calculation_errors
    where status='open'
    group by sqlstate,error_message
    having count(*) >= 2
    order by count(*) desc, sqlstate
    limit 1
  ) repeated;

  if exists (
    select 1 from public.admin_mining_reconciliation_summary
    where coalesce(reconciliation_status,'') not in ('','healthy')
  ) then
    insert into tmp_admin_active_notifications values (
      'mining_reconciliation_mismatch','critical','mining_reconciliation_mismatch',
      '채굴 정산 대사 불일치','채굴 정산 상태가 정상 상태가 아닙니다. 대사 결과를 확인해 주세요.',
      '채굴·정산 운영','/dashboard/mining',
      jsonb_build_object(
        'reconciliation_status',(select reconciliation_status from public.admin_mining_reconciliation_summary limit 1),
        'open_error_count',(select open_error_count from public.admin_mining_reconciliation_summary limit 1),
        'stale_run_count',(select stale_run_count from public.admin_mining_reconciliation_summary limit 1)
      )
    );
  end if;

  insert into tmp_admin_active_notifications
  (notification_key,severity,code,title,message,owner_area,href,metadata)
  select
    'ledger_unbalanced','critical','ledger_unbalanced','Ledger 불균형',
    format('원장 불균형 거래가 %s건 발견되었습니다.', count(*)::text),
    '금융 운영','/dashboard/finance',
    jsonb_build_object('unbalanced_transaction_count',count(*))
  from (
    select lt.id
    from public.ledger_transactions lt
    join public.ledger_entries le on le.transaction_id=lt.id
    group by lt.id
    having coalesce(sum(case when le.direction='debit' then le.amount else 0 end),0)
        <> coalesce(sum(case when le.direction='credit' then le.amount else 0 end),0)
  ) q
  having count(*) > 0;

  insert into tmp_admin_active_notifications
  (notification_key,severity,code,title,message,owner_area,href,metadata)
  select
    'withdrawal_processing_delay','attention','withdrawal_processing_delay',
    '출금 처리 지연 확인',
    format('1시간 이상 마지막 상태 변경이 없는 출금 처리 건이 %s건 있습니다.', count(*)::text),
    '금융 운영','/dashboard/finance',
    jsonb_build_object('delayed_count',count(*),'monitoring_threshold_minutes',60)
  from public.withdrawal_requests
  where status='processing'
    and updated_at < v_now - interval '1 hour'
  having count(*) > 0;

  if not exists (
    select 1 from cron.job
    where jobname='apex-matrix-mining-calculation' and active=true
  ) then
    insert into tmp_admin_active_notifications values (
      'cron_mining_disabled','critical','cron_mining_disabled','채굴 Cron 비활성',
      '필수 채굴 자동 실행 Cron이 활성 상태가 아닙니다.',
      '시스템 운영','/dashboard/system',
      jsonb_build_object('job_name','apex-matrix-mining-calculation')
    );
  end if;

  if exists (
    select 1
    from cron.job j
    where j.jobname='apex-matrix-mining-calculation' and j.active=true
      and not exists (
        select 1 from cron.job_run_details d
        where d.jobid=j.jobid
          and d.start_time >= v_now - interval '2 minutes'
      )
  ) then
    insert into tmp_admin_active_notifications values (
      'cron_mining_stopped','critical','cron_mining_stopped','채굴 자동 실행 감시 중단',
      '활성 채굴 Cron의 최근 실행 기록이 확인되지 않습니다.',
      '시스템 운영','/dashboard/system',
      jsonb_build_object('monitoring_window_minutes',2)
    );
  end if;

  if exists (
    select 1
    from cron.job j
    join lateral (
      select status,runid,start_time
      from cron.job_run_details d
      where d.jobid=j.jobid
      order by start_time desc
      limit 1
    ) d on true
    where j.jobname='apex-matrix-mining-calculation'
      and j.active=true
      and coalesce(d.status,'') <> 'succeeded'
  ) then
    insert into tmp_admin_active_notifications values (
      'cron_mining_failure','critical','cron_mining_failure','채굴 Cron 실행 실패',
      '최근 채굴 자동 실행이 성공하지 않았습니다.',
      '시스템 운영','/dashboard/system',
      jsonb_build_object(
        'job_name','apex-matrix-mining-calculation',
        'latest_run',(select d.runid from cron.job j join lateral (select runid,start_time from cron.job_run_details d where d.jobid=j.jobid order by d.start_time desc limit 1) d on true where j.jobname='apex-matrix-mining-calculation' and j.active=true order by d.start_time desc limit 1),
        'latest_status',(select d.status from cron.job_run_details d join cron.job j on j.jobid=d.jobid where j.jobname='apex-matrix-mining-calculation' order by d.start_time desc limit 1)
      )
    );
  end if;

  if exists (
    select 1
    from cron.job j
    join lateral (
      select status,runid,start_time
      from cron.job_run_details d
      where d.jobid=j.jobid
      order by start_time desc
      limit 1
    ) d on true
    where j.active=true
      and j.jobname not in ('apex-matrix-admin-notification-refresh','apex-matrix-mining-calculation')
      and coalesce(d.status,'') not in ('','succeeded')
  ) then
    insert into tmp_admin_active_notifications values (
      'db_job_failure','critical','db_job_failure','DB 작업 실패',
      '예약된 DB 작업 중 최근 성공하지 않은 작업이 있습니다.',
      '시스템 운영','/dashboard/system',
      jsonb_build_object(
        'job_name',(select j.jobname from cron.job j join lateral (select status,start_time from cron.job_run_details d where d.jobid=j.jobid order by d.start_time desc limit 1) d on true where j.active=true and j.jobname not in ('apex-matrix-admin-notification-refresh','apex-matrix-mining-calculation') and coalesce(d.status,'') not in ('','succeeded') order by d.start_time desc limit 1),
        'status',(select d.status from cron.job j join lateral (select status,start_time from cron.job_run_details d where d.jobid=j.jobid order by d.start_time desc limit 1) d on true where j.active=true and j.jobname not in ('apex-matrix-admin-notification-refresh','apex-matrix-mining-calculation') and coalesce(d.status,'') not in ('','succeeded') order by d.start_time desc limit 1)
      )
    );
  end if;

  for v_active in select * from tmp_admin_active_notifications loop
    select * into v_existing
    from public.admin_notifications
    where notification_key=v_active.notification_key
    for update;

    if not found then
      insert into public.admin_notifications (
        notification_key,severity,code,title,message,owner_area,href,
        occurrence_count,first_seen_at,last_seen_at,metadata,created_at,updated_at
      ) values (
        v_active.notification_key,v_active.severity,v_active.code,v_active.title,
        v_active.message,v_active.owner_area,v_active.href,
        1,v_now,v_now,v_active.metadata,v_now,v_now
      ) returning * into v_existing;

      insert into public.admin_notification_events(notification_id,event_type,metadata)
      values (v_existing.id,'raised',v_active.metadata);
      v_count := v_count+1;
    elseif v_existing.status='resolved' then
      update public.admin_notifications
      set severity=v_active.severity,code=v_active.code,title=v_active.title,message=v_active.message,
          owner_area=v_active.owner_area,href=v_active.href,occurrence_count=occurrence_count+1,
          last_seen_at=v_now,updated_at=v_now,metadata=v_active.metadata,status='open',
          resolved_at=null,resolved_by=null
      where id=v_existing.id returning * into v_existing;

      insert into public.admin_notification_events(notification_id,event_type,metadata)
      values (v_existing.id,'reopened',v_active.metadata);
      v_count := v_count+1;
    else
      update public.admin_notifications
      set severity=v_active.severity,code=v_active.code,title=v_active.title,message=v_active.message,
          owner_area=v_active.owner_area,href=v_active.href,last_seen_at=v_now,
          updated_at=v_now,metadata=v_active.metadata
      where id=v_existing.id;
    end if;
  end loop;

  for v_existing in
    select n.* from public.admin_notifications n
    where n.status in ('open','acknowledged')
      and not exists (
        select 1 from tmp_admin_active_notifications a
        where a.notification_key=n.notification_key
      )
    for update
  loop
    update public.admin_notifications
    set status='resolved',resolved_at=v_now,updated_at=v_now
    where id=v_existing.id;
    insert into public.admin_notification_events(notification_id,event_type,metadata)
    values (v_existing.id,'resolved',jsonb_build_object('resolved_by','system','resolved_at',v_now));
    v_count := v_count+1;
  end loop;

  return v_count;
end;
$function$;

revoke all on function private.refresh_admin_notifications() from public,anon,authenticated;

create or replace function private.get_admin_notifications(p_status text default null,p_limit integer default 100)
returns setof public.admin_notifications
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $function$
begin
  if (select auth.uid()) is null or not private.has_admin_permission('notifications.read') then
    raise exception 'permission denied';
  end if;
  if p_status is not null and p_status not in ('open','acknowledged','resolved') then
    raise exception 'invalid notification status';
  end if;
  return query
    select * from public.admin_notifications
    where p_status is null or status=p_status
    order by case severity when 'critical' then 1 when 'attention' then 2 else 3 end,
             last_seen_at desc,id desc
    limit least(greatest(coalesce(p_limit,100),1),200);
end;
$function$;

revoke all on function private.get_admin_notifications(text,integer) from public,anon,authenticated;

create or replace function public.get_admin_notifications(p_status text default null,p_limit integer default 100)
returns setof public.admin_notifications
language sql
security invoker
set search_path=public,auth,pg_temp
as $function$ select * from private.get_admin_notifications(p_status,p_limit); $function$;
revoke all on function public.get_admin_notifications(text,integer) from public,anon;
grant execute on function public.get_admin_notifications(text,integer) to authenticated;

create or replace function private.get_admin_notification_summary()
returns jsonb
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $function$
begin
  if (select auth.uid()) is null or not private.has_admin_permission('notifications.read') then raise exception 'permission denied'; end if;
  return jsonb_build_object(
    'open_count',(select count(*)::int from public.admin_notifications where status='open'),
    'acknowledged_count',(select count(*)::int from public.admin_notifications where status='acknowledged'),
    'active_count',(select count(*)::int from public.admin_notifications where status in ('open','acknowledged')),
    'critical_count',(select count(*)::int from public.admin_notifications where status in ('open','acknowledged') and severity='critical'),
    'can_manage',private.has_admin_permission('notifications.manage'),
    'last_event_at',(select max(created_at) from public.admin_notification_events)
  );
end;
$function$;

revoke all on function private.get_admin_notification_summary() from public,anon,authenticated;

create or replace function public.get_admin_notification_summary()
returns jsonb
language sql
security invoker
set search_path=public,auth,pg_temp
as $function$ select private.get_admin_notification_summary(); $function$;
revoke all on function public.get_admin_notification_summary() from public,anon;
grant execute on function public.get_admin_notification_summary() to authenticated;

create or replace function private.get_admin_notification_events(p_limit integer default 100)
returns table (
  event_id uuid, notification_id uuid, notification_key text, code text, title text,
  event_type text, actor_user_id uuid, metadata jsonb, created_at timestamptz
)
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $function$
begin
  if (select auth.uid()) is null or not private.has_admin_permission('notifications.read') then raise exception 'permission denied'; end if;
  return query
    select e.id,n.id,n.notification_key,n.code,n.title,e.event_type,e.actor_user_id,e.metadata,e.created_at
    from public.admin_notification_events e
    join public.admin_notifications n on n.id=e.notification_id
    order by e.created_at desc,e.id desc
    limit least(greatest(coalesce(p_limit,100),1),200);
end;
$function$;

revoke all on function private.get_admin_notification_events(integer) from public,anon,authenticated;

create or replace function public.get_admin_notification_events(p_limit integer default 100)
returns table (
  event_id uuid, notification_id uuid, notification_key text, code text, title text,
  event_type text, actor_user_id uuid, metadata jsonb, created_at timestamptz
)
language sql
security invoker
set search_path=public,auth,pg_temp
as $function$ select * from private.get_admin_notification_events(p_limit); $function$;
revoke all on function public.get_admin_notification_events(integer) from public,anon;
grant execute on function public.get_admin_notification_events(integer) to authenticated;

create or replace function private.acknowledge_admin_notification(p_actor_user_id uuid,p_notification_id uuid)
returns public.admin_notifications
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $function$
declare v_row public.admin_notifications%rowtype; v_now timestamptz:=clock_timestamp();
begin
  if p_actor_user_id is null or p_actor_user_id <> (select auth.uid()) then raise exception 'invalid actor'; end if;
  if not private.has_admin_permission('notifications.manage') then raise exception 'permission denied'; end if;
  select * into v_row from public.admin_notifications where id=p_notification_id for update;
  if not found then raise exception 'notification not found'; end if;
  if v_row.status='open' then
    update public.admin_notifications
    set status='acknowledged',acknowledged_at=v_now,acknowledged_by=p_actor_user_id,updated_at=v_now
    where id=v_row.id returning * into v_row;
    insert into public.admin_notification_events(notification_id,event_type,actor_user_id)
    values (v_row.id,'acknowledged',p_actor_user_id);
    perform private.write_finance_audit(
      p_actor_user_id,null,'admin_notification_acknowledged','admin_notification',v_row.id::text,
      jsonb_build_object('code',v_row.code)
    );
  end if;
  return v_row;
end;
$function$;
revoke all on function private.acknowledge_admin_notification(uuid,uuid) from public,anon,authenticated;

create or replace function public.acknowledge_admin_notification(p_notification_id uuid)
returns public.admin_notifications
language sql
security invoker
set search_path=public,auth,pg_temp
as $function$ select private.acknowledge_admin_notification((select auth.uid()),p_notification_id); $function$;
revoke all on function public.acknowledge_admin_notification(uuid) from public,anon;
grant execute on function public.acknowledge_admin_notification(uuid) to authenticated;

create or replace function private.resolve_admin_notification(p_actor_user_id uuid,p_notification_id uuid)
returns public.admin_notifications
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $function$
declare v_row public.admin_notifications%rowtype; v_now timestamptz:=clock_timestamp();
begin
  if p_actor_user_id is null or p_actor_user_id <> (select auth.uid()) then raise exception 'invalid actor'; end if;
  if not private.has_admin_permission('notifications.manage') then raise exception 'permission denied'; end if;
  select * into v_row from public.admin_notifications where id=p_notification_id for update;
  if not found then raise exception 'notification not found'; end if;
  if v_row.status <> 'resolved' then
    update public.admin_notifications
    set status='resolved',resolved_at=v_now,resolved_by=p_actor_user_id,updated_at=v_now
    where id=v_row.id returning * into v_row;
    insert into public.admin_notification_events(notification_id,event_type,actor_user_id)
    values (v_row.id,'resolved',p_actor_user_id);
    perform private.write_finance_audit(
      p_actor_user_id,null,'admin_notification_resolved','admin_notification',v_row.id::text,
      jsonb_build_object('code',v_row.code)
    );
  end if;
  return v_row;
end;
$function$;
revoke all on function private.resolve_admin_notification(uuid,uuid) from public,anon,authenticated;

create or replace function public.resolve_admin_notification(p_notification_id uuid)
returns public.admin_notifications
language sql
security invoker
set search_path=public,auth,pg_temp
as $function$ select private.resolve_admin_notification((select auth.uid()),p_notification_id); $function$;
revoke all on function public.resolve_admin_notification(uuid) from public,anon;
grant execute on function public.resolve_admin_notification(uuid) to authenticated;
