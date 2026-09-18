alter table public.profiles
  drop constraint if exists profiles_display_name_length_chk,
  drop constraint if exists profiles_username_format_chk;

alter table public.profiles
  add constraint profiles_display_name_length_chk
    check (display_name is null or char_length(display_name) between 1 and 80),
  add constraint profiles_username_format_chk
    check (
      username is null
      or (
        char_length(username) between 3 and 32
        and username ~ '^[a-zA-Z0-9_]+$'
      )
    );

alter table public.user_settings
  drop constraint if exists user_settings_locale_chk,
  drop constraint if exists user_settings_timezone_chk;

alter table public.user_settings
  add constraint user_settings_locale_chk
    check (locale in ('ko-KR', 'en-US')),
  add constraint user_settings_timezone_chk
    check (timezone = 'Asia/Seoul');

create or replace function public.admin_list_members(
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid, email text, display_name text, username text, status text,
  created_at timestamptz, updated_at timestamptz, confirmed_at timestamptz, last_sign_in_at timestamptz
)
language plpgsql security definer stable
set search_path = public, auth, pg_temp
as $$
declare
  normalized_search text := nullif(btrim(p_search), '');
  safe_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  safe_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if not private.has_admin_permission('members.read') then raise exception 'permission denied'; end if;
  return query
  select p.id, u.email::text, p.display_name, p.username, p.status, p.created_at, p.updated_at, u.confirmed_at, u.last_sign_in_at
  from public.profiles p join auth.users u on u.id = p.id
  where normalized_search is null
     or lower(coalesce(u.email, '')) like '%' || lower(normalized_search) || '%'
     or lower(coalesce(p.display_name, '')) like '%' || lower(normalized_search) || '%'
     or lower(coalesce(p.username, '')) like '%' || lower(normalized_search) || '%'
  order by p.created_at desc, p.id desc
  limit safe_limit offset safe_offset;
end;
$$;

create or replace function public.admin_update_member_status(p_user_id uuid, p_status text)
returns table (id uuid, status text, updated_at timestamptz)
language plpgsql security definer volatile
set search_path = public, auth, pg_temp
as $$
declare before_status text;
begin
  if not private.has_admin_permission('members.manage') then raise exception 'permission denied'; end if;
  if p_user_id is null then raise exception 'user id is required'; end if;
  if p_user_id = (select auth.uid()) then raise exception 'cannot change own member status'; end if;
  if p_status not in ('active','suspended','deleted') then raise exception 'invalid member status'; end if;
  select p.status into before_status from public.profiles p where p.id = p_user_id for update;
  if before_status is null then raise exception 'member not found'; end if;
  update public.profiles set status=p_status, updated_at=now() where id=p_user_id;
  insert into public.audit_logs (actor_user_id,target_user_id,event_type,action,resource_type,resource_id,metadata)
  values ((select auth.uid()),p_user_id,'member','status_changed','profiles',p_user_id::text,
          jsonb_build_object('from_status',before_status,'to_status',p_status));
  return query select p.id,p.status,p.updated_at from public.profiles p where p.id=p_user_id;
end;
$$;

revoke all on function public.admin_list_members(text, integer, integer) from public, anon;
grant execute on function public.admin_list_members(text, integer, integer) to authenticated;
revoke all on function public.admin_update_member_status(uuid, text) from public, anon;
grant execute on function public.admin_update_member_status(uuid, text) to authenticated;

create index if not exists profiles_created_at_idx on public.profiles (created_at desc, id desc);
create index if not exists profiles_status_created_at_idx on public.profiles (status, created_at desc, id desc);
