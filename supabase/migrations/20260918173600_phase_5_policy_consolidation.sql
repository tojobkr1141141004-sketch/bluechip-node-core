drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_update_member_admin on public.profiles;

create policy profiles_update_self_or_member_admin
  on public.profiles
  for update
  to authenticated
  using (
    id = (select auth.uid())
    or (
      id <> (select auth.uid())
      and (select private.has_admin_permission('members.manage'))
    )
  )
  with check (
    (
      id = (select auth.uid())
      and status = (select private.current_profile_status())
    )
    or (
      id <> (select auth.uid())
      and (select private.has_admin_permission('members.manage'))
    )
  );
