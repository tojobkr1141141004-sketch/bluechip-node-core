-- PHASE 3: Auth, user profile, admin RBAC, and audit foundation.
-- Authorization is derived from database tables, never user-editable raw_user_meta_data.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text,
  avatar_url text,
  status text not null default 'active'
    constraint profiles_status_check check (status in ('active', 'suspended', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Application profile extension of auth.users. Authorization never depends on user-editable metadata.';
comment on column public.profiles.status is
  'System-controlled account status. End users cannot change this field.';

create unique index profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;
create index profiles_status_idx on public.profiles (status);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'ko-KR',
  timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  constraint admin_roles_code_format check (code ~ '^[a-z0-9_]+$')
);

create table public.admin_permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  constraint admin_permissions_code_format check (code ~ '^[a-z0-9_]+$')
);

create table public.admin_role_permissions (
  role_id uuid not null references public.admin_roles(id) on delete cascade,
  permission_id uuid not null references public.admin_permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create index admin_role_permissions_permission_idx
  on public.admin_role_permissions (permission_id);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active'
    constraint admin_users_status_check check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index admin_users_status_idx on public.admin_users (status);

create table public.admin_user_roles (
  user_id uuid not null references public.admin_users(user_id) on delete cascade,
  role_id uuid not null references public.admin_roles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create index admin_user_roles_role_idx on public.admin_user_roles (role_id);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  action text not null,
  resource_type text,
  resource_id text,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_created_idx
  on public.audit_logs (actor_user_id, created_at desc);
create index audit_logs_target_created_idx
  on public.audit_logs (target_user_id, created_at desc);
create index audit_logs_event_created_idx
  on public.audit_logs (event_type, created_at desc);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.touch_updated_at();

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function private.touch_updated_at();

create trigger admin_users_set_updated_at
before update on public.admin_users
for each row execute function private.touch_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', '')
    )
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.has_admin_permission(required_permission text)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.admin_users au
      join public.admin_user_roles aur on aur.user_id = au.user_id
      join public.admin_role_permissions arp on arp.role_id = aur.role_id
      join public.admin_permissions ap on ap.id = arp.permission_id
      where au.user_id = (select auth.uid())
        and au.status = 'active'
        and ap.code = required_permission
    );
$$;

revoke all on function private.has_admin_permission(text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.has_admin_permission(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.admin_roles enable row level security;
alter table public.admin_permissions enable row level security;
alter table public.admin_role_permissions enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_user_roles enable row level security;
alter table public.audit_logs enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant insert (id, display_name, username, avatar_url) on table public.profiles to authenticated;
grant update (display_name, username, avatar_url) on table public.profiles to authenticated;

revoke all on table public.user_settings from anon, authenticated;
grant select on table public.user_settings to authenticated;
grant insert (user_id, locale, timezone) on table public.user_settings to authenticated;
grant update (locale, timezone) on table public.user_settings to authenticated;

revoke all on table public.admin_roles from anon, authenticated;
grant select, insert, update on table public.admin_roles to authenticated;

revoke all on table public.admin_permissions from anon, authenticated;
grant select on table public.admin_permissions to authenticated;

revoke all on table public.admin_role_permissions from anon, authenticated;
grant select, insert, delete on table public.admin_role_permissions to authenticated;

revoke all on table public.admin_users from anon, authenticated;
grant select, insert, update on table public.admin_users to authenticated;

revoke all on table public.admin_user_roles from anon, authenticated;
grant select, insert, delete on table public.admin_user_roles to authenticated;

revoke all on table public.audit_logs from anon, authenticated;
grant select on table public.audit_logs to authenticated;

create policy profiles_select_self_or_member_admin
on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or private.has_admin_permission('members.read')
);

create policy profiles_insert_self
on public.profiles
for insert to authenticated
with check (id = (select auth.uid()));

create policy profiles_update_self
on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy user_settings_select_self
on public.user_settings
for select to authenticated
using (user_id = (select auth.uid()));

create policy user_settings_insert_self
on public.user_settings
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy user_settings_update_self
on public.user_settings
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy admin_roles_select
on public.admin_roles
for select to authenticated
using (private.has_admin_permission('admin.roles.read'));

create policy admin_roles_insert
on public.admin_roles
for insert to authenticated
with check (private.has_admin_permission('admin.roles.manage'));

create policy admin_roles_update
on public.admin_roles
for update to authenticated
using (private.has_admin_permission('admin.roles.manage'))
with check (private.has_admin_permission('admin.roles.manage'));

create policy admin_permissions_select
on public.admin_permissions
for select to authenticated
using (private.has_admin_permission('admin.roles.read'));

create policy admin_role_permissions_select
on public.admin_role_permissions
for select to authenticated
using (private.has_admin_permission('admin.roles.read'));

create policy admin_role_permissions_insert
on public.admin_role_permissions
for insert to authenticated
with check (private.has_admin_permission('admin.user_roles.manage'));

create policy admin_role_permissions_delete
on public.admin_role_permissions
for delete to authenticated
using (private.has_admin_permission('admin.user_roles.manage'));

create policy admin_users_select_self_or_manager
on public.admin_users
for select to authenticated
using (
  user_id = (select auth.uid())
  or private.has_admin_permission('admin.users.read')
);

create policy admin_users_insert
on public.admin_users
for insert to authenticated
with check (private.has_admin_permission('admin.users.manage'));

create policy admin_users_update
on public.admin_users
for update to authenticated
using (private.has_admin_permission('admin.users.manage'))
with check (private.has_admin_permission('admin.users.manage'));

create policy admin_user_roles_select_self_or_manager
on public.admin_user_roles
for select to authenticated
using (
  user_id = (select auth.uid())
  or private.has_admin_permission('admin.roles.read')
);

create policy admin_user_roles_insert
on public.admin_user_roles
for insert to authenticated
with check (private.has_admin_permission('admin.user_roles.manage'));

create policy admin_user_roles_delete
on public.admin_user_roles
for delete to authenticated
using (private.has_admin_permission('admin.user_roles.manage'));

create policy audit_logs_select
on public.audit_logs
for select to authenticated
using (private.has_admin_permission('audit.read'));

insert into public.admin_roles (code, name, description, is_system)
values
  ('super_admin', '최고 관리자', '전체 시스템과 권한을 관리합니다.', true),
  ('operations_admin', '운영 관리자', '회원 및 일반 운영 업무를 관리합니다.', true),
  ('settlement_admin', '정산 관리자', '금융·정산 관련 운영 업무를 관리합니다.', true),
  ('content_admin', '콘텐츠 관리자', '공지·배너 등 콘텐츠 운영을 관리합니다.', true)
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    is_system = excluded.is_system;

insert into public.admin_permissions (code, name, description)
values
  ('admin.access', 'Admin 접근', 'Admin 앱에 로그인하고 운영 영역에 접근할 수 있습니다.'),
  ('admin.users.read', '운영자 조회', '운영자 계정 정보를 조회할 수 있습니다.'),
  ('admin.users.manage', '운영자 관리', '운영자 계정을 활성화·비활성화할 수 있습니다.'),
  ('admin.roles.read', '역할 조회', '관리자 역할과 권한 구성을 조회할 수 있습니다.'),
  ('admin.roles.manage', '역할 관리', '관리자 역할 정의를 변경할 수 있습니다.'),
  ('admin.user_roles.manage', '역할 배정', '운영자에게 역할을 부여하거나 제거할 수 있습니다.'),
  ('members.read', '회원 조회', '회원 프로필을 조회할 수 있습니다.'),
  ('members.manage', '회원 관리', '회원 관리 작업을 수행할 수 있습니다.'),
  ('audit.read', '운영 기록 조회', '감사 로그를 조회할 수 있습니다.'),
  ('finance.read', '금융 조회', '금융 관련 운영 정보를 조회할 수 있습니다.'),
  ('finance.manage', '금융 처리', '금융 관련 운영 작업을 처리할 수 있습니다.'),
  ('content.read', '콘텐츠 조회', '콘텐츠 운영 정보를 조회할 수 있습니다.'),
  ('content.manage', '콘텐츠 관리', '콘텐츠 운영 정보를 변경할 수 있습니다.')
on conflict (code) do update
set name = excluded.name, description = excluded.description;

with role_permissions(role_code, permission_code) as (
  values
    ('super_admin', 'admin.access'),
    ('super_admin', 'admin.users.read'),
    ('super_admin', 'admin.users.manage'),
    ('super_admin', 'admin.roles.read'),
    ('super_admin', 'admin.roles.manage'),
    ('super_admin', 'admin.user_roles.manage'),
    ('super_admin', 'members.read'),
    ('super_admin', 'members.manage'),
    ('super_admin', 'audit.read'),
    ('super_admin', 'finance.read'),
    ('super_admin', 'finance.manage'),
    ('super_admin', 'content.read'),
    ('super_admin', 'content.manage'),
    ('operations_admin', 'admin.access'),
    ('operations_admin', 'members.read'),
    ('operations_admin', 'members.manage'),
    ('operations_admin', 'audit.read'),
    ('settlement_admin', 'admin.access'),
    ('settlement_admin', 'finance.read'),
    ('settlement_admin', 'finance.manage'),
    ('content_admin', 'admin.access'),
    ('content_admin', 'content.read'),
    ('content_admin', 'content.manage')
)
insert into public.admin_role_permissions (role_id, permission_id)
select r.id, p.id
from role_permissions rp
join public.admin_roles r on r.code = rp.role_code
join public.admin_permissions p on p.code = rp.permission_code
on conflict (role_id, permission_id) do nothing;
