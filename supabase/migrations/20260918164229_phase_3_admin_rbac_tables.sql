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
  constraint admin_permissions_code_format check (code ~ '^[a-z0-9_]+(\\.[a-z0-9_]+)*$')
);
create table public.admin_role_permissions (
  role_id uuid not null references public.admin_roles(id) on delete cascade,
  permission_id uuid not null references public.admin_permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);
create index admin_role_permissions_permission_idx on public.admin_role_permissions (permission_id);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active'
    constraint admin_users_status_check check (status in ('active','disabled')),
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
