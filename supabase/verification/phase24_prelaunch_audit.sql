-- PHASE 24 — APEX-MATRIX prelaunch audit
-- Read-only verification. This script does not insert/update/delete production data.
-- Expected current-state preconditions:
--   * all public tables have RLS enabled
--   * no public SECURITY DEFINER function is executable by PUBLIC
--   * ledger materialized balances equal ledger entry sums
--   * no live financial/mining operational rows exist before launch configuration
--   * mining calculation remains disabled
--   * issuance remains disabled
--   * Cron jobs are active and have no recent failures

select
  (select count(*) = 0
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity) as all_public_tables_rls_enabled,

  (select count(*) = 0
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and coalesce(array_to_string(p.proacl, ','), '') like '%=X%') as no_public_security_definer_execute,

  (select count(*) = 0
     from (
       select a.id, coalesce(b.balance, 0)::numeric materialized_balance,
              coalesce(sum(e.amount), 0)::numeric entry_sum
         from public.ledger_accounts a
         left join public.ledger_account_balances b on b.account_id = a.id
         left join public.ledger_entries e on e.account_id = a.id
        group by a.id, b.balance
     ) x
    where x.materialized_balance <> x.entry_sum) as ledger_balances_match_entries,

  ((select count(*) from public.ledger_transactions) = 0
   and (select count(*) from public.ledger_entries) = 0
   and (select count(*) from public.deposit_requests) = 0
   and (select count(*) from public.withdrawal_requests) = 0
   and (select count(*) from public.mining_contracts) = 0
   and (select count(*) from public.mining_calculation_runs) = 0
   and (select count(*) from public.mining_reward_accruals) = 0
   and (select count(*) from public.mining_reward_payments) = 0) as operational_data_clean,

  (select calculation_enabled = false
     from public.mining_settings
    where id = 1) as mining_calculation_disabled,

  (select count(*) = 0
     from public.mining_issuance_policies
    where issuance_enabled) as issuance_disabled,

  (select count(*) = 0
     from cron.job_run_details
    where start_time > now() - interval '24 hours'
      and status <> 'succeeded') as cron_24h_failure_free,

  (select count(*) = 0
     from public.mining_calculation_errors
    where resolved_at is null) as unresolved_mining_errors,

  (select count(*) = 0
     from public.admin_notifications
    where status = 'open') as open_admin_notifications;

-- Supporting snapshot
select
  (select count(*) from public.profiles) as profiles_count,
  (select count(*) from public.assets) as asset_count,
  (select count(*) from public.ledger_accounts) as ledger_accounts_count,
  (select calculation_enabled from public.mining_settings where id = 1) as calculation_enabled,
  (select calculation_interval_seconds from public.mining_settings where id = 1) as calculation_interval_seconds,
  (select count(*) from public.mining_products) as mining_products_count,
  (select count(*) from public.mining_product_versions where status = 'published') as published_mining_versions_count,
  (select count(*) from public.mining_issuance_policies where issuance_enabled) as issuance_enabled_count,
  (select count(*) from public.user_notifications) as user_notifications_count;

-- Cron snapshot
select jobid, jobname, schedule, active, command
  from cron.job
 order by jobid;
