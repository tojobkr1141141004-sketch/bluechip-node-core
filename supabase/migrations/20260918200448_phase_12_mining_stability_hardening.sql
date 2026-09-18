-- PHASE 12 hardening: cover new foreign keys introduced by retry/correction lifecycle.

create index if not exists mining_calculation_errors_resolution_run_idx
  on public.mining_calculation_errors (resolution_run_id, created_at desc, id);

create index if not exists mining_reward_corrections_actor_created_idx
  on public.mining_reward_corrections (actor_user_id, created_at desc, id);

create index if not exists mining_reward_corrections_asset_created_idx
  on public.mining_reward_corrections (asset_id, created_at desc, id);
