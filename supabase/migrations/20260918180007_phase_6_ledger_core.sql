create table public.ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete restrict,
  transaction_type text not null,
  idempotency_key text not null,
  request_hash text not null,
  reference_type text,
  reference_id text,
  reversal_of_transaction_id uuid references public.ledger_transactions(id) on delete restrict,
  description text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint ledger_transactions_type_chk check (
    transaction_type ~ '^[a-z0-9_]{2,64}$'
  ),
  constraint ledger_transactions_idempotency_key_chk check (
    btrim(idempotency_key) <> '' and char_length(idempotency_key) <= 128
  ),
  constraint ledger_transactions_request_hash_chk check (
    request_hash ~ '^[0-9a-f]{32}$'
  ),
  constraint ledger_transactions_reference_pair_chk check (
    (reference_type is null and reference_id is null)
    or
    (reference_type is not null and btrim(reference_type) <> '' and reference_id is not null and btrim(reference_id) <> '')
  ),
  constraint ledger_transactions_not_self_reversal_chk check (
    reversal_of_transaction_id is null or reversal_of_transaction_id <> id
  ),
  constraint ledger_transactions_description_chk check (
    char_length(description) <= 500
  ),
  constraint ledger_transactions_idempotency_key_key unique (idempotency_key)
);

create unique index ledger_transactions_reference_uidx
  on public.ledger_transactions (reference_type, reference_id)
  where reference_type is not null and reference_id is not null;

create unique index ledger_transactions_reversal_uidx
  on public.ledger_transactions (reversal_of_transaction_id)
  where reversal_of_transaction_id is not null;

create index ledger_transactions_asset_created_idx
  on public.ledger_transactions (asset_id, created_at desc, id desc);

create index ledger_transactions_created_by_idx
  on public.ledger_transactions (created_by, created_at desc, id desc);

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.ledger_transactions(id) on delete restrict,
  account_id uuid not null references public.ledger_accounts(id) on delete restrict,
  asset_id uuid not null references public.assets(id) on delete restrict,
  direction text not null,
  amount numeric(38,18) not null,
  created_at timestamptz not null default now(),
  constraint ledger_entries_direction_chk check (direction in ('debit', 'credit')),
  constraint ledger_entries_amount_chk check (amount > 0 and amount = round(amount, 18))
);

create index ledger_entries_transaction_idx
  on public.ledger_entries (transaction_id, id);

create index ledger_entries_account_created_idx
  on public.ledger_entries (account_id, created_at desc, id desc);

create index ledger_entries_asset_created_idx
  on public.ledger_entries (asset_id, created_at desc, id desc);
