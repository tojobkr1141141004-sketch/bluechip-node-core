-- PHASE 6 remote verification queries.
-- Run against the linked Supabase project after applying the PHASE 6 migrations.

-- 1. Required financial objects must exist and have RLS enabled.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'assets',
    'ledger_accounts',
    'ledger_account_balances',
    'ledger_transactions',
    'ledger_entries'
  )
order by c.relname;

-- 2. Assets must contain the initial supported currencies with exact precision.
select code, name, asset_type, decimals, is_active
from public.assets
where code in ('KRW', 'USDT')
order by code;

-- 3. Every posted transaction must be double-entry balanced.
select
  lt.id,
  lt.asset_id,
  sum(case when le.direction = 'debit' then le.amount else 0 end) as debit_total,
  sum(case when le.direction = 'credit' then le.amount else 0 end) as credit_total
from public.ledger_transactions lt
join public.ledger_entries le on le.transaction_id = lt.id
group by lt.id, lt.asset_id
having sum(case when le.direction = 'debit' then le.amount else 0 end)
    <> sum(case when le.direction = 'credit' then le.amount else 0 end);

-- 4. Every balance read-model row must equal its ledger-derived balance.
select
  b.account_id,
  b.balance as read_model_balance,
  coalesce(sum(
    case when e.direction = 'credit' then e.amount else -e.amount end
  ), 0) as ledger_derived_balance
from public.ledger_account_balances b
join public.ledger_accounts a on a.id = b.account_id
left join public.ledger_entries e on e.account_id = a.id
group by b.account_id, b.balance
having b.balance <> coalesce(sum(
  case when e.direction = 'credit' then e.amount else -e.amount end
), 0);

-- 5. Ledger mutation must not be granted directly to application roles.
select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'ledger_accounts',
    'ledger_account_balances',
    'ledger_transactions',
    'ledger_entries'
  )
  and grantee in ('anon', 'authenticated')
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
order by table_name, grantee, privilege_type;

-- 6. Public posting/reversal wrappers must be executable only by authenticated.
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'ensure_user_asset_account',
    'post_ledger_transaction',
    'reverse_ledger_transaction'
  )
  and grantee in ('anon', 'authenticated')
order by routine_name, grantee;

-- 7. Reversal uniqueness must be enforced.
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'ledger_transactions_reversal_uidx',
    'ledger_transactions_reference_uidx'
  )
order by indexname;

-- 8. Posting test checklist:
--    A. call ensure_user_asset_account with an authenticated test user.
--    B. post a balanced transaction with one debit + one credit.
--    C. repeat the same idempotency_key with the same request and verify one tx only.
--    D. repeat with the same idempotency_key and a changed payload; it must fail.
--    E. submit an unbalanced pair; it must fail and create no transaction.
--    F. debit a non-negative user account beyond its balance; it must fail and create no transaction.
--    G. reverse the successful transaction; original rows must remain and one reversal tx must exist.
--    H. repeat the reversal with the same idempotency_key; it must not create a second reversal.
