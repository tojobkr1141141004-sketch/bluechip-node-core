-- PHASE 22: USER notification center.
-- Notifications are user-facing records only; financial truth remains in Ledger.
-- A mining contract INSERT creates one durable user notification in the same transaction.

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  notification_key text not null,
  notification_type text not null,
  title text not null,
  message text not null,
  href text not null default '/dashboard',
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_notifications_notification_key_length_chk
    check (char_length(notification_key) between 1 and 160),
  constraint user_notifications_title_length_chk
    check (char_length(title) between 1 and 200),
  constraint user_notifications_message_length_chk
    check (char_length(message) between 1 and 2000),
  constraint user_notifications_href_chk
    check (href like '/dashboard%')
);

create unique index if not exists user_notifications_user_key_uidx
  on public.user_notifications(user_id, notification_key);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications(user_id, created_at desc);

create index if not exists user_notifications_user_unread_idx
  on public.user_notifications(user_id, created_at desc)
  where read_at is null;

alter table public.user_notifications enable row level security;

drop policy if exists "user_notifications_select_own" on public.user_notifications;
create policy "user_notifications_select_own"
  on public.user_notifications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.user_notifications from public, anon, authenticated;
grant select on table public.user_notifications to authenticated;

create or replace function private.create_user_notification(
  p_user_id uuid,
  p_notification_key text,
  p_notification_type text,
  p_title text,
  p_message text,
  p_href text default '/dashboard',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $function$
declare
  v_id uuid;
begin
  if p_user_id is null
     or p_notification_key is null
     or btrim(p_notification_key) = ''
     or p_notification_type is null
     or btrim(p_notification_type) = ''
     or p_title is null
     or btrim(p_title) = ''
     or p_message is null
     or btrim(p_message) = '' then
    raise exception 'invalid user notification input';
  end if;

  if p_href is null
     or p_href = ''
     or p_href not like '/dashboard%' then
    raise exception 'invalid user notification href';
  end if;

  insert into public.user_notifications(
    user_id, notification_key, notification_type, title, message, href, metadata
  )
  values (
    p_user_id, p_notification_key, p_notification_type, p_title, p_message, p_href,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id, notification_key) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id
    from public.user_notifications
    where user_id = p_user_id
      and notification_key = p_notification_key;
  end if;

  return v_id;
end;
$function$;

revoke all on function private.create_user_notification(uuid, text, text, text, text, text, jsonb)
  from public, anon, authenticated;

create or replace function private.mark_my_notification_read(
  p_actor_user_id uuid,
  p_notification_id uuid
)
returns integer
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $function$
declare
  v_changed integer;
begin
  if p_actor_user_id is null or p_actor_user_id <> (select auth.uid()) then
    raise exception 'invalid actor';
  end if;

  update public.user_notifications
     set read_at = coalesce(read_at, clock_timestamp()),
         updated_at = clock_timestamp()
   where id = p_notification_id
     and user_id = p_actor_user_id;

  get diagnostics v_changed = row_count;
  return v_changed;
end;
$function$;

revoke all on function private.mark_my_notification_read(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.mark_my_notification_read(p_notification_id uuid)
returns integer
language sql
security invoker
volatile
set search_path = public, auth, pg_temp
as $function$
  select private.mark_my_notification_read((select auth.uid()), p_notification_id);
$function$;

revoke all on function public.mark_my_notification_read(uuid)
  from public, anon;
grant execute on function public.mark_my_notification_read(uuid) to authenticated;

create or replace function private.mark_all_my_notifications_read(p_actor_user_id uuid)
returns integer
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $function$
declare
  v_changed integer;
begin
  if p_actor_user_id is null or p_actor_user_id <> (select auth.uid()) then
    raise exception 'invalid actor';
  end if;

  update public.user_notifications
     set read_at = clock_timestamp(),
         updated_at = clock_timestamp()
   where user_id = p_actor_user_id
     and read_at is null;

  get diagnostics v_changed = row_count;
  return v_changed;
end;
$function$;

revoke all on function private.mark_all_my_notifications_read(uuid)
  from public, anon, authenticated;

create or replace function public.mark_all_my_notifications_read()
returns integer
language sql
security invoker
volatile
set search_path = public, auth, pg_temp
as $function$
  select private.mark_all_my_notifications_read((select auth.uid()));
$function$;

revoke all on function public.mark_all_my_notifications_read()
  from public, anon;
grant execute on function public.mark_all_my_notifications_read() to authenticated;

create or replace function private.notify_mining_contract_started()
returns trigger
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $function$
begin
  perform private.create_user_notification(
    new.user_id,
    'mining-contract-started:' || new.id::text,
    'mining_contract_started',
    '⛏️ 채굴이 시작되었습니다',
    '채굴 계약이 정상적으로 시작되었습니다. 채굴 현황에서 계약과 보상 기록을 확인할 수 있습니다.',
    '/dashboard/mining',
    jsonb_build_object(
      'contract_id', new.id,
      'product_id', new.product_id,
      'product_version_id', new.product_version_id
    )
  );
  return new;
end;
$function$;

revoke all on function private.notify_mining_contract_started()
  from public, anon, authenticated;

drop trigger if exists mining_contract_started_user_notification
  on public.mining_contracts;

create trigger mining_contract_started_user_notification
  after insert on public.mining_contracts
  for each row
  when (new.status = 'active')
  execute function private.notify_mining_contract_started();
