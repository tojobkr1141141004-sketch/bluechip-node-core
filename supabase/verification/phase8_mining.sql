-- PHASE 8 non-destructive remote verification.

-- Domain tables and RLS.
select
  c.relname as object_name,
  c.relkind,
  c.relrowsecurity,
  c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'mining_products',
    'mining_product_versions',
    'mining_settings',
    'user_mining_products',
    'admin_mining_products',
    'admin_mining_product_versions'
  )
order by c.relname;

-- Application roles have read-only table access; writes are RPC-only.
select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'mining_products',
    'mining_product_versions',
    'mining_settings'
  )
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- Public wrappers stay SECURITY INVOKER.
select
  routine_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'create_mining_product',
    'update_mining_product',
    'create_mining_product_version',
    'publish_mining_product_version',
    'update_mining_settings'
  )
order by routine_name;

-- A product cannot have more than one published version.
select product_id, count(*) as published_versions
from public.mining_product_versions
where status = 'published'
group by product_id
having count(*) > 1;

-- Published versions must carry a publication timestamp.
select count(*) as invalid_published_versions
from public.mining_product_versions
where status = 'published'
  and published_at is null;

-- Archived products must not be public.
select count(*) as invalid_public_archived_products
from public.mining_products
where status = 'archived'
  and is_public;

-- Reward rates/capacities remain within numeric precision constraints.
select count(*) as invalid_version_numbers
from public.mining_product_versions
where reward_per_unit_per_day <= 0
   or reward_per_unit_per_day <> round(reward_per_unit_per_day, 18)
   or min_capacity <= 0
   or min_capacity <> round(min_capacity, 18)
   or (max_capacity is not null and (
        max_capacity < min_capacity
        or max_capacity <> round(max_capacity, 18)
   ));

-- Settings singleton and valid ranges.
select count(*) as invalid_settings_rows
from public.mining_settings
where id <> 1
   or calculation_interval_seconds not between 60 and 86400
   or calculation_timezone <> 'Asia/Seoul'
   or reward_precision not between 0 and 18
   or max_accounts_per_run not between 1 and 100000;

-- No PHASE 8 test product should remain.
select
  (select count(*) from public.mining_products where code like 'P8_TEST%') as test_products,
  (select count(*) from public.mining_product_versions mpv
     join public.mining_products mp on mp.id = mpv.product_id
     where mp.code like 'P8_TEST%') as test_versions;

-- Phase 8 does not create any financial ledger rows.
select
  (select count(*) from public.ledger_transactions) as ledger_transactions,
  (select count(*) from public.ledger_entries) as ledger_entries;