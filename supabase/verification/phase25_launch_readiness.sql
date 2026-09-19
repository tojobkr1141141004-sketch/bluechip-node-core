-- PHASE 25 — launch readiness verification
-- Read-only. No financial, mining, auth, or configuration data is modified.

select json_build_object(
  'public_tables_without_rls',
    (select count(*)
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and not c.relrowsecurity),

  'ledger_balance_mismatches',
    (select count(*)
       from (
         select a.id,
                coalesce(b.balance, 0)::numeric as materialized_balance,
                coalesce(sum(e.amount), 0)::numeric as entry_sum
           from public.ledger_accounts a
           left join public.ledger_account_balances b on b.account_id = a.id
           left join public.ledger_entries e on e.account_id = a.id
          group by a.id, b.balance
       ) x
      where x.materialized_balance <> x.entry_sum),

  'mining_calculation_enabled',
    (select calculation_enabled from public.mining_settings where id = 1),

  'issuance_enabled_assets',
    (select count(*)
       from public.mining_issuance_policies
      where issuance_enabled),

  'published_public_active_products',
    (select count(distinct v.product_id)
       from public.mining_product_versions v
       join public.mining_products p on p.id = v.product_id
      where v.status = 'published'
        and p.status = 'active'
        and p.is_public = true),

  'open_mining_errors',
    (select count(*)
       from public.mining_calculation_errors
      where resolved_at is null),

  'open_admin_notifications',
    (select count(*)
       from public.admin_notifications
      where status = 'open'),

  'stale_processing_deposits',
    (select count(*)
       from public.deposit_requests
      where status = 'processing'
        and created_at < now() - interval '1 hour'),

  'stale_processing_withdrawals',
    (select count(*)
       from public.withdrawal_requests
      where status = 'processing'
        and created_at < now() - interval '1 hour')
) as phase25_readiness_audit;
