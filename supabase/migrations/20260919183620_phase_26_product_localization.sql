-- PHASE 26: product category and KO/JA/EN content.
-- Existing financial calculation and contract snapshots remain unchanged.

alter table public.mining_products
  add column category text not null default 'crypto';

alter table public.mining_products
  add constraint mining_products_category_chk
  check (category in ('stock', 'crypto', 'gold', 'silver'));

create index mining_products_category_status_idx
  on public.mining_products (category, status, is_public, sort_order);

create table public.mining_product_localizations (
  product_id uuid not null references public.mining_products(id) on delete cascade,
  locale text not null,
  name text not null,
  description text not null default '',
  risk_notice text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, locale),
  constraint mining_product_localizations_locale_chk
    check (locale in ('ko', 'ja', 'en')),
  constraint mining_product_localizations_name_chk
    check (char_length(btrim(name)) between 1 and 120),
  constraint mining_product_localizations_description_chk
    check (char_length(description) <= 2000),
  constraint mining_product_localizations_risk_notice_chk
    check (char_length(risk_notice) <= 1000)
);

create index mining_product_localizations_locale_idx
  on public.mining_product_localizations (locale, product_id);

create trigger mining_product_localizations_touch_updated_at
before update on public.mining_product_localizations
for each row
execute function private.touch_updated_at();

alter table public.mining_product_localizations enable row level security;

revoke all on table public.mining_product_localizations
  from public, anon, authenticated, service_role;
grant select on table public.mining_product_localizations to authenticated;

create policy mining_product_localizations_select_policy
  on public.mining_product_localizations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.mining_products mp
      where mp.id = product_id
        and (
          (mp.status = 'active' and mp.is_public)
          or (select private.has_admin_permission('mining.read'))
        )
    )
  );

create or replace function private.validate_mining_product_publishability()
returns trigger
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_locale_count integer;
begin
  if new.is_public then
    select count(distinct locale)
    into v_locale_count
    from public.mining_product_localizations
    where product_id = new.id
      and locale in ('ko', 'ja', 'en');

    if v_locale_count <> 3 then
      raise exception 'public product requires ko, ja, and en content';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.validate_mining_product_publishability()
  from public, anon, authenticated;

create trigger mining_products_validate_publishability
before insert or update of is_public on public.mining_products
for each row
execute function private.validate_mining_product_publishability();

create or replace function private.upsert_mining_product_localization(
  p_product_id uuid,
  p_category text,
  p_locale text,
  p_name text,
  p_description text default '',
  p_risk_notice text default ''
)
returns void
language plpgsql
security definer
volatile
set search_path = public, private, auth, pg_temp
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := coalesce(p_description, '');
  v_risk_notice text := coalesce(p_risk_notice, '');
begin
  if not private.has_admin_permission('mining.manage') then
    raise exception 'permission denied';
  end if;

  if p_product_id is null then
    raise exception 'product id is required';
  end if;
  if p_category not in ('stock', 'crypto', 'gold', 'silver') then
    raise exception 'invalid product category';
  end if;
  if p_locale not in ('ko', 'ja', 'en') then
    raise exception 'invalid locale';
  end if;
  if char_length(v_name) not between 1 and 120 then
    raise exception 'invalid localized product name';
  end if;
  if char_length(v_description) > 2000 then
    raise exception 'localized description too long';
  end if;
  if char_length(v_risk_notice) > 1000 then
    raise exception 'localized risk notice too long';
  end if;

  update public.mining_products
  set category = p_category,
      updated_at = now()
  where id = p_product_id;

  if not found then
    raise exception 'mining product not found';
  end if;

  insert into public.mining_product_localizations (
    product_id,
    locale,
    name,
    description,
    risk_notice
  ) values (
    p_product_id,
    p_locale,
    v_name,
    v_description,
    v_risk_notice
  )
  on conflict (product_id, locale) do update
  set name = excluded.name,
      description = excluded.description,
      risk_notice = excluded.risk_notice,
      updated_at = now();

  perform private.write_finance_audit(
    (select auth.uid()),
    null,
    'mining_product_localization_upserted',
    'mining_product',
    p_product_id::text,
    jsonb_build_object('category', p_category, 'locale', p_locale)
  );
end;
$$;

create or replace function public.upsert_mining_product_localization(
  p_product_id uuid,
  p_category text,
  p_locale text,
  p_name text,
  p_description text default '',
  p_risk_notice text default ''
)
returns void
language sql
security invoker
set search_path = public, private, auth, pg_temp
as $$
  select private.upsert_mining_product_localization(
    p_product_id,
    p_category,
    p_locale,
    p_name,
    p_description,
    p_risk_notice
  );
$$;

revoke all on function private.upsert_mining_product_localization(
  uuid, text, text, text, text, text
) from public, anon;
grant execute on function private.upsert_mining_product_localization(
  uuid, text, text, text, text, text
) to authenticated;

revoke all on function public.upsert_mining_product_localization(
  uuid, text, text, text, text, text
) from public, anon;
grant execute on function public.upsert_mining_product_localization(
  uuid, text, text, text, text, text
) to authenticated;

create or replace view public.user_mining_products_i18n
with (security_invoker = true)
as
select
  ump.*,
  mp.category as product_category,
  mpl.locale,
  coalesce(mpl.name, ump.product_name) as localized_product_name,
  coalesce(mpl.description, ump.description) as localized_description,
  coalesce(mpl.risk_notice, '') as localized_risk_notice
from public.user_mining_products ump
join public.mining_products mp on mp.id = ump.product_id
join public.mining_product_localizations mpl on mpl.product_id = ump.product_id;

grant select on public.user_mining_products_i18n to authenticated;
revoke all on public.user_mining_products_i18n from anon;

create or replace view public.admin_mining_product_localizations
with (security_invoker = true)
as
select
  mp.id as product_id,
  mp.code as product_code,
  mp.category as product_category,
  mpl.locale,
  mpl.name,
  mpl.description,
  mpl.risk_notice,
  mpl.created_at,
  mpl.updated_at
from public.mining_products mp
left join public.mining_product_localizations mpl on mpl.product_id = mp.id;

grant select on public.admin_mining_product_localizations to authenticated;
revoke all on public.admin_mining_product_localizations from anon;
