create index mining_product_versions_created_by_idx
  on public.mining_product_versions (created_by, created_at desc);

create index mining_settings_updated_by_idx
  on public.mining_settings (updated_by, updated_at desc);