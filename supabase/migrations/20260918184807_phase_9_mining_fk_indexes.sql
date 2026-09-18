
create index mining_contracts_product_idx
  on public.mining_contracts (product_id, created_at desc);

create index mining_reward_accruals_asset_idx
  on public.mining_reward_accruals (asset_id, created_at desc);

create index mining_reward_accruals_product_version_idx
  on public.mining_reward_accruals (product_version_id, created_at desc);
