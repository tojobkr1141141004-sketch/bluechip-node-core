create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text,
  avatar_url text,
  status text not null default 'active'
    constraint profiles_status_check check (status in ('active','suspended','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_username_unique_idx on public.profiles (lower(username)) where username is not null;
create index profiles_status_idx on public.profiles (status);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'ko-KR',
  timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
