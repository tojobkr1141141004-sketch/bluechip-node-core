create table public.assets (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  asset_type text not null,
  decimals smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assets_code_format_chk check (code ~ '^[A-Z0-9]{2,16}$'),
  constraint assets_name_not_blank_chk check (btrim(name) <> ''),
  constraint assets_type_chk check (asset_type in ('fiat', 'crypto')),
  constraint assets_decimals_chk check (decimals between 0 and 18),
  constraint assets_code_key unique (code)
);

create trigger assets_touch_updated_at
before update on public.assets
for each row
execute function private.touch_updated_at();

create table public.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete restrict,
  account_type text not null,
  owner_user_id uuid references auth.users(id) on delete restrict,
  code text,
  name text not null,
  allow_negative boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ledger_accounts_type_chk check (account_type in ('user', 'system')),
  constraint ledger_accounts_name_not_blank_chk check (btrim(name) <> ''),
  constraint ledger_accounts_owner_shape_chk check (
    (account_type = 'user' and owner_user_id is not null and code is null)
    or
    (account_type = 'system' and owner_user_id is null and code is not null and code ~ '^[A-Z0-9_]{2,64}$')
  )
);

create unique index ledger_accounts_user_asset_uidx
  on public.ledger_accounts (owner_user_id, asset_id)
  where account_type = 'user';

create unique index ledger_accounts_system_code_uidx
  on public.ledger_accounts (code)
  where account_type = 'system';

create index ledger_accounts_asset_idx
  on public.ledger_accounts (asset_id);

create index ledger_accounts_owner_idx
  on public.ledger_accounts (owner_user_id, asset_id)
  where account_type = 'user';

create trigger ledger_accounts_touch_updated_at
before update on public.ledger_accounts
for each row
execute function private.touch_updated_at();

create table public.ledger_account_balances (
  account_id uuid primary key references public.ledger_accounts(id) on delete restrict,
  balance numeric(38,18) not null default 0,
  updated_at timestamptz not null default now(),
  constraint ledger_account_balances_precision_chk check (balance = round(balance, 18))
);

create index ledger_account_balances_updated_idx
  on public.ledger_account_balances (updated_at desc);

insert into public.assets (code, name, asset_type, decimals)
values
  ('KRW', '대한민국 원', 'fiat', 0),
  ('USDT', 'Tether USD', 'crypto', 6)
on conflict (code) do update
set name = excluded.name,
    asset_type = excluded.asset_type,
    decimals = excluded.decimals,
    is_active = true,
    updated_at = now();

insert into public.ledger_accounts (asset_id, account_type, code, name, allow_negative)
select a.id, 'system', 'SYSTEM_KRW_SETTLEMENT', 'KRW 정산 대기 계정', true
from public.assets a
where a.code = 'KRW'
on conflict (code) where account_type = 'system' do nothing;

insert into public.ledger_accounts (asset_id, account_type, code, name, allow_negative)
select a.id, 'system', 'SYSTEM_USDT_SETTLEMENT', 'USDT 정산 대기 계정', true
from public.assets a
where a.code = 'USDT'
on conflict (code) where account_type = 'system' do nothing;

insert into public.ledger_account_balances (account_id, balance)
select id, 0
from public.ledger_accounts
where account_type = 'system'
on conflict (account_id) do nothing;
