-- PHASE 14: finance request append-only status history and secure read APIs.

create table public.finance_request_events (
  id uuid primary key default gen_random_uuid(),
  request_type text not null,
  request_id uuid not null,
  user_id uuid not null references auth.users(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete restrict,
  event_type text not null,
  old_status text,
  new_status text not null,
  reason text,
  external_reference text,
  transaction_id uuid references public.ledger_transactions(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  constraint finance_request_events_request_type_chk check (request_type in ('deposit','withdrawal')),
  constraint finance_request_events_event_type_chk check (event_type in ('created','status_changed')),
  constraint finance_request_events_status_chk check (btrim(new_status) <> '' and char_length(new_status) <= 32),
  constraint finance_request_events_old_status_chk check (old_status is null or (btrim(old_status) <> '' and char_length(old_status) <= 32)),
  constraint finance_request_events_reason_chk check (reason is null or char_length(reason) <= 500),
  constraint finance_request_events_external_ref_chk check (external_reference is null or char_length(external_reference) <= 160)
);

create index finance_request_events_request_idx on public.finance_request_events(request_type,request_id,created_at,id);
create index finance_request_events_user_idx on public.finance_request_events(user_id,created_at desc,id desc);
create index finance_request_events_actor_idx on public.finance_request_events(actor_user_id,created_at desc,id desc) where actor_user_id is not null;

alter table public.finance_request_events enable row level security;
revoke all on public.finance_request_events from public,anon,authenticated;

create or replace function private.record_finance_request_event()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_actor_user_id uuid := (select auth.uid());
  v_event_type text;
  v_old_status text;
  v_transaction_id uuid;
  v_reason text;
  v_external_reference text;
begin
  if tg_op = 'INSERT' then
    v_event_type := 'created';
    v_old_status := null;
  else
    if old.status is not distinct from new.status then return new; end if;
    v_event_type := 'status_changed';
    v_old_status := old.status;
  end if;

  if tg_table_name = 'deposit_requests' then
    v_transaction_id := new.ledger_transaction_id;
    v_reason := new.rejection_reason;
    v_external_reference := new.external_reference;
  elsif tg_table_name = 'withdrawal_requests' then
    v_transaction_id := coalesce(new.completion_transaction_id,new.reserve_transaction_id);
    v_reason := coalesce(new.rejection_reason,new.failure_reason);
    v_external_reference := new.external_reference;
  else
    raise exception 'unsupported finance request table';
  end if;

  insert into public.finance_request_events(
    request_type,request_id,user_id,actor_user_id,event_type,old_status,new_status,
    reason,external_reference,transaction_id
  )
  values(
    case when tg_table_name='deposit_requests' then 'deposit' else 'withdrawal' end,
    new.id,new.user_id,v_actor_user_id,v_event_type,v_old_status,new.status,
    nullif(btrim(v_reason),''),nullif(btrim(v_external_reference),''),v_transaction_id
  );
  return new;
end;
$function$;

revoke all on function private.record_finance_request_event() from public,anon,authenticated;

drop trigger if exists trg_finance_request_events_deposit on public.deposit_requests;
create trigger trg_finance_request_events_deposit
after insert or update of status on public.deposit_requests
for each row execute function private.record_finance_request_event();

drop trigger if exists trg_finance_request_events_withdrawal on public.withdrawal_requests;
create trigger trg_finance_request_events_withdrawal
after insert or update of status on public.withdrawal_requests
for each row execute function private.record_finance_request_event();

create or replace function private.get_user_finance_request_events(p_user_id uuid,p_limit integer default 100)
returns table(event_id uuid,request_type text,request_id uuid,event_type text,old_status text,new_status text,reason text,external_reference text,transaction_id uuid,created_at timestamptz)
language sql security definer set search_path=public,pg_temp
as $function$
  select e.id,e.request_type,e.request_id,e.event_type,e.old_status,e.new_status,e.reason,e.external_reference,e.transaction_id,e.created_at
  from public.finance_request_events e
  where e.user_id=p_user_id and p_user_id=(select auth.uid())
  order by e.created_at desc,e.id desc
  limit greatest(1,least(coalesce(p_limit,100),500));
$function$;
revoke all on function private.get_user_finance_request_events(uuid,integer) from public,anon,authenticated;

create or replace function public.get_user_finance_request_events(p_limit integer default 100)
returns table(event_id uuid,request_type text,request_id uuid,event_type text,old_status text,new_status text,reason text,external_reference text,transaction_id uuid,created_at timestamptz)
language sql security invoker set search_path=public,auth,pg_temp
as $function$ select * from private.get_user_finance_request_events((select auth.uid()),p_limit); $function$;
revoke all on function public.get_user_finance_request_events(integer) from public,anon;
grant execute on function public.get_user_finance_request_events(integer) to authenticated;

create or replace function private.get_admin_finance_request_events(p_limit integer default 200)
returns table(event_id uuid,request_type text,request_id uuid,user_id uuid,actor_user_id uuid,event_type text,old_status text,new_status text,reason text,external_reference text,transaction_id uuid,created_at timestamptz)
language sql security definer set search_path=public,pg_temp
as $function$
  select e.id,e.request_type,e.request_id,e.user_id,e.actor_user_id,e.event_type,e.old_status,e.new_status,e.reason,e.external_reference,e.transaction_id,e.created_at
  from public.finance_request_events e
  where (select private.has_admin_permission('finance.read'))
  order by e.created_at desc,e.id desc
  limit greatest(1,least(coalesce(p_limit,200),1000));
$function$;
revoke all on function private.get_admin_finance_request_events(integer) from public,anon,authenticated;

create or replace function public.get_admin_finance_request_events(p_limit integer default 200)
returns table(event_id uuid,request_type text,request_id uuid,user_id uuid,actor_user_id uuid,event_type text,old_status text,new_status text,reason text,external_reference text,transaction_id uuid,created_at timestamptz)
language sql security invoker set search_path=public,auth,pg_temp
as $function$ select * from private.get_admin_finance_request_events(p_limit); $function$;
revoke all on function public.get_admin_finance_request_events(integer) from public,anon;
grant execute on function public.get_admin_finance_request_events(integer) to authenticated;