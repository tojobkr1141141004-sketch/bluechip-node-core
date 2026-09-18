-- PHASE 13 hardening: explicit RLS policies and FK-covering indexes.

create policy mining_issuance_policy_updates_select_policy
  on public.mining_issuance_policy_updates
  for select to authenticated
  using ((select private.has_admin_permission('mining.read')));

create policy mining_reward_issuance_blocks_select_policy
  on public.mining_reward_issuance_blocks
  for select to authenticated
  using ((select private.has_admin_permission('mining.read')));

create index mining_issuance_policies_updated_by_idx
  on public.mining_issuance_policies(updated_by)
  where updated_by is not null;

create index mining_issuance_policy_updates_actor_idx
  on public.mining_issuance_policy_updates(actor_user_id,created_at desc,id desc);

create index mining_issuance_policy_updates_reserve_account_idx
  on public.mining_issuance_policy_updates(reserve_account_id)
  where reserve_account_id is not null;

create index mining_reward_issuance_blocks_run_idx
  on public.mining_reward_issuance_blocks(calculation_run_id,created_at desc,id desc);

create index mining_reward_issuance_blocks_user_idx
  on public.mining_reward_issuance_blocks(user_id,created_at desc,id desc);

revoke all on public.mining_issuance_policy_updates from public,anon,authenticated;
revoke all on public.mining_reward_issuance_blocks from public,anon,authenticated;
