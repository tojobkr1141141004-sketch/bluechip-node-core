insert into public.admin_permissions (code, name, description)
values
  ('mining.read', '채굴 설정 조회', '채굴 상품과 채굴 설정을 조회할 수 있습니다.'),
  ('mining.manage', '채굴 설정 관리', '채굴 상품과 채굴 설정을 생성·변경·발행할 수 있습니다.')
on conflict (code) do update
set name = excluded.name,
    description = excluded.description;

insert into public.admin_role_permissions (role_id, permission_id)
select r.id, p.id
from public.admin_roles r
join public.admin_permissions p on p.code in ('mining.read', 'mining.manage')
where r.code in ('super_admin', 'settlement_admin')
on conflict (role_id, permission_id) do nothing;

create table public.mining_products (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text not null default '',
  status text not null default 'draft',
  is_public boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mining_products_code_unique unique (code),
  constraint mining_products_code_chk check (
    code ~ '^[A-Z0-9][A-Z0-9_-]{2,63}$'
  ),
  constraint mining_products_name_chk check (
    char_length(btrim(name)) between 1 and 120
  ),
  constraint mining_products_description_chk check (
    char_length(description) <= 2000
  ),
  constraint mining_products_status_chk check (
    status in ('draft', 'active', 'paused', 'archived')
  ),
  constraint mining_products_sort_order_chk check (
    sort_order between 0 and 100000
  ),
  constraint mining_products_public_shape_chk check (
    (is_public = true and status = 'active') or is_public = false
  )
);

create index mining_products_status_sort_idx
  on public.mining_products (status, is_public, sort_order, created_at desc);

create trigger mining_products_touch_updated_at
before update on public.mining_products
for each row
execute function private.touch_updated_at();

create table public.mining_product_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.mining_products(id) on delete restrict,
  version integer not null,
  reward_asset_id uuid not null references public.assets(id) on delete restrict,
  capacity_unit text not null,
  reward_per_unit_per_day numeric(38,18) not null,
  min_capacity numeric(38,18) not null,
  max_capacity numeric(38,18),
  term_days integer not null default 1,
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid,
  constraint mining_product_versions_unique_version unique (product_id, version),
  constraint mining_product_versions_reward_chk check (
    reward_per_unit_per_day > 0
    and reward_per_unit_per_day = round(reward_per_unit_per_day, 18)
  ),
  constraint mining_product_versions_min_capacity_chk check (
    min_capacity > 0
    and min_capacity = round(min_capacity, 18)
  ),
  constraint mining_product_versions_max_capacity_chk check (
    max_capacity is null
    or (
      max_capacity >= min_capacity
      and max_capacity = round(max_capacity, 18)
    )
  ),
  constraint mining_product_versions_unit_chk check (
    char_length(btrim(capacity_unit)) between 1 and 32
  ),
  constraint mining_product_versions_term_chk check (
    term_days between 1 and 3650
  ),
  constraint mining_product_versions_status_chk check (
    status in ('draft', 'published', 'retired')
  ),
  constraint mining_product_versions_published_shape_chk check (
    (status = 'published' and published_at is not null)
    or status <> 'published'
  )
);

create unique index mining_product_versions_one_published_idx
  on public.mining_product_versions (product_id)
  where status = 'published';

create index mining_product_versions_product_idx
  on public.mining_product_versions (product_id, version desc);

create index mining_product_versions_asset_idx
  on public.mining_product_versions (reward_asset_id, status);

alter table public.mining_product_versions
  add constraint mining_product_versions_creator_fk
  foreign key (created_by) references auth.users(id) on delete set null;

create table public.mining_settings (
  id smallint primary key default 1,
  calculation_enabled boolean not null default false,
  calculation_interval_seconds integer not null default 3600,
  calculation_timezone text not null default 'Asia/Seoul',
  reward_precision smallint not null default 18,
  max_accounts_per_run integer not null default 1000,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint mining_settings_singleton_chk check (id = 1),
  constraint mining_settings_interval_chk check (
    calculation_interval_seconds between 60 and 86400
  ),
  constraint mining_settings_timezone_chk check (
    calculation_timezone = 'Asia/Seoul'
  ),
  constraint mining_settings_precision_chk check (
    reward_precision between 0 and 18
  ),
  constraint mining_settings_batch_chk check (
    max_accounts_per_run between 1 and 100000
  ),
  constraint mining_settings_updated_by_fk
    foreign key (updated_by) references auth.users(id) on delete set null
);

insert into public.mining_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.mining_products enable row level security;
alter table public.mining_product_versions enable row level security;
alter table public.mining_settings enable row level security;

revoke all on table public.mining_products from public, anon, authenticated, service_role;
grant select on table public.mining_products to authenticated;

revoke all on table public.mining_product_versions from public, anon, authenticated, service_role;
grant select on table public.mining_product_versions to authenticated;

revoke all on table public.mining_settings from public, anon, authenticated, service_role;
grant select on table public.mining_settings to authenticated;

create policy mining_products_select_policy
  on public.mining_products
  for select to authenticated
  using (
    (status = 'active' and is_public)
    or private.has_admin_permission('mining.read')
  );

create policy mining_product_versions_select_policy
  on public.mining_product_versions
  for select to authenticated
  using (
    (
      status = 'published'
      and exists (
        select 1
        from public.mining_products mp
        where mp.id = product_id
          and mp.status = 'active'
          and mp.is_public
      )
    )
    or private.has_admin_permission('mining.read')
  );

create policy mining_settings_select_policy
  on public.mining_settings
  for select to authenticated
  using (private.has_admin_permission('mining.read'));

create or replace view public.user_mining_products
with (security_invoker = true)
as
select
  mp.id as product_id,
  mp.code as product_code,
  mp.name as product_name,
  mp.description,
  mp.sort_order,
  mpv.id as version_id,
  mpv.version,
  mpv.reward_asset_id,
  a.code as reward_asset_code,
  a.name as reward_asset_name,
  a.decimals as reward_asset_decimals,
  mpv.capacity_unit,
  mpv.reward_per_unit_per_day,
  mpv.min_capacity,
  mpv.max_capacity,
  mpv.term_days,
  mpv.published_at
from public.mining_products mp
join public.mining_product_versions mpv
  on mpv.product_id = mp.id
 and mpv.status = 'published'
join public.assets a on a.id = mpv.reward_asset_id
where mp.status = 'active'
  and mp.is_public;

grant select on public.user_mining_products to authenticated;
revoke all on public.user_mining_products from anon;

create or replace view public.admin_mining_products
with (security_invoker = true)
as
select
  mp.id as product_id,
  mp.code as product_code,
  mp.name as product_name,
  mp.description,
  mp.status,
  mp.is_public,
  mp.sort_order,
  mp.created_at,
  mp.updated_at,
  mpv.id as published_version_id,
  mpv.version as published_version,
  mpv.reward_asset_id,
  a.code as reward_asset_code,
  a.name as reward_asset_name,
  mpv.capacity_unit,
  mpv.reward_per_unit_per_day,
  mpv.min_capacity,
  mpv.max_capacity,
  mpv.term_days,
  mpv.published_at
from public.mining_products mp
left join public.mining_product_versions mpv
  on mpv.product_id = mp.id
 and mpv.status = 'published'
left join public.assets a on a.id = mpv.reward_asset_id;

grant select on public.admin_mining_products to authenticated;
revoke all on public.admin_mining_products from anon;

create or replace view public.admin_mining_product_versions
with (security_invoker = true)
as
select
  mpv.id,
  mpv.product_id,
  mp.code as product_code,
  mp.name as product_name,
  mpv.version,
  mpv.reward_asset_id,
  a.code as reward_asset_code,
  a.name as reward_asset_name,
  mpv.capacity_unit,
  mpv.reward_per_unit_per_day,
  mpv.min_capacity,
  mpv.max_capacity,
  mpv.term_days,
  mpv.status,
  mpv.published_at,
  mpv.created_at,
  mpv.created_by
from public.mining_product_versions mpv
join public.mining_products mp on mp.id = mpv.product_id
join public.assets a on a.id = mpv.reward_asset_id;

grant select on public.admin_mining_product_versions to authenticated;
revoke all on public.admin_mining_product_versions from anon;

create or replace function private.create_mining_product(
  p_code text,
  p_name text,
  p_description text default '',
  p_sort_order integer default 0
)
returns uuid
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $$
declare
  v_id uuid;
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := coalesce(p_description, '');
begin
  if not private.has_admin_permission('mining.manage') then
    raise exception 'permission denied';
  end if;

  if v_code !~ '^[A-Z0-9][A-Z0-9_-]{2,63}$' then
    raise exception 'invalid product code';
  end if;
  if char_length(v_name) < 1 or char_length(v_name) > 120 then
    raise exception 'invalid product name';
  end if;
  if char_length(v_description) > 2000 then
    raise exception 'description too long';
  end if;
  if coalesce(p_sort_order, 0) not between 0 and 100000 then
    raise exception 'invalid sort order';
  end if;

  insert into public.mining_products(code, name, description, sort_order)
  values (v_code, v_name, v_description, coalesce(p_sort_order, 0))
  returning id into v_id;

  perform private.write_finance_audit(
    (select auth.uid()),
    null,
    'mining_product_created',
    'mining_product',
    v_id::text,
    jsonb_build_object('code', v_code, 'name', v_name)
  );

  return v_id;
exception
  when unique_violation then
    raise exception 'product code already exists';
end;
$$;

create or replace function public.create_mining_product(
  p_code text,
  p_name text,
  p_description text default '',
  p_sort_order integer default 0
)
returns uuid
language sql
security invoker
set search_path = public, auth, pg_temp
as $$
  select private.create_mining_product(p_code, p_name, p_description, p_sort_order);
$$;

create or replace function private.update_mining_product(
  p_product_id uuid,
  p_name text,
  p_description text,
  p_sort_order integer,
  p_status text,
  p_is_public boolean
)
returns void
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $$
declare
  v_before record;
  v_has_published boolean;
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := coalesce(p_description, '');
begin
  if not private.has_admin_permission('mining.manage') then
    raise exception 'permission denied';
  end if;

  if v_name = '' or char_length(v_name) > 120 then
    raise exception 'invalid product name';
  end if;
  if char_length(v_description) > 2000 then
    raise exception 'description too long';
  end if;
  if p_sort_order not between 0 and 100000 then
    raise exception 'invalid sort order';
  end if;
  if p_status not in ('draft', 'active', 'paused', 'archived') then
    raise exception 'invalid product status';
  end if;
  if p_product_id is null then
    raise exception 'product id is required';
  end if;

  select * into v_before
  from public.mining_products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'mining product not found';
  end if;

  select exists (
    select 1
    from public.mining_product_versions
    where product_id = p_product_id
      and status = 'published'
  ) into v_has_published;

  if p_status = 'active' and not v_has_published then
    raise exception 'active product requires published version';
  end if;

  if p_is_public and (p_status <> 'active' or not v_has_published) then
    raise exception 'public product requires active status and published version';
  end if;

  update public.mining_products
  set
    name = v_name,
    description = v_description,
    sort_order = p_sort_order,
    status = p_status,
    is_public = p_is_public,
    updated_at = now()
  where id = p_product_id;

  perform private.write_finance_audit(
    (select auth.uid()),
    null,
    'mining_product_updated',
    'mining_product',
    p_product_id::text,
    jsonb_build_object(
      'before', jsonb_build_object(
        'name', v_before.name,
        'status', v_before.status,
        'is_public', v_before.is_public,
        'sort_order', v_before.sort_order
      ),
      'after', jsonb_build_object(
        'name', v_name,
        'status', p_status,
        'is_public', p_is_public,
        'sort_order', p_sort_order
      )
    )
  );
end;
$$;

create or replace function public.update_mining_product(
  p_product_id uuid,
  p_name text,
  p_description text,
  p_sort_order integer,
  p_status text,
  p_is_public boolean
)
returns void
language sql
security invoker
set search_path = public, auth, pg_temp
as $$
  select private.update_mining_product(
    p_product_id, p_name, p_description, p_sort_order, p_status, p_is_public
  );
$$;

create or replace function private.create_mining_product_version(
  p_product_id uuid,
  p_reward_asset_id uuid,
  p_capacity_unit text,
  p_reward_per_unit_per_day numeric,
  p_min_capacity numeric,
  p_max_capacity numeric default null,
  p_term_days integer default 1
)
returns uuid
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $$
declare
  v_version_id uuid;
  v_next_version integer;
  v_asset_decimals smallint;
  v_product_status text;
begin
  if not private.has_admin_permission('mining.manage') then
    raise exception 'permission denied';
  end if;

  select status into v_product_status
  from public.mining_products
  where id = p_product_id
  for share;

  if v_product_status is null then
    raise exception 'mining product not found';
  end if;
  if v_product_status = 'archived' then
    raise exception 'archived product cannot receive new versions';
  end if;

  select decimals into v_asset_decimals
  from public.assets
  where id = p_reward_asset_id
    and is_active;

  if v_asset_decimals is null then
    raise exception 'reward asset not found or inactive';
  end if;

  if p_reward_per_unit_per_day <= 0
     or p_reward_per_unit_per_day <> round(p_reward_per_unit_per_day, 18) then
    raise exception 'invalid reward rate';
  end if;

  if p_min_capacity <= 0
     or p_min_capacity <> round(p_min_capacity, 18) then
    raise exception 'invalid minimum capacity';
  end if;

  if p_max_capacity is not null
     and (p_max_capacity < p_min_capacity or p_max_capacity <> round(p_max_capacity, 18)) then
    raise exception 'invalid maximum capacity';
  end if;

  if char_length(btrim(coalesce(p_capacity_unit, ''))) not between 1 and 32 then
    raise exception 'invalid capacity unit';
  end if;

  if p_term_days not between 1 and 3650 then
    raise exception 'invalid term days';
  end if;

  select coalesce(max(version), 0) + 1
  into v_next_version
  from public.mining_product_versions
  where product_id = p_product_id;

  insert into public.mining_product_versions (
    product_id,
    version,
    reward_asset_id,
    capacity_unit,
    reward_per_unit_per_day,
    min_capacity,
    max_capacity,
    term_days,
    status,
    created_by
  )
  values (
    p_product_id,
    v_next_version,
    p_reward_asset_id,
    btrim(p_capacity_unit),
    p_reward_per_unit_per_day,
    p_min_capacity,
    p_max_capacity,
    p_term_days,
    'draft',
    (select auth.uid())
  )
  returning id into v_version_id;

  perform private.write_finance_audit(
    (select auth.uid()),
    null,
    'mining_product_version_created',
    'mining_product_version',
    v_version_id::text,
    jsonb_build_object(
      'product_id', p_product_id,
      'version', v_next_version,
      'reward_asset_id', p_reward_asset_id,
      'capacity_unit', btrim(p_capacity_unit),
      'reward_per_unit_per_day', p_reward_per_unit_per_day,
      'min_capacity', p_min_capacity,
      'max_capacity', p_max_capacity,
      'term_days', p_term_days
    )
  );

  return v_version_id;
end;
$$;

create or replace function public.create_mining_product_version(
  p_product_id uuid,
  p_reward_asset_id uuid,
  p_capacity_unit text,
  p_reward_per_unit_per_day numeric,
  p_min_capacity numeric,
  p_max_capacity numeric default null,
  p_term_days integer default 1
)
returns uuid
language sql
security invoker
set search_path = public, auth, pg_temp
as $$
  select private.create_mining_product_version(
    p_product_id,
    p_reward_asset_id,
    p_capacity_unit,
    p_reward_per_unit_per_day,
    p_min_capacity,
    p_max_capacity,
    p_term_days
  );
$$;

create or replace function private.publish_mining_product_version(
  p_version_id uuid
)
returns void
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $$
declare
  v_product_id uuid;
  v_status text;
  v_product_status text;
begin
  if not private.has_admin_permission('mining.manage') then
    raise exception 'permission denied';
  end if;

  select mpv.product_id, mpv.status, mp.status
  into v_product_id, v_status, v_product_status
  from public.mining_product_versions mpv
  join public.mining_products mp on mp.id = mpv.product_id
  where mpv.id = p_version_id
  for update;

  if v_product_id is null then
    raise exception 'mining product version not found';
  end if;
  if v_product_status = 'archived' then
    raise exception 'archived product cannot publish versions';
  end if;
  if v_status <> 'draft' then
    raise exception 'only draft version can be published';
  end if;

  update public.mining_product_versions
  set status = 'retired'
  where product_id = v_product_id
    and status = 'published';

  update public.mining_product_versions
  set status = 'published',
      published_at = now()
  where id = p_version_id;

  perform private.write_finance_audit(
    (select auth.uid()),
    null,
    'mining_product_version_published',
    'mining_product_version',
    p_version_id::text,
    jsonb_build_object('product_id', v_product_id)
  );
end;
$$;

create or replace function public.publish_mining_product_version(
  p_version_id uuid
)
returns void
language sql
security invoker
set search_path = public, auth, pg_temp
as $$
  select private.publish_mining_product_version(p_version_id);
$$;

create or replace function private.update_mining_settings(
  p_calculation_enabled boolean,
  p_calculation_interval_seconds integer,
  p_calculation_timezone text,
  p_reward_precision smallint,
  p_max_accounts_per_run integer
)
returns void
language plpgsql
security definer
volatile
set search_path = public, auth, pg_temp
as $$
declare
  v_before public.mining_settings%rowtype;
begin
  if not private.has_admin_permission('mining.manage') then
    raise exception 'permission denied';
  end if;

  if p_calculation_interval_seconds not between 60 and 86400 then
    raise exception 'invalid calculation interval';
  end if;
  if p_calculation_timezone <> 'Asia/Seoul' then
    raise exception 'unsupported calculation timezone';
  end if;
  if p_reward_precision not between 0 and 18 then
    raise exception 'invalid reward precision';
  end if;
  if p_max_accounts_per_run not between 1 and 100000 then
    raise exception 'invalid batch size';
  end if;

  select * into v_before
  from public.mining_settings
  where id = 1
  for update;

  update public.mining_settings
  set calculation_enabled = coalesce(p_calculation_enabled, false),
      calculation_interval_seconds = p_calculation_interval_seconds,
      calculation_timezone = p_calculation_timezone,
      reward_precision = p_reward_precision,
      max_accounts_per_run = p_max_accounts_per_run,
      updated_at = now(),
      updated_by = (select auth.uid())
  where id = 1;

  perform private.write_finance_audit(
    (select auth.uid()),
    null,
    'mining_settings_updated',
    'mining_settings',
    '1',
    jsonb_build_object(
      'before', jsonb_build_object(
        'calculation_enabled', v_before.calculation_enabled,
        'calculation_interval_seconds', v_before.calculation_interval_seconds,
        'calculation_timezone', v_before.calculation_timezone,
        'reward_precision', v_before.reward_precision,
        'max_accounts_per_run', v_before.max_accounts_per_run
      ),
      'after', jsonb_build_object(
        'calculation_enabled', p_calculation_enabled,
        'calculation_interval_seconds', p_calculation_interval_seconds,
        'calculation_timezone', p_calculation_timezone,
        'reward_precision', p_reward_precision,
        'max_accounts_per_run', p_max_accounts_per_run
      )
    )
  );
end;
$$;

create or replace function public.update_mining_settings(
  p_calculation_enabled boolean,
  p_calculation_interval_seconds integer,
  p_calculation_timezone text,
  p_reward_precision smallint,
  p_max_accounts_per_run integer
)
returns void
language sql
security invoker
set search_path = public, auth, pg_temp
as $$
  select private.update_mining_settings(
    p_calculation_enabled,
    p_calculation_interval_seconds,
    p_calculation_timezone,
    p_reward_precision,
    p_max_accounts_per_run
  );
$$;

revoke all on function public.create_mining_product(text, text, text, integer) from public, anon;
grant execute on function public.create_mining_product(text, text, text, integer) to authenticated;
revoke all on function public.update_mining_product(uuid, text, text, integer, text, boolean) from public, anon;
grant execute on function public.update_mining_product(uuid, text, text, integer, text, boolean) to authenticated;
revoke all on function public.create_mining_product_version(uuid, uuid, text, numeric, numeric, numeric, integer) from public, anon;
grant execute on function public.create_mining_product_version(uuid, uuid, text, numeric, numeric, numeric, integer) to authenticated;
revoke all on function public.publish_mining_product_version(uuid) from public, anon;
grant execute on function public.publish_mining_product_version(uuid) to authenticated;
revoke all on function public.update_mining_settings(boolean, integer, text, smallint, integer) from public, anon;
grant execute on function public.update_mining_settings(boolean, integer, text, smallint, integer) to authenticated;

revoke all on function private.create_mining_product(text, text, text, integer) from public, anon;
grant execute on function private.create_mining_product(text, text, text, integer) to authenticated;
revoke all on function private.update_mining_product(uuid, text, text, integer, text, boolean) from public, anon;
grant execute on function private.update_mining_product(uuid, text, text, integer, text, boolean) to authenticated;
revoke all on function private.create_mining_product_version(uuid, uuid, text, numeric, numeric, numeric, integer) from public, anon;
grant execute on function private.create_mining_product_version(uuid, uuid, text, numeric, numeric, numeric, integer) to authenticated;
revoke all on function private.publish_mining_product_version(uuid) from public, anon;
grant execute on function private.publish_mining_product_version(uuid) to authenticated;
revoke all on function private.update_mining_settings(boolean, integer, text, smallint, integer) from public, anon;
grant execute on function private.update_mining_settings(boolean, integer, text, smallint, integer) to authenticated;

revoke all on function private.create_mining_product(text, text, text, integer) from public, anon;
revoke all on function private.update_mining_product(uuid, text, text, integer, text, boolean) from public, anon;
revoke all on function private.create_mining_product_version(uuid, uuid, text, numeric, numeric, numeric, integer) from public, anon;
revoke all on function private.publish_mining_product_version(uuid) from public, anon;
revoke all on function private.update_mining_settings(boolean, integer, text, smallint, integer) from public, anon;