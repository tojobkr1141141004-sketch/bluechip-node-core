-- PHASE 16 — notification storage and RBAC.
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  notification_key text not null unique,
  severity text not null check (severity in ('critical','attention','info')),
  code text not null,
  title text not null,
  message text not null,
  owner_area text not null,
  href text not null,
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  first_seen_at timestamptz not null default clock_timestamp(),
  last_seen_at timestamptz not null default clock_timestamp(),
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  resolved_at timestamptz,
  resolved_by uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create index if not exists admin_notifications_status_idx
  on public.admin_notifications(status, severity, last_seen_at desc);
create index if not exists admin_notifications_area_idx
  on public.admin_notifications(owner_area, status, last_seen_at desc);

create table if not exists public.admin_notification_events (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.admin_notifications(id) on delete cascade,
  event_type text not null check (event_type in ('raised','reopened','acknowledged','resolved')),
  actor_user_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp()
);

create index if not exists admin_notification_events_notification_idx
  on public.admin_notification_events(notification_id, created_at desc);
create index if not exists admin_notification_events_actor_idx
  on public.admin_notification_events(actor_user_id, created_at desc)
  where actor_user_id is not null;

alter table public.admin_notifications enable row level security;
alter table public.admin_notification_events enable row level security;

revoke all on public.admin_notifications from public,anon,authenticated;
revoke all on public.admin_notification_events from public,anon,authenticated;

drop policy if exists admin_notifications_admin_select on public.admin_notifications;
create policy admin_notifications_admin_select
  on public.admin_notifications
  for select to authenticated
  using ((select private.has_admin_permission('notifications.read')));

drop policy if exists admin_notification_events_admin_select on public.admin_notification_events;
create policy admin_notification_events_admin_select
  on public.admin_notification_events
  for select to authenticated
  using ((select private.has_admin_permission('notifications.read')));

insert into public.admin_permissions(code,name,description)
values
  ('notifications.read','운영 알림 조회','운영 장애·경고·이벤트 알림을 조회할 수 있습니다.'),
  ('notifications.manage','운영 알림 처리','운영 알림을 확인 처리하거나 해결 상태로 변경할 수 있습니다.')
on conflict (code) do update set name=excluded.name,description=excluded.description;

insert into public.admin_role_permissions(role_id,permission_id)
select r.id,p.id
from public.admin_roles r
join public.admin_permissions p on p.code in ('notifications.read','notifications.manage')
where r.code in ('super_admin','operations_admin','settlement_admin')
on conflict do nothing;