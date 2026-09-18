drop function if exists public.admin_list_members(text, integer, integer);
drop function if exists public.admin_update_member_status(uuid, text);

create table if not exists public.member_directory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.member_directory enable row level security;
revoke all on table public.member_directory from anon, authenticated;
grant select on table public.member_directory to authenticated;

drop policy if exists member_directory_select_admin on public.member_directory;
create policy member_directory_select_admin
  on public.member_directory
  for select
  to authenticated
  using ((select private.has_admin_permission('members.read')));

create index if not exists member_directory_created_at_idx
  on public.member_directory (created_at desc, user_id desc);

create index if not exists member_directory_email_lower_idx
  on public.member_directory (lower(email));

create or replace function private.sync_member_directory_from_auth_users()
returns trigger
language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.member_directory (
    user_id,email,confirmed_at,last_sign_in_at,created_at,updated_at
  )
  values (
    new.id,new.email,new.confirmed_at,new.last_sign_in_at,new.created_at,now()
  )
  on conflict (user_id) do update
  set email=excluded.email,
      confirmed_at=excluded.confirmed_at,
      last_sign_in_at=excluded.last_sign_in_at,
      updated_at=now();
  return new;
end;
$$;

drop trigger if exists sync_member_directory_on_auth_user on auth.users;
create trigger sync_member_directory_on_auth_user
after insert or update of email, confirmed_at, last_sign_in_at
on auth.users for each row
execute function private.sync_member_directory_from_auth_users();

insert into public.member_directory (
  user_id,email,confirmed_at,last_sign_in_at,created_at,updated_at
)
select id,email,confirmed_at,last_sign_in_at,created_at,now()
from auth.users
on conflict (user_id) do update
set email=excluded.email,
    confirmed_at=excluded.confirmed_at,
    last_sign_in_at=excluded.last_sign_in_at,
    updated_at=now();

create or replace view public.admin_member_directory
with (security_invoker = true)
as
select md.user_id as id,md.email,p.display_name,p.username,p.status,p.created_at,
       p.updated_at,md.confirmed_at,md.last_sign_in_at
from public.member_directory md
join public.profiles p on p.id=md.user_id;

grant select on public.admin_member_directory to authenticated;
revoke all on public.admin_member_directory from anon;

create or replace function private.current_profile_status()
returns text
language sql security definer stable
set search_path = public, auth, pg_temp
as $$
  select status from public.profiles where id=(select auth.uid());
$$;

revoke all on function private.current_profile_status() from public, anon, authenticated;
grant execute on function private.current_profile_status() to authenticated;

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles
  for update
  to authenticated
  using (id=(select auth.uid()))
  with check (
    id=(select auth.uid()) and status=(select private.current_profile_status())
  );

drop policy if exists profiles_update_member_admin on public.profiles;
create policy profiles_update_member_admin
  on public.profiles
  for update
  to authenticated
  using (
    id <> (select auth.uid())
    and (select private.has_admin_permission('members.manage'))
  )
  with check (
    id <> (select auth.uid())
    and (select private.has_admin_permission('members.manage'))
  );

grant update (display_name, username, avatar_url, status)
on table public.profiles to authenticated;

create or replace function private.audit_member_status_change()
returns trigger
language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
begin
  if old.status is distinct from new.status then
    insert into public.audit_logs (
      actor_user_id,target_user_id,event_type,action,resource_type,resource_id,metadata
    )
    values (
      (select auth.uid()),new.id,'member','status_changed','profiles',new.id::text,
      jsonb_build_object('from_status',old.status,'to_status',new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_member_status_change on public.profiles;
create trigger audit_member_status_change
after update of status on public.profiles
for each row execute function private.audit_member_status_change();
