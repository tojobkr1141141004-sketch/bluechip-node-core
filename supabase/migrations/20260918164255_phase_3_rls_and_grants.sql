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

create policy profiles_select_self_or_member_admin on public.profiles for select to authenticated
using (id = (select auth.uid()) or private.has_admin_permission('members.read'));

create policy profiles_insert_self on public.profiles for insert to authenticated
with check (id = (select auth.uid()));

create policy profiles_update_self on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy user_settings_select_self on public.user_settings for select to authenticated
using (user_id = (select auth.uid()));

create policy user_settings_insert_self on public.user_settings for insert to authenticated
with check (user_id = (select auth.uid()));

create policy user_settings_update_self on public.user_settings for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy admin_roles_select on public.admin_roles for select to authenticated
using (private.has_admin_permission('admin.roles.read'));

create policy admin_roles_insert on public.admin_roles for insert to authenticated
with check (private.has_admin_permission('admin.roles.manage'));

create policy admin_roles_update on public.admin_roles for update to authenticated
using (private.has_admin_permission('admin.roles.manage'))
with check (private.has_admin_permission('admin.roles.manage'));

create policy admin_permissions_select on public.admin_permissions for select to authenticated
using (private.has_admin_permission('admin.roles.read'));

create policy admin_role_permissions_select on public.admin_role_permissions for select to authenticated
using (private.has_admin_permission('admin.roles.read'));

create policy admin_role_permissions_insert on public.admin_role_permissions for insert to authenticated
with check (private.has_admin_permission('admin.user_roles.manage'));

create policy admin_role_permissions_delete on public.admin_role_permissions for delete to authenticated
using (private.has_admin_permission('admin.user_roles.manage'));

create policy admin_users_select_self_or_manager on public.admin_users for select to authenticated
using (user_id = (select auth.uid()) or private.has_admin_permission('admin.users.read'));

create policy admin_users_insert on public.admin_users for insert to authenticated
with check (private.has_admin_permission('admin.users.manage'));

create policy admin_users_update on public.admin_users for update to authenticated
using (private.has_admin_permission('admin.users.manage'))
with check (private.has_admin_permission('admin.users.manage'));

create policy admin_user_roles_select_self_or_manager on public.admin_user_roles for select to authenticated
using (user_id = (select auth.uid()) or private.has_admin_permission('admin.roles.read'));

create policy admin_user_roles_insert on public.admin_user_roles for insert to authenticated
with check (private.has_admin_permission('admin.user_roles.manage'));

create policy admin_user_roles_delete on public.admin_user_roles for delete to authenticated
using (private.has_admin_permission('admin.user_roles.manage'));

create policy audit_logs_select on public.audit_logs for select to authenticated
using (private.has_admin_permission('audit.read'));
