-- PHASE 17 — authentication / admin session security verification.
select jsonb_build_object(
  'admin_session_fn_exists',to_regprocedure('private.is_recent_admin_session(integer)') is not null,
  'admin_require_recent_fn_exists',to_regprocedure('private.require_recent_admin_session(integer)') is not null,
  'admin_permission_fn_exists',to_regprocedure('private.has_admin_permission(text)') is not null,
  'public_status_fn_exists',to_regprocedure('public.get_admin_session_security_status()') is not null,
  'anonymous_recent_session',private.is_recent_admin_session(),
  'anonymous_status',(select public.get_admin_session_security_status()),
  'anon_status_execute',has_function_privilege('anon','public.get_admin_session_security_status()','EXECUTE'),
  'authenticated_status_execute',has_function_privilege('authenticated','public.get_admin_session_security_status()','EXECUTE'),
  'anon_direct_admin_users_select',has_table_privilege('anon','public.admin_users','SELECT'),
  'auth_direct_admin_users_insert',has_table_privilege('authenticated','public.admin_users','INSERT'),
  'anon_direct_admin_roles_update',has_table_privilege('anon','public.admin_roles','UPDATE'),
  'security_gate_function_execute',has_function_privilege('authenticated','private.require_recent_admin_session(integer)','EXECUTE'),
  'users',(select count(*) from auth.users),
  'admin_users',(select count(*) from public.admin_users),
  'unbalanced_ledger',(select count(*) from (
    select lt.id
    from public.ledger_transactions lt
    join public.ledger_entries le on le.transaction_id=lt.id
    group by lt.id
    having coalesce(sum(case when le.direction='debit' then le.amount else 0 end),0)
      <> coalesce(sum(case when le.direction='credit' then le.amount else 0 end),0)
  ) q),
  'open_notifications',(select count(*) from public.admin_notifications where status in ('open','acknowledged')),
  'calculation_enabled',(select calculation_enabled from public.mining_settings where id=1)
) as phase17_verification;