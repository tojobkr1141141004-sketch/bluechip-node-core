-- PHASE 14 non-destructive verification.
select
  to_regclass('public.finance_request_events') as event_table,
  (select count(*) from public.finance_request_events) as event_rows,
  (select count(*) from pg_trigger where tgrelid='public.deposit_requests'::regclass and tgname='trg_finance_request_events_deposit' and not tgisinternal) as deposit_trigger,
  (select count(*) from pg_trigger where tgrelid='public.withdrawal_requests'::regclass and tgname='trg_finance_request_events_withdrawal' and not tgisinternal) as withdrawal_trigger,
  (select count(*) from pg_policies where schemaname='public' and tablename='finance_request_events' and policyname='finance_request_events_admin_select') as admin_rls_policy,
  (select count(*) from pg_indexes where schemaname='public' and tablename='finance_request_events' and indexname='finance_request_events_transaction_idx') as transaction_index,
  has_table_privilege('authenticated','public.finance_request_events','SELECT') as auth_select_event,
  has_table_privilege('authenticated','public.finance_request_events','INSERT') as auth_insert_event,
  has_table_privilege('authenticated','public.finance_request_events','UPDATE') as auth_update_event,
  has_table_privilege('authenticated','public.finance_request_events','DELETE') as auth_delete_event,
  has_function_privilege('authenticated','public.get_user_finance_request_events(integer)','EXECUTE') as auth_user_fn,
  has_function_privilege('authenticated','public.get_admin_finance_request_events(integer)','EXECUTE') as auth_admin_fn;