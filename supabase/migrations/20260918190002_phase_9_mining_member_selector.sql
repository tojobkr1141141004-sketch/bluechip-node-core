
-- Mining-only member selector: settlement operators need member selection
-- without receiving the broader members.read permission.
create or replace function private.get_mining_member_candidates()
returns table (
  user_id uuid,
  email text,
  display_name text,
  username text,
  status text
)
language sql
security definer
stable
set search_path = public, auth, pg_temp
as $function$
  select
    p.id,
    md.email,
    p.display_name,
    p.username,
    p.status
  from public.profiles p
  left join public.member_directory md on md.user_id = p.id
  where p.status = 'active'
    and private.has_admin_permission('mining.read')
  order by p.created_at desc, p.id asc
  limit 500;
$function$;

revoke all on function private.get_mining_member_candidates() from public, anon, authenticated;

create or replace function public.get_mining_member_candidates()
returns table (
  user_id uuid,
  email text,
  display_name text,
  username text,
  status text
)
language sql
security invoker
stable
set search_path = public, auth, pg_temp
as $function$
  select * from private.get_mining_member_candidates();
$function$;

revoke all on function public.get_mining_member_candidates() from public, anon;
grant execute on function public.get_mining_member_candidates() to authenticated;
