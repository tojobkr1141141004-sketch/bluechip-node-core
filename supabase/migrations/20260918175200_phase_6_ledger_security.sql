alter table public.assets enable row level security;
alter table public.ledger_accounts enable row level security;
alter table public.ledger_account_balances enable row level security;
alter table public.ledger_transactions enable row level security;
alter table public.ledger_entries enable row level security;

revoke all on table public.assets from public, anon, authenticated, service_role;
grant select on table public.assets to authenticated, service_role;

revoke all on table public.ledger_accounts from public, anon, authenticated, service_role;
grant select on table public.ledger_accounts to authenticated, service_role;

revoke all on table public.ledger_account_balances from public, anon, authenticated, service_role;
grant select on table public.ledger_account_balances to authenticated, service_role;

revoke all on table public.ledger_transactions from public, anon, authenticated, service_role;
grant select on table public.ledger_transactions to authenticated, service_role;

revoke all on table public.ledger_entries from public, anon, authenticated, service_role;
grant select on table public.ledger_entries to authenticated, service_role;

drop policy if exists assets_select_active_or_finance_admin on public.assets;
create policy assets_select_active_or_finance_admin
  on public.assets
  for select
  to authenticated
  using (
    is_active
    or (select private.has_admin_permission('finance.read'))
  );

drop policy if exists ledger_accounts_select_owner_or_finance_admin on public.ledger_accounts;
create policy ledger_accounts_select_owner_or_finance_admin
  on public.ledger_accounts
  for select
  to authenticated
  using (
    owner_user_id = (select auth.uid())
    or (select private.has_admin_permission('finance.read'))
  );

drop policy if exists ledger_account_balances_select_owner_or_finance_admin on public.ledger_account_balances;
create policy ledger_account_balances_select_owner_or_finance_admin
  on public.ledger_account_balances
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.ledger_accounts la
      where la.id = ledger_account_balances.account_id
        and (
          la.owner_user_id = (select auth.uid())
          or (select private.has_admin_permission('finance.read'))
        )
    )
  );

drop policy if exists ledger_transactions_select_owner_or_finance_admin on public.ledger_transactions;
create policy ledger_transactions_select_owner_or_finance_admin
  on public.ledger_transactions
  for select
  to authenticated
  using (
    (select private.has_admin_permission('finance.read'))
    or exists (
      select 1
      from public.ledger_entries le
      join public.ledger_accounts la on la.id = le.account_id
      where le.transaction_id = ledger_transactions.id
        and la.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists ledger_entries_select_owner_or_finance_admin on public.ledger_entries;
create policy ledger_entries_select_owner_or_finance_admin
  on public.ledger_entries
  for select
  to authenticated
  using (
    account_id in (
      select la.id
      from public.ledger_accounts la
      where la.owner_user_id = (select auth.uid())
    )
    or (select private.has_admin_permission('finance.read'))
  );

create or replace view public.user_asset_balances
with (security_invoker = true)
as
select
  la.id as account_id,
  la.owner_user_id as user_id,
  a.id as asset_id,
  a.code as asset_code,
  a.name as asset_name,
  a.asset_type,
  a.decimals,
  coalesce(b.balance, 0::numeric) as balance,
  la.is_active,
  la.created_at,
  b.updated_at
from public.ledger_accounts la
join public.assets a on a.id = la.asset_id
left join public.ledger_account_balances b on b.account_id = la.id
where la.account_type = 'user';

grant select on public.user_asset_balances to authenticated, service_role;
revoke all on public.user_asset_balances from anon;

create or replace view public.user_ledger_history
with (security_invoker = true)
as
select
  lt.id as transaction_id,
  lt.asset_id,
  a.code as asset_code,
  a.name as asset_name,
  lt.transaction_type,
  case
    when lt.reversal_of_transaction_id is not null then 'reversal'
    when exists (
      select 1
      from public.ledger_transactions r
      where r.reversal_of_transaction_id = lt.id
    ) then 'reversed'
    else 'posted'
  end as transaction_status,
  lt.description,
  lt.reference_type,
  lt.reference_id,
  lt.reversal_of_transaction_id,
  lt.created_by,
  lt.created_at,
  le.id as entry_id,
  le.account_id,
  la.account_type,
  la.owner_user_id,
  le.direction,
  le.amount,
  le.created_at as entry_created_at
from public.ledger_transactions lt
join public.ledger_entries le on le.transaction_id = lt.id
join public.ledger_accounts la on la.id = le.account_id
join public.assets a on a.id = lt.asset_id;

grant select on public.user_ledger_history to authenticated, service_role;
revoke all on public.user_ledger_history from anon;
