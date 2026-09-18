alter table public.admin_permissions drop constraint admin_permissions_code_format;
alter table public.admin_permissions
  add constraint admin_permissions_code_format
  check (code ~ '^[a-z0-9_]+(\\.[a-z0-9_]+)*$');
